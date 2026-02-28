import { beforeEach, describe, expect, it, vi } from "vitest";
import { getEventByShortCodeResult } from "@/lib/actions/events";
import { GET } from "@/app/api/event/route";

vi.mock("@/lib/actions/events", () => ({
  getEventByShortCodeResult: vi.fn(),
}));

describe("GET /api/event", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns missing_short_code when shortCode is omitted", async () => {
    const response = await GET(new Request("https://example.com/api/event"));
    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toEqual({
      error: { code: "missing_short_code", message: "Missing shortCode" },
    });
    expect(getEventByShortCodeResult).not.toHaveBeenCalled();
  });

  it("returns invalid_khatm_limit for non-numeric and low values", async () => {
    const nonNumeric = await GET(
      new Request("https://example.com/api/event?shortCode=VALID123&khatmLimit=abc")
    );
    expect(nonNumeric.status).toBe(400);
    await expect(nonNumeric.json()).resolves.toEqual({
      error: { code: "invalid_khatm_limit", message: "Invalid khatmLimit" },
    });

    const lowValue = await GET(
      new Request("https://example.com/api/event?shortCode=VALID123&khatmLimit=0")
    );
    expect(lowValue.status).toBe(400);
    await expect(lowValue.json()).resolves.toEqual({
      error: { code: "invalid_khatm_limit", message: "Invalid khatmLimit" },
    });
  });

  it("returns invalid_before_khatm_number for non-numeric and low values", async () => {
    const nonNumeric = await GET(
      new Request(
        "https://example.com/api/event?shortCode=VALID123&beforeKhatmNumber=oops"
      )
    );
    expect(nonNumeric.status).toBe(400);
    await expect(nonNumeric.json()).resolves.toEqual({
      error: {
        code: "invalid_before_khatm_number",
        message: "Invalid beforeKhatmNumber",
      },
    });

    const lowValue = await GET(
      new Request(
        "https://example.com/api/event?shortCode=VALID123&beforeKhatmNumber=0"
      )
    );
    expect(lowValue.status).toBe(400);
    await expect(lowValue.json()).resolves.toEqual({
      error: {
        code: "invalid_before_khatm_number",
        message: "Invalid beforeKhatmNumber",
      },
    });
  });

  it("forwards parsed query args and returns event payload", async () => {
    const event = {
      id: "event-1",
      short_code: "VALID123",
      name: "Event",
      description: null,
      can_manage: false,
      is_public: true,
      is_archived: false,
      created_at: "2026-01-01T00:00:00.000Z",
      is_creator: false,
      is_member: false,
      khatms: [],
      loaded_khatms: 2,
      total_khatms: 2,
      has_more_khatms: false,
      next_before_khatm_number: null,
    };
    vi.mocked(getEventByShortCodeResult).mockResolvedValue({
      ok: true,
      data: event,
    });

    const response = await GET(
      new Request(
        "https://example.com/api/event?shortCode=VALID123&khatmLimit=3&beforeKhatmNumber=4"
      )
    );

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual(event);
    expect(getEventByShortCodeResult).toHaveBeenCalledWith("VALID123", {
      khatmLimit: 3,
      beforeKhatmNumber: 4,
    });
  });

  it("accepts valid khatmLimit=1 as boundary value", async () => {
    vi.mocked(getEventByShortCodeResult).mockResolvedValue({
      ok: true,
      data: {
        id: "event-1",
        short_code: "VALID123",
        name: "Event",
        description: null,
        can_manage: false,
        is_public: true,
        is_archived: false,
        created_at: "2026-01-01T00:00:00.000Z",
        is_creator: false,
        is_member: false,
        khatms: [],
        loaded_khatms: 1,
        total_khatms: 1,
        has_more_khatms: false,
        next_before_khatm_number: null,
      } as never,
    });

    const response = await GET(
      new Request("https://example.com/api/event?shortCode=VALID123&khatmLimit=1")
    );

    expect(response.status).toBe(200);
    expect(getEventByShortCodeResult).toHaveBeenCalledWith("VALID123", {
      khatmLimit: 1,
      beforeKhatmNumber: undefined,
    });
  });

  it("accepts valid beforeKhatmNumber=1 as boundary value", async () => {
    vi.mocked(getEventByShortCodeResult).mockResolvedValue({
      ok: true,
      data: {
        id: "event-1",
        short_code: "VALID123",
        name: "Event",
        description: null,
        can_manage: false,
        is_public: true,
        is_archived: false,
        created_at: "2026-01-01T00:00:00.000Z",
        is_creator: false,
        is_member: false,
        khatms: [],
        loaded_khatms: 0,
        total_khatms: 1,
        has_more_khatms: false,
        next_before_khatm_number: null,
      } as never,
    });

    const response = await GET(
      new Request("https://example.com/api/event?shortCode=VALID123&beforeKhatmNumber=1")
    );

    expect(response.status).toBe(200);
    expect(getEventByShortCodeResult).toHaveBeenCalledWith("VALID123", {
      khatmLimit: undefined,
      beforeKhatmNumber: 1,
    });
  });

  it("passes undefined for omitted optional params", async () => {
    vi.mocked(getEventByShortCodeResult).mockResolvedValue({
      ok: true,
      data: {
        id: "event-1",
        short_code: "VALID123",
        name: "Event",
        description: null,
        can_manage: false,
        is_public: true,
        is_archived: false,
        created_at: "2026-01-01T00:00:00.000Z",
        is_creator: false,
        is_member: false,
        khatms: [],
        loaded_khatms: 0,
        total_khatms: 0,
        has_more_khatms: false,
        next_before_khatm_number: null,
      } as never,
    });

    const response = await GET(
      new Request("https://example.com/api/event?shortCode=VALID123")
    );

    expect(response.status).toBe(200);
    expect(getEventByShortCodeResult).toHaveBeenCalledWith("VALID123", {
      khatmLimit: undefined,
      beforeKhatmNumber: undefined,
    });
  });

  it("maps lookup errors to structured error payload", async () => {
    vi.mocked(getEventByShortCodeResult).mockResolvedValue({
      ok: false,
      code: "not_found",
      message: "Event not found",
      status: 404,
    });

    const response = await GET(
      new Request("https://example.com/api/event?shortCode=NOPE0001")
    );

    expect(response.status).toBe(404);
    await expect(response.json()).resolves.toEqual({
      error: { code: "not_found", message: "Event not found" },
    });
  });
});
