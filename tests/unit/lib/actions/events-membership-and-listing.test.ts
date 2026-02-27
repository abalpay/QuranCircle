import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  ensureEventMembershipForShortCode,
  getPublicEvents,
  getPublicEventsPage,
  getUserEvents,
} from "@/lib/actions/events";
import { createClient } from "@/lib/supabase/server";

vi.mock("@/lib/supabase/server", () => ({
  createClient: vi.fn(),
}));

function mockSupabaseClient(payload: {
  getUser?: ReturnType<typeof vi.fn>;
  rpc?: ReturnType<typeof vi.fn>;
}) {
  vi.mocked(createClient).mockResolvedValue({
    auth: {
      getUser:
        payload.getUser ??
        vi.fn().mockResolvedValue({
          data: { user: null },
          error: null,
        }),
    },
    rpc: payload.rpc ?? vi.fn(),
  } as never);
}

describe("ensureEventMembershipForShortCode", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns validation error for invalid shortcode", async () => {
    const result = await ensureEventMembershipForShortCode("bad short code!");

    expect(result).toEqual({ error: "Invalid input" });
    expect(createClient).not.toHaveBeenCalled();
  });

  it("requires an active session user", async () => {
    const getUser = vi.fn().mockResolvedValue({
      data: { user: null },
      error: null,
    });
    const rpc = vi.fn();
    mockSupabaseClient({ getUser, rpc });

    const result = await ensureEventMembershipForShortCode("VALID123");

    expect(result).toEqual({ error: "Active session required" });
    expect(rpc).not.toHaveBeenCalled();
  });

  it("returns rpc errors", async () => {
    const rpc = vi.fn().mockResolvedValue({
      data: null,
      error: { message: "membership failed" },
    });
    mockSupabaseClient({
      getUser: vi.fn().mockResolvedValue({
        data: { user: { id: "user-1", is_anonymous: false } },
        error: null,
      }),
      rpc,
    });

    const result = await ensureEventMembershipForShortCode("VALID123");

    expect(result).toEqual({ error: "membership failed" });
    expect(rpc).toHaveBeenCalledWith("ensure_event_membership", {
      p_short_code: "VALID123",
    });
  });

  it("returns not-found when rpc returns empty payload", async () => {
    const rpc = vi.fn().mockResolvedValue({
      data: null,
      error: null,
    });
    mockSupabaseClient({
      getUser: vi.fn().mockResolvedValue({
        data: { user: { id: "user-1", is_anonymous: false } },
        error: null,
      }),
      rpc,
    });

    const result = await ensureEventMembershipForShortCode("VALID123");

    expect(result).toEqual({ error: "Event not found" });
  });

  it("returns empty object when membership is ensured", async () => {
    const rpc = vi.fn().mockResolvedValue({
      data: true,
      error: null,
    });
    mockSupabaseClient({
      getUser: vi.fn().mockResolvedValue({
        data: { user: { id: "user-1", is_anonymous: false } },
        error: null,
      }),
      rpc,
    });

    const result = await ensureEventMembershipForShortCode("VALID123");

    expect(result).toEqual({});
    expect(rpc).toHaveBeenCalledWith("ensure_event_membership", {
      p_short_code: "VALID123",
    });
  });
});

