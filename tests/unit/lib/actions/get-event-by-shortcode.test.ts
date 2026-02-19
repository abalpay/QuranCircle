import { beforeEach, describe, expect, it, vi } from "vitest";
import { createClient } from "@/lib/supabase/server";
import {
  getEventByShortCode,
  getEventByShortCodeResult,
} from "@/lib/actions/events";

vi.mock("@/lib/supabase/server", () => ({
  createClient: vi.fn(),
}));

function mockSnapshotRpc(result: { data: unknown; error: unknown }) {
  const rpc = vi.fn().mockResolvedValue(result);
  vi.mocked(createClient).mockResolvedValue({ rpc } as never);
  return rpc;
}

describe("getEventByShortCodeResult", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns invalid_short_code when input fails validation", async () => {
    const result = await getEventByShortCodeResult("bad short code!");

    expect(result).toEqual({
      ok: false,
      code: "invalid_short_code",
      message: "Invalid shortCode",
      status: 400,
    });
    expect(createClient).not.toHaveBeenCalled();
  });

  it("returns invalid_cursor when beforeKhatmNumber is invalid", async () => {
    const result = await getEventByShortCodeResult("VALID123", {
      beforeKhatmNumber: 0,
    });

    expect(result).toEqual({
      ok: false,
      code: "invalid_cursor",
      message: "Invalid beforeKhatmNumber",
      status: 400,
    });
    expect(createClient).not.toHaveBeenCalled();
  });

  it("returns upstream_error on RPC failure", async () => {
    const rpc = mockSnapshotRpc({
      data: null,
      error: {
        code: "XX001",
        message: "backend failure",
        details: null,
        hint: null,
      },
    });

    const result = await getEventByShortCodeResult("VALID123");

    expect(result).toEqual({
      ok: false,
      code: "upstream_error",
      message: "Failed to load event snapshot",
      status: 502,
    });
    expect(rpc).toHaveBeenCalledTimes(1);
  });

  it("returns not_found when RPC data is empty", async () => {
    const rpc = mockSnapshotRpc({
      data: null,
      error: null,
    });

    const result = await getEventByShortCodeResult("VALID123");

    expect(result).toEqual({
      ok: false,
      code: "not_found",
      message: "Event not found",
      status: 404,
    });
    expect(rpc).toHaveBeenCalledTimes(1);
  });

  it("returns event snapshot and forwards pagination args", async () => {
    const snapshot = {
      id: "event-1",
      short_code: "VALID123",
      can_manage: false,
      is_public: true,
      is_archived: false,
      name: "Event",
      description: null,
      created_at: "2026-01-01T00:00:00.000Z",
      is_creator: false,
      is_member: false,
      khatms: [],
      loaded_khatms: 3,
      total_khatms: 12,
      has_more_khatms: true,
      next_before_khatm_number: 9,
    };
    const rpc = mockSnapshotRpc({ data: snapshot, error: null });

    const result = await getEventByShortCodeResult("VALID123", {
      khatmLimit: 4,
      beforeKhatmNumber: 8,
    });

    expect(result).toEqual({ ok: true, data: snapshot });
    expect(rpc).toHaveBeenCalledWith("get_event_snapshot_by_shortcode", {
      p_short_code: "VALID123",
      p_khatm_limit: 4,
      p_before_khatm_number: 8,
    });
  });
});

describe("getEventByShortCode", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("keeps null contract for non-ok result", async () => {
    mockSnapshotRpc({ data: null, error: null });

    const result = await getEventByShortCode("VALID123");

    expect(result).toBeNull();
  });
});

