import type { EventSnapshot, JuzSnapshot, KhatmSnapshot } from "@/lib/types/events";

export type CardFilter = "all" | "available";
export type GlobalFilter = CardFilter | "creator";
export type CreatorQueueStatus = "all" | "claimed" | "read";

const STATUS_SORT_ORDER: Record<CreatorManageRow["status"], number> = {
  claimed: 0,
  read: 1,
  unclaimed: 2,
};

export type EventFilterCounts = {
  all: number;
  available: number;
};

export type CreatorManageRow = {
  khatmId: string;
  khatmNumber: number;
  isCompleted: boolean;
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

/**
 * Legacy ?filter=mine (the removed My Juz tab) maps to All, or to the queue for
 * organizers with mineView=creator. The queue is organizer-only.
 */
export function normalizeGlobalFilter(
  filter: string | null | undefined,
  isCreator: boolean,
  mineView?: string | null
): GlobalFilter {
  if (filter === "available") return "available";
  if (filter === "creator" || (filter === "mine" && mineView === "creator")) {
    return isCreator ? "creator" : "all";
  }
  return "all";
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
  params.delete("mineView");
  const nextQuery = params.toString();
  return nextQuery ? `${pathname}?${nextQuery}` : pathname;
}

/**
 * Tab counts. "All" is the khatm in front (the latest), not every loaded khatm;
 * "Available" counts Juz that can still be claimed (unclaimed Juz of khatms that
 * are not completed).
 */
export function getEventFilterCounts(
  event: Pick<EventSnapshot, "khatms">
): EventFilterCounts {
  const current = event.khatms.reduce<KhatmSnapshot | undefined>(
    (latest, khatm) =>
      !latest || khatm.khatm_number > latest.khatm_number ? khatm : latest,
    undefined
  );
  const counts = { all: current?.juzs.length ?? 0, available: 0 };
  for (const khatm of event.khatms) {
    for (const juz of khatm.juzs) {
      if (juz.status === "unclaimed" && !khatm.completed_at) counts.available += 1;
    }
  }
  return counts;
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
  filter: CardFilter
) {
  return filter === "all" ? khatm.juzs : getAvailableRows(khatm);
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
        isCompleted: Boolean(khatm.completed_at),
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
