import {
  getDisplayFilter,
  getCreatorManageRows,
  getEventFilterCounts,
  getKhatmMatches,
  isFilterSyncPending,
  normalizeGlobalFilter,
  withGlobalFilterQuery,
} from "@/lib/event-filters";
import type { EventSnapshot } from "@/lib/types/events";
import { describe, expect, it } from "vitest";

const EVENT_FIXTURE: Pick<EventSnapshot, "khatms"> = {
  khatms: [
    {
      id: "khatm-2",
      khatm_number: 2,
      claimed_count: 2,
      read_count: 1,
      juzs: [
        {
          id: "k2-j1",
          juz_number: 1,
          status: "claimed",
          claimed_by_name: "Amina",
          is_mine: false,
        },
        {
          id: "k2-j2",
          juz_number: 2,
          status: "read",
          claimed_by_name: "Me",
          is_mine: true,
        },
        {
          id: "k2-j3",
          juz_number: 3,
          status: "unclaimed",
          claimed_by_name: null,
          is_mine: false,
        },
      ],
    },
    {
      id: "khatm-1",
      khatm_number: 1,
      claimed_count: 1,
      read_count: 0,
      juzs: [
        {
          id: "k1-j1",
          juz_number: 1,
          status: "unclaimed",
          claimed_by_name: null,
          is_mine: false,
        },
        {
          id: "k1-j2",
          juz_number: 2,
          status: "claimed",
          claimed_by_name: "Yusuf",
          is_mine: false,
        },
      ],
    },
  ],
};

describe("event filter helpers", () => {
  it("normalizes filter values with available as fallback", () => {
    expect(normalizeGlobalFilter("all")).toBe("all");
    expect(normalizeGlobalFilter("mine")).toBe("mine");
    expect(normalizeGlobalFilter("nope")).toBe("available");
    expect(normalizeGlobalFilter(null)).toBe("available");
  });

  it("prefers pending filter when deriving display state", () => {
    expect(getDisplayFilter("available", null)).toBe("available");
    expect(getDisplayFilter("available", "all")).toBe("all");
  });

  it("flags sync pending only while pending filter differs from URL filter", () => {
    expect(isFilterSyncPending("available", null)).toBe(false);
    expect(isFilterSyncPending("available", "available")).toBe(false);
    expect(isFilterSyncPending("available", "mine")).toBe(true);
  });

  it("preserves other query params when writing filter", () => {
    expect(withGlobalFilterQuery("/s/E2ESMOKE1", "foo=1", "mine")).toBe(
      "/s/E2ESMOKE1?foo=1&filter=mine"
    );
    expect(withGlobalFilterQuery("/s/E2ESMOKE1", "filter=all&foo=1", "available")).toBe(
      "/s/E2ESMOKE1?filter=available&foo=1"
    );
  });

  it("derives event-wide filter counts", () => {
    expect(getEventFilterCounts(EVENT_FIXTURE)).toEqual({
      all: 5,
      available: 2,
      mine: 1,
    });
  });

  it("returns khatm matches per filter", () => {
    const khatm = EVENT_FIXTURE.khatms[0];
    expect(getKhatmMatches(khatm, "all")).toHaveLength(3);
    expect(getKhatmMatches(khatm, "available")).toHaveLength(1);
    expect(getKhatmMatches(khatm, "mine")).toHaveLength(1);
    expect(getKhatmMatches(khatm, "mine")[0]?.id).toBe("k2-j2");
  });

  it("builds creator manage rows for claimed/read items and sorts by khatm then juz", () => {
    const rows = getCreatorManageRows(EVENT_FIXTURE);

    expect(rows).toHaveLength(3);
    expect(rows.map((row) => row.juzId)).toEqual(["k1-j2", "k2-j1", "k2-j2"]);
    expect(rows[0]).toMatchObject({
      khatmNumber: 1,
      status: "claimed",
      claimedByName: "Yusuf",
    });
    expect(rows[2]).toMatchObject({
      khatmNumber: 2,
      status: "read",
      isMine: true,
    });
  });
});
