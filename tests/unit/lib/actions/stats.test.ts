import { beforeEach, describe, expect, it, vi } from "vitest";
import { getCommunityStats } from "@/lib/actions/stats";
import { createClient } from "@/lib/supabase/server";

vi.mock("@/lib/supabase/server", () => ({ createClient: vi.fn() }));

function mockRpc(result: { data: unknown; error: unknown }) {
  const single = vi.fn().mockResolvedValue(result);
  const rpc = vi.fn().mockReturnValue({ single });
  vi.mocked(createClient).mockResolvedValue({ rpc } as never);
  return rpc;
}

describe("getCommunityStats", () => {
  beforeEach(() => vi.clearAllMocks());

  it("maps khatms_completed to khatmsCompleted", async () => {
    const rpc = mockRpc({
      data: { total_circles: "9", total_juz_claimed: 40, khatms_completed: 3 },
      error: null,
    });
    await expect(getCommunityStats()).resolves.toEqual({
      totalCircles: 9,
      totalJuzClaimed: 40,
      khatmsCompleted: 3,
    });
    expect(rpc).toHaveBeenCalledWith("get_community_stats");
  });

  it("falls back to zeros on error", async () => {
    mockRpc({ data: null, error: { message: "boom" } });
    await expect(getCommunityStats()).resolves.toEqual({
      totalCircles: 0,
      totalJuzClaimed: 0,
      khatmsCompleted: 0,
    });
  });
});
