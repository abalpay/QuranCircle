import { beforeEach, describe, expect, it, vi } from "vitest";
import { createClient } from "@/lib/supabase/server";
import { completeKhatm } from "@/lib/actions/juz";

vi.mock("@/lib/supabase/server", () => ({ createClient: vi.fn() }));
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));

const KHATM_ID = "11111111-1111-4111-8111-111111111111";

function mockRpc(result: { data?: unknown; error: { message?: string } | null }) {
  const rpc = vi.fn().mockResolvedValue(result);
  vi.mocked(createClient).mockResolvedValue({ rpc } as never);
  return rpc;
}

describe("completeKhatm", () => {
  beforeEach(() => vi.clearAllMocks());

  it("validates input before hitting supabase", async () => {
    expect(await completeKhatm("bad short code!", "nope")).toEqual({ error: "invalid" });
    expect(createClient).not.toHaveBeenCalled();
  });

  it("calls complete_khatm and reports a new completion", async () => {
    const rpc = mockRpc({ data: { completed: true, newly_completed: true }, error: null });
    expect(await completeKhatm("ABCDEFGH", KHATM_ID)).toEqual({ newlyCompleted: true });
    expect(rpc).toHaveBeenCalledWith("complete_khatm", { p_short_code: "ABCDEFGH", p_khatm_id: KHATM_ID });
  });

  it("treats an already completed khatm as not newly completed", async () => {
    mockRpc({ data: { completed: true, newly_completed: false }, error: null });
    expect(await completeKhatm("ABCDEFGH", KHATM_ID)).toEqual({ newlyCompleted: false });
  });

  it.each([
    ["All 30 Juz must be claimed before completing", "not_ready"],
    ["Unauthorized", "unauthorized"],
    ["Active session required", "unauthorized"],
    ["This Khatim is archived", "archived"],
    ["Khatm not found", "failed"],
    ["Rate limit exceeded", "failed"],
    ["something unexpected with internal detail", "failed"],
  ])("maps %j to the code %s and never returns the raw message", async (message, code) => {
    mockRpc({ error: { message } });
    expect(await completeKhatm("ABCDEFGH", KHATM_ID)).toEqual({ error: code });
  });
});
