import {
  filterCreatorQueueRows,
  getDisplayFilter,
  getCreatorManageRows,
  getCreatorQueueStats,
  getEventFilterCounts,
  getKhatmMatches,
  normalizeMineView,
  isFilterSyncPending,
  sortCreatorQueueRows,
  normalizeGlobalFilter,
  withMineViewQuery,
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
  it("normalizes filter values with all as fallback", () => {
    expect(normalizeGlobalFilter("all")).toBe("all");
    expect(normalizeGlobalFilter("mine")).toBe("mine");
    expect(normalizeGlobalFilter("nope")).toBe("all");
    expect(normalizeGlobalFilter(null)).toBe("all");
  });

  it("normalizes mine view and gates creator-only view", () => {
    expect(normalizeMineView("mine", true)).toBe("mine");
    expect(normalizeMineView("creator", true)).toBe("creator");
    expect(normalizeMineView("nope", true)).toBe("mine");
    expect(normalizeMineView("creator", false)).toBe("mine");
  });

  it("prefers pending filter when deriving display state", () => {
    expect(getDisplayFilter("all", null)).toBe("all");
    expect(getDisplayFilter("all", "available")).toBe("available");
  });

  it("flags sync pending only while pending filter differs from URL filter", () => {
    expect(isFilterSyncPending("all", null)).toBe(false);
    expect(isFilterSyncPending("all", "all")).toBe(false);
    expect(isFilterSyncPending("all", "mine")).toBe(true);
  });

  it("preserves other query params when writing filter", () => {
    expect(withGlobalFilterQuery("/s/E2ESMOKE1", "foo=1", "mine")).toBe(
      "/s/E2ESMOKE1?foo=1&filter=mine"
    );
    expect(withGlobalFilterQuery("/s/E2ESMOKE1", "filter=all&foo=1", "available")).toBe(
      "/s/E2ESMOKE1?filter=available&foo=1"
    );
    expect(withGlobalFilterQuery("/s/E2ESMOKE1", "filter=mine&mineView=creator", "all")).toBe(
      "/s/E2ESMOKE1?filter=all"
    );
  });

  it("writes mine view query and defaults to mine when omitted", () => {
    expect(withMineViewQuery("/s/E2ESMOKE1", "foo=1&filter=mine", "creator")).toBe(
      "/s/E2ESMOKE1?foo=1&filter=mine&mineView=creator"
    );
    expect(withMineViewQuery("/s/E2ESMOKE1", "foo=1&filter=mine&mineView=creator", "mine")).toBe(
      "/s/E2ESMOKE1?foo=1&filter=mine"
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

  it("filters and sorts creator queue rows for triage", () => {
    const rows = getCreatorManageRows(EVENT_FIXTURE);

    const filtered = filterCreatorQueueRows(rows, {
      query: "mina",
      status: "all",
      khatm: "all",
      onlyMine: false,
    });
    expect(filtered.map((row) => row.juzId)).toEqual(["k2-j1"]);

    const mineOnly = filterCreatorQueueRows(rows, {
      query: "",
      status: "read",
      khatm: 2,
      onlyMine: true,
    });
    expect(mineOnly.map((row) => row.juzId)).toEqual(["k2-j2"]);

    const sorted = sortCreatorQueueRows([
      {
        ...rows[2],
        juzId: "read-row",
        status: "read",
        khatmNumber: 1,
        juzNumber: 1,
      },
      {
        ...rows[0],
        juzId: "claimed-later-khatm",
        status: "claimed",
        khatmNumber: 2,
        juzNumber: 1,
      },
      {
        ...rows[1],
        juzId: "claimed-earlier-khatm",
        status: "claimed",
        khatmNumber: 1,
        juzNumber: 2,
      },
    ]);
    expect(sorted.map((row) => row.juzId)).toEqual([
      "claimed-earlier-khatm",
      "claimed-later-khatm",
      "read-row",
    ]);
  });

  it("derives creator queue stats", () => {
    const rows = getCreatorManageRows(EVENT_FIXTURE);
    expect(getCreatorQueueStats(rows)).toEqual({
      total: 3,
      claimed: 2,
      read: 1,
      mine: 1,
    });
  });
});
