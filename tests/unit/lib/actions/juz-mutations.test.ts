import { beforeEach, describe, expect, it, vi } from "vitest";
import { createClient } from "@/lib/supabase/server";
import {
  markJuzAsRead,
  unclaimJuz,
  unmarkJuzAsRead,
} from "@/lib/actions/juz";
import { revalidatePath } from "next/cache";

vi.mock("@/lib/supabase/server", () => ({
  createClient: vi.fn(),
}));

vi.mock("next/cache", () => ({
  revalidatePath: vi.fn(),
}));

function mockRpc(result: { data?: unknown; error: { message?: string } | null }) {
  const rpc = vi.fn().mockResolvedValue(result);
  vi.mocked(createClient).mockResolvedValue({ rpc } as never);
  return rpc;
}

describe("juz mutation actions", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("validates input before hitting supabase", async () => {
    expect(await unclaimJuz("bad short code!", "not-a-uuid")).toEqual({
      error: "Invalid input",
    });
    expect(await markJuzAsRead("bad short code!", "not-a-uuid")).toEqual({
      error: "Invalid input",
    });
    expect(await unmarkJuzAsRead("bad short code!", "not-a-uuid")).toEqual({
      error: "Invalid input",
    });
    expect(createClient).not.toHaveBeenCalled();
  });

  it("calls unclaim_juz and revalidates on success", async () => {
    const rpc = mockRpc({ data: {}, error: null });

    const result = await unclaimJuz(
      "E2ESMOKE1",
      "11111111-1111-4111-8111-111111111111"
    );

    expect(result).toEqual({});
    expect(rpc).toHaveBeenCalledWith("unclaim_juz", {
      p_short_code: "E2ESMOKE1",
      p_juz_id: "11111111-1111-4111-8111-111111111111",
    });
    expect(revalidatePath).toHaveBeenCalledWith("/s/E2ESMOKE1");
  });

  it("returns fallback errors for unclaim_juz", async () => {
    mockRpc({ data: null, error: {} });

    const result = await unclaimJuz(
      "E2ESMOKE1",
      "11111111-1111-4111-8111-111111111111"
    );

    expect(result).toEqual({ error: "Failed to unclaim juz" });
    expect(revalidatePath).not.toHaveBeenCalled();
  });

  it("returns the authoritative first-completion result and revalidates", async () => {
    const rpc = mockRpc({
      data: {
        updated: true,
        newly_completed: true,
      },
      error: null,
    });

    const result = await markJuzAsRead(
      "E2ESMOKE1",
      "11111111-1111-4111-8111-111111111111"
    );

    expect(result).toEqual({ newlyCompleted: true });
    expect(rpc).toHaveBeenCalledWith("mark_juz_read_with_completion", {
      p_short_code: "E2ESMOKE1",
      p_juz_id: "11111111-1111-4111-8111-111111111111",
    });
    expect(revalidatePath).toHaveBeenCalledWith("/s/E2ESMOKE1");
  });

  it("returns fallback errors for mark_juz_read", async () => {
    mockRpc({ data: null, error: {} });

    const result = await markJuzAsRead(
      "E2ESMOKE1",
      "11111111-1111-4111-8111-111111111111"
    );

    expect(result).toEqual({ error: "Failed to mark juz as read" });
    expect(revalidatePath).not.toHaveBeenCalled();
  });

  it("calls unmark_juz_read and revalidates on success", async () => {
    const rpc = mockRpc({ data: {}, error: null });

    const result = await unmarkJuzAsRead(
      "E2ESMOKE1",
      "11111111-1111-4111-8111-111111111111"
    );

    expect(result).toEqual({});
    expect(rpc).toHaveBeenCalledWith("unmark_juz_read", {
      p_short_code: "E2ESMOKE1",
      p_juz_id: "11111111-1111-4111-8111-111111111111",
    });
    expect(revalidatePath).toHaveBeenCalledWith("/s/E2ESMOKE1");
  });

  it("returns fallback errors for unmark_juz_read", async () => {
    mockRpc({ data: null, error: {} });

    const result = await unmarkJuzAsRead(
      "E2ESMOKE1",
      "11111111-1111-4111-8111-111111111111"
    );

    expect(result).toEqual({ error: "Failed to update juz status" });
    expect(revalidatePath).not.toHaveBeenCalled();
  });
});
