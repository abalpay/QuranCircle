import { beforeEach, describe, expect, it, vi } from "vitest";
import { getMyCircles } from "@/lib/actions/events";
import { createClient } from "@/lib/supabase/server";

vi.mock("@/lib/supabase/server", () => ({
  createClient: vi.fn(),
}));

describe("getMyCircles", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.spyOn(console, "error").mockImplementation(() => {});
  });

  it("returns empty list when there is no active user", async () => {
    vi.mocked(createClient).mockResolvedValue({
      auth: {
        getUser: vi.fn().mockResolvedValue({
          data: { user: null },
          error: null,
        }),
      },
    } as never);

    const result = await getMyCircles();

    expect(result).toEqual([]);
  });

  it("returns empty list when RPC fails", async () => {
    const rpc = vi.fn().mockResolvedValue({
      data: null,
      error: { message: "boom" },
    });

    vi.mocked(createClient).mockResolvedValue({
      auth: {
        getUser: vi.fn().mockResolvedValue({
          data: { user: { id: "user-1", is_anonymous: true } },
          error: null,
        }),
      },
      rpc,
    } as never);

    const result = await getMyCircles();

    expect(result).toEqual([]);
    expect(rpc).toHaveBeenCalledWith("list_my_circles_with_progress");
  });

  it("maps numeric fields and relation safely", async () => {
    const rpc = vi.fn().mockResolvedValue({
      data: [
        {
          id: "circle-1",
          name: "Circle One",
          description: null,
          short_code: "ABC12345",
          is_public: true,
          created_at: "2026-01-01T00:00:00Z",
          is_archived: false,
          archived_at: null,
          relation: "creator",
          claimed: "12",
          total: "30",
          my_claimed: "4",
          my_read: "2",
          last_activity_at: "2026-01-10T00:00:00Z",
        },
        {
          id: "circle-2",
          name: "Circle Two",
          description: "desc",
          short_code: "DEF67890",
          is_public: false,
          created_at: "2026-01-02T00:00:00Z",
          is_archived: true,
          archived_at: "2026-01-03T00:00:00Z",
          relation: "unknown",
          claimed: null,
          total: null,
          my_claimed: null,
          my_read: null,
          last_activity_at: null,
        },
      ],
      error: null,
    });

    vi.mocked(createClient).mockResolvedValue({
      auth: {
        getUser: vi.fn().mockResolvedValue({
          data: { user: { id: "user-1", is_anonymous: false } },
          error: null,
        }),
      },
      rpc,
    } as never);

    const result = await getMyCircles();

    expect(result).toEqual([
      {
        id: "circle-1",
        name: "Circle One",
        description: null,
        short_code: "ABC12345",
        is_public: true,
        created_at: "2026-01-01T00:00:00Z",
        is_archived: false,
        archived_at: null,
        relation: "creator",
        claimed: 12,
        total: 30,
        my_claimed: 4,
        my_read: 2,
        last_activity_at: "2026-01-10T00:00:00Z",
      },
      {
        id: "circle-2",
        name: "Circle Two",
        description: "desc",
        short_code: "DEF67890",
        is_public: false,
        created_at: "2026-01-02T00:00:00Z",
        is_archived: true,
        archived_at: "2026-01-03T00:00:00Z",
        relation: "participant",
        claimed: 0,
        total: 30,
        my_claimed: 0,
        my_read: 0,
        last_activity_at: "2026-01-02T00:00:00Z",
      },
    ]);
  });
});
