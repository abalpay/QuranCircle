import { beforeEach, describe, expect, it, vi } from "vitest";
import { claimMultipleJuz } from "@/lib/actions/juz";
import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

vi.mock("@/lib/supabase/server", () => ({
  createClient: vi.fn(),
}));

vi.mock("next/cache", () => ({
  revalidatePath: vi.fn(),
}));

type RpcResult = {
  data: unknown;
  error: { message?: string } | null;
};

function mockClaimBatchRpc(result: RpcResult) {
  const rpc = vi.fn().mockResolvedValue(result);
  vi.mocked(createClient).mockResolvedValue({ rpc } as never);
  return rpc;
}

describe("claimMultipleJuz", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns rpc error when claim_juz_batch fails", async () => {
    const rpc = mockClaimBatchRpc({
      data: null,
      error: { message: "This Khatim is locked" },
    });

    const result = await claimMultipleJuz(
      "E2ESMOKE1",
      "11111111-1111-4111-8111-111111111111",
      [1, 2],
      "Smoke Tester"
    );

    expect(result).toEqual({ error: "This Khatim is locked" });
    expect(rpc).toHaveBeenCalledTimes(1);
    expect(revalidatePath).not.toHaveBeenCalled();
  });

  it("returns partialError when some juz are claimed and some fail", async () => {
    const rpc = mockClaimBatchRpc({
      data: {
        claimed: [1, 2],
        failed: [3],
        new_khatm_created: false,
      },
      error: null,
    });

    const result = await claimMultipleJuz(
      "E2ESMOKE1",
      "11111111-1111-4111-8111-111111111111",
      [1, 2, 3],
      "Smoke Tester"
    );

    expect(result).toEqual({
      claimed: [1, 2],
      failed: [3],
      newKhatmCreated: false,
      partialError: "Juz 3 already claimed by someone else",
    });
    expect(rpc).toHaveBeenCalledTimes(1);
    expect(revalidatePath).toHaveBeenCalledWith("/s/E2ESMOKE1");
  });

  it("returns error when all selected juz fail to claim", async () => {
    const rpc = mockClaimBatchRpc({
      data: {
        claimed: [],
        failed: [1, 2],
        new_khatm_created: false,
      },
      error: null,
    });

    const result = await claimMultipleJuz(
      "E2ESMOKE1",
      "11111111-1111-4111-8111-111111111111",
      [1, 2],
      "Smoke Tester"
    );

    expect(result).toEqual({
      error: "All selected juz were already claimed by someone else",
    });
    expect(rpc).toHaveBeenCalledTimes(1);
    expect(revalidatePath).toHaveBeenCalledWith("/s/E2ESMOKE1");
  });

  it("returns success payload when all selected juz are claimed", async () => {
    const rpc = mockClaimBatchRpc({
      data: {
        claimed: [4, 5],
        failed: [],
        new_khatm_created: true,
      },
      error: null,
    });

    const result = await claimMultipleJuz(
      "E2ESMOKE1",
      "11111111-1111-4111-8111-111111111111",
      [4, 5],
      "Smoke Tester"
    );

    expect(result).toEqual({
      claimed: [4, 5],
      newKhatmCreated: true,
    });
    expect(rpc).toHaveBeenCalledTimes(1);
    expect(revalidatePath).toHaveBeenCalledWith("/s/E2ESMOKE1");
  });
});