describe("getPublicEventsPage/getPublicEvents", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.spyOn(console, "error").mockImplementation(() => {});
  });

  it("uses default pagination args for invalid limit", async () => {
    const rpc = vi.fn().mockResolvedValue({
      data: [],
      error: null,
    });
    mockSupabaseClient({ rpc });

    await getPublicEventsPage({ limit: Number.NaN });

    expect(rpc).toHaveBeenCalledWith("list_public_events_with_progress", {
      p_limit: 25,
    });
  });

  it("includes cursor params and computes hasMore + nextCursor", async () => {
    const rpc = vi.fn().mockResolvedValue({
      data: [
        {
          id: "event-3",
          name: "Event 3",
          description: null,
          short_code: "EVT00003",
          is_public: true,
          created_at: "2026-01-03T00:00:00Z",
          is_archived: false,
          claimed: "9",
          total: "30",
        },
        {
          id: "event-2",
          name: "Event 2",
          description: null,
          short_code: "EVT00002",
          is_public: true,
          created_at: "2026-01-02T00:00:00Z",
          is_archived: false,
          claimed: 7,
          total: null,
        },
        {
          id: "event-1",
          name: "Event 1",
          description: null,
          short_code: "EVT00001",
          is_public: true,
          created_at: "2026-01-01T00:00:00Z",
          is_archived: false,
          claimed: 1,
          total: 30,
        },
      ],
      error: null,
    });
    mockSupabaseClient({ rpc });

    const page = await getPublicEventsPage({
      limit: 2,
      cursor: {
        createdAt: "2026-01-04T00:00:00Z",
        id: "cursor-id",
      },
    });

    expect(rpc).toHaveBeenCalledWith("list_public_events_with_progress", {
      p_limit: 3,
      p_before_created_at: "2026-01-04T00:00:00Z",
      p_before_id: "cursor-id",
    });
    expect(page).toEqual({
      events: [
        expect.objectContaining({
          id: "event-3",
          claimed: 9,
          total: 30,
        }),
        expect.objectContaining({
          id: "event-2",
          claimed: 7,
          total: 30,
        }),
      ],
      hasMore: true,
      nextCursor: {
        createdAt: "2026-01-02T00:00:00Z",
        id: "event-2",
      },
    });
  });

  it("returns empty results when rpc fails", async () => {
    const rpc = vi.fn().mockResolvedValue({
      data: null,
      error: { message: "boom", code: "XX001" },
    });
    mockSupabaseClient({ rpc });

    const page = await getPublicEventsPage();

    expect(page).toEqual({
      events: [],
      hasMore: false,
      nextCursor: null,
    });
  });

  it("getPublicEvents returns events from the first page", async () => {
    const rpc = vi.fn().mockResolvedValue({
      data: [
        {
          id: "event-1",
          name: "Event 1",
          description: null,
          short_code: "EVT00001",
          is_public: true,
          created_at: "2026-01-01T00:00:00Z",
          is_archived: false,
          claimed: "5",
          total: "30",
        },
      ],
      error: null,
    });
    mockSupabaseClient({ rpc });

    const events = await getPublicEvents(10);

    expect(events).toEqual([
      expect.objectContaining({
        id: "event-1",
        claimed: 5,
        total: 30,
      }),
    ]);
    expect(rpc).toHaveBeenCalledWith("list_public_events_with_progress", {
      p_limit: 11,
    });
  });
});

describe("getUserEvents", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.spyOn(console, "error").mockImplementation(() => {});
  });

  it("returns empty list when auth.getUser fails", async () => {
    mockSupabaseClient({
      getUser: vi.fn().mockResolvedValue({
        data: { user: null },
        error: { code: "auth_error", message: "boom" },
      }),
    });

    const result = await getUserEvents();

    expect(result).toEqual([]);
  });

  it("returns empty list for no user or anonymous user", async () => {
    mockSupabaseClient({
      getUser: vi.fn().mockResolvedValue({
        data: { user: null },
        error: null,
      }),
    });
    expect(await getUserEvents()).toEqual([]);

    mockSupabaseClient({
      getUser: vi.fn().mockResolvedValue({
        data: { user: { id: "anon-1", is_anonymous: true } },
        error: null,
      }),
    });
    expect(await getUserEvents()).toEqual([]);
  });

  it("returns empty list when list_user_events_with_progress fails", async () => {
    const rpc = vi.fn().mockResolvedValue({
      data: null,
      error: { message: "boom", code: "XX001" },
    });
    mockSupabaseClient({
      getUser: vi.fn().mockResolvedValue({
        data: { user: { id: "user-1", is_anonymous: false } },
        error: null,
      }),
      rpc,
    });

    const result = await getUserEvents();

    expect(result).toEqual([]);
    expect(rpc).toHaveBeenCalledWith("list_user_events_with_progress");
  });

  it("maps numeric fields when rpc succeeds", async () => {
    const rpc = vi.fn().mockResolvedValue({
      data: [
        {
          id: "event-1",
          name: "Event 1",
          description: null,
          short_code: "EVENT001",
          deadline: null,
          is_public: true,
          created_at: "2026-01-01T00:00:00Z",
          is_archived: false,
          claimed: "12",
          total: null,
        },
      ],
      error: null,
    });
    mockSupabaseClient({
      getUser: vi.fn().mockResolvedValue({
        data: { user: { id: "user-1", is_anonymous: false } },
        error: null,
      }),
      rpc,
    });

    const result = await getUserEvents();

    expect(result).toEqual([
      expect.objectContaining({
        id: "event-1",
        claimed: 12,
        total: 30,
      }),
    ]);
  });
});
