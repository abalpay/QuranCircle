import { beforeEach, describe, expect, it, vi } from "vitest";
import { createEvent } from "@/lib/actions/events";
import { createClient } from "@/lib/supabase/server";
import { generateShortCode } from "@/lib/utils";
import { revalidatePath } from "next/cache";

vi.mock("@/lib/supabase/server", () => ({
  createClient: vi.fn(),
}));

vi.mock("@/lib/utils", async () => {
  const actual = await vi.importActual<typeof import("@/lib/utils")>(
    "@/lib/utils"
  );
  return {
    ...actual,
    generateShortCode: vi.fn(),
  };
});

vi.mock("next/cache", () => ({
  revalidatePath: vi.fn(),
}));

type RpcResponse = {
  data: unknown;
  error: {
    code?: string;
    message?: string;
    details?: string | null;
    hint?: string | null;
  } | null;
};

function mockCreateEventRpcSequence(responses: RpcResponse[]) {
  const single = vi.fn();
  for (const response of responses) {
    single.mockResolvedValueOnce(response);
  }

  const rpc = vi.fn().mockReturnValue({ single });

  vi.mocked(createClient).mockResolvedValue({
    auth: {
      getUser: vi.fn().mockResolvedValue({
        data: { user: { id: "user-1", is_anonymous: false } },
      }),
    },
    rpc,
  } as never);

  return { rpc, single };
}

describe("createEvent short-code retry behavior", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.spyOn(console, "error").mockImplementation(() => {});
  });

  it("retries when the database error is a short_code collision", async () => {
    vi.mocked(generateShortCode)
      .mockReturnValueOnce("COLLIDE1")
      .mockReturnValueOnce("RECOVER22");

    const collisionError = {
      code: "23505",
      message: 'duplicate key value violates unique constraint "events_short_code_key"',
      details: 'Key (short_code)=(COLLIDE1) already exists.',
      hint: null,
    };

    const { rpc } = mockCreateEventRpcSequence([
      { data: null, error: collisionError },
      {
        data: { event_id: "event-123", short_code: "RECOVER22" },
        error: null,
      },
    ]);

    const result = await createEvent({
      name: "Smoke Circle",
      description: "retry path",
      isPublic: false,
    });

    expect(result).toEqual({
      data: { eventId: "event-123", shortCode: "RECOVER22" },
    });
    expect(rpc).toHaveBeenCalledTimes(2);
    expect(rpc.mock.calls[0]?.[1]).toMatchObject({ p_short_code: "COLLIDE1" });
    expect(rpc.mock.calls[1]?.[1]).toMatchObject({ p_short_code: "RECOVER22" });
    expect(revalidatePath).toHaveBeenCalledWith("/");
    expect(revalidatePath).toHaveBeenCalledWith("/browse");
    expect(revalidatePath).toHaveBeenCalledWith("/my-circles");
  });

  it("does not retry for unrelated 23505 errors", async () => {
    vi.mocked(generateShortCode).mockReturnValue("ONETRY11");

    const unrelatedUniqueError = {
      code: "23505",
      message: 'duplicate key value violates unique constraint "events_name_key"',
      details: null,
      hint: null,
    };

    const { rpc } = mockCreateEventRpcSequence([
      { data: null, error: unrelatedUniqueError },
    ]);

    const result = await createEvent({
      name: "Smoke Circle",
      description: "unrelated unique",
      isPublic: true,
    });

    expect(result).toEqual({ error: unrelatedUniqueError.message });
    expect(rpc).toHaveBeenCalledTimes(1);
    expect(revalidatePath).not.toHaveBeenCalled();
  });

  it("returns unique-link failure after exhausting short_code retries", async () => {
    vi.mocked(generateShortCode).mockReturnValue("ALWAYS77");

    const repeatedCollision = {
      code: "23505",
      message: 'duplicate key value violates unique constraint "events_short_code_key"',
      details: 'Key (short_code)=(ALWAYS77) already exists.',
      hint: null,
    };

    const responses = Array.from({ length: 10 }, () => ({
      data: null,
      error: repeatedCollision,
    }));

    const { rpc } = mockCreateEventRpcSequence(responses);

    const result = await createEvent({
      name: "Smoke Circle",
      description: "retry exhausted",
    });

    expect(result).toEqual({
      error: "Failed to create a unique link. Please try again.",
    });
    expect(rpc).toHaveBeenCalledTimes(10);
    expect(generateShortCode).toHaveBeenCalledTimes(11);
    expect(revalidatePath).not.toHaveBeenCalled();
  });
});
