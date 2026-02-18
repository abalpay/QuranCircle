import type { EventSnapshot, JuzSnapshot, KhatmSnapshot } from "@/lib/types/events";

export type GlobalFilter = "all" | "available" | "mine";
export type MineView = "mine" | "creator";
export type CreatorQueueStatus = "all" | "claimed" | "read";

const VALID_FILTERS: Set<GlobalFilter> = new Set(["all", "available", "mine"]);
const VALID_MINE_VIEWS: Set<MineView> = new Set(["mine", "creator"]);
const STATUS_SORT_ORDER: Record<CreatorManageRow["status"], number> = {
  claimed: 0,
  read: 1,
  unclaimed: 2,
};

export type EventFilterCounts = {
  all: number;
  available: number;
  mine: number;
};

export type CreatorManageRow = {
  khatmId: string;
  khatmNumber: number;
  juzId: string;
  juzNumber: number;
  status: JuzSnapshot["status"];
  claimedByName: string | null;
  isMine: boolean;
};

export type CreatorQueueFilters = {
  query: string;
  status: CreatorQueueStatus;
  khatm: "all" | number;
  onlyMine: boolean;
};

export type CreatorQueueStats = {
  total: number;
  claimed: number;
  read: number;
  mine: number;
};

export function normalizeGlobalFilter(
  filter: string | null | undefined
): GlobalFilter {
  if (filter && VALID_FILTERS.has(filter as GlobalFilter)) {
    return filter as GlobalFilter;
  }
  return "all";
}

export function normalizeMineView(
  mineView: string | null | undefined,
  isCreator: boolean
): MineView {
  if (!isCreator) return "mine";
  if (mineView && VALID_MINE_VIEWS.has(mineView as MineView)) {
    return mineView as MineView;
  }
  return "mine";
}

export function getDisplayFilter(
  urlFilter: GlobalFilter,
  pendingFilter: GlobalFilter | null
): GlobalFilter {
  return pendingFilter ?? urlFilter;
}

export function isFilterSyncPending(
  urlFilter: GlobalFilter,
  pendingFilter: GlobalFilter | null
): boolean {
  return pendingFilter !== null && pendingFilter !== urlFilter;
}

export function withGlobalFilterQuery(
  pathname: string,
  queryString: string,
  filter: GlobalFilter
) {
  const params = new URLSearchParams(queryString);
  params.set("filter", filter);
  if (filter !== "mine") {
    params.delete("mineView");
  }
  const nextQuery = params.toString();
  return nextQuery ? `${pathname}?${nextQuery}` : pathname;
}

export function withMineViewQuery(
  pathname: string,
  queryString: string,
  mineView: MineView
) {
  const params = new URLSearchParams(queryString);
  params.set("filter", "mine");
  if (mineView === "mine") {
    params.delete("mineView");
  } else {
    params.set("mineView", mineView);
  }
  const nextQuery = params.toString();
  return nextQuery ? `${pathname}?${nextQuery}` : pathname;
}

export function getEventFilterCounts(
  event: Pick<EventSnapshot, "khatms">
): EventFilterCounts {
  return event.khatms.reduce(
    (acc, khatm) => {
      for (const juz of khatm.juzs) {
        acc.all += 1;
        if (juz.status === "unclaimed") {
          acc.available += 1;
        }
        if (juz.status !== "unclaimed" && juz.is_mine) {
          acc.mine += 1;
        }
      }
      return acc;
    },
    { all: 0, available: 0, mine: 0 }
  );
}

export function getAvailableRows(khatm: Pick<KhatmSnapshot, "juzs">) {
  return khatm.juzs.filter((juz) => juz.status === "unclaimed");
}

export function getMineRows(khatm: Pick<KhatmSnapshot, "juzs">) {
  return khatm.juzs.filter(
    (juz) => juz.status !== "unclaimed" && juz.is_mine
  );
}

export function getKhatmMatches(
  khatm: Pick<KhatmSnapshot, "juzs">,
  filter: GlobalFilter
) {
  if (filter === "all") return khatm.juzs;
  if (filter === "available") return getAvailableRows(khatm);
  return getMineRows(khatm);
}

export function getCreatorManageRows(
  event: Pick<EventSnapshot, "khatms">
): CreatorManageRow[] {
  const rows: CreatorManageRow[] = [];

  for (const khatm of event.khatms) {
    for (const juz of khatm.juzs) {
      if (juz.status === "unclaimed") continue;
      rows.push({
        khatmId: khatm.id,
        khatmNumber: khatm.khatm_number,
        juzId: juz.id,
        juzNumber: juz.juz_number,
        status: juz.status,
        claimedByName: juz.claimed_by_name,
        isMine: juz.is_mine,
      });
    }
  }

  rows.sort((a, b) => {
    if (a.khatmNumber !== b.khatmNumber) {
      return a.khatmNumber - b.khatmNumber;
    }
    return a.juzNumber - b.juzNumber;
  });

  return rows;
}

export function filterCreatorQueueRows(
  rows: CreatorManageRow[],
  filters: CreatorQueueFilters
) {
  const normalizedQuery = filters.query.trim().toLowerCase();

  return rows.filter((row) => {
    if (filters.status !== "all" && row.status !== filters.status) {
      return false;
    }
    if (filters.khatm !== "all" && row.khatmNumber !== filters.khatm) {
      return false;
    }
    if (filters.onlyMine && !row.isMine) {
      return false;
    }

    if (!normalizedQuery) return true;

    const haystack = `khatm ${row.khatmNumber} juz ${row.juzNumber} ${
      row.claimedByName ?? ""
    }`.toLowerCase();
    return haystack.includes(normalizedQuery);
  });
}

export function sortCreatorQueueRows(rows: CreatorManageRow[]) {
  return [...rows].sort((a, b) => {
    const statusDelta = STATUS_SORT_ORDER[a.status] - STATUS_SORT_ORDER[b.status];
    if (statusDelta !== 0) {
      return statusDelta;
    }
    if (a.khatmNumber !== b.khatmNumber) {
      return a.khatmNumber - b.khatmNumber;
    }
    return a.juzNumber - b.juzNumber;
  });
}

export function getCreatorQueueStats(
  rows: CreatorManageRow[]
): CreatorQueueStats {
  return rows.reduce(
    (acc, row) => {
      acc.total += 1;
      if (row.status === "claimed") {
        acc.claimed += 1;
      }
      if (row.status === "read") {
        acc.read += 1;
      }
      if (row.isMine) {
        acc.mine += 1;
      }
      return acc;
    },
    { total: 0, claimed: 0, read: 0, mine: 0 }
  );
}
