import type { EventSnapshot, JuzSnapshot, KhatmSnapshot } from "@/lib/types/events";

export type GlobalFilter = "all" | "available" | "mine";

const VALID_FILTERS: Set<GlobalFilter> = new Set(["all", "available", "mine"]);

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

export function normalizeGlobalFilter(
  filter: string | null | undefined
): GlobalFilter {
  if (filter && VALID_FILTERS.has(filter as GlobalFilter)) {
    return filter as GlobalFilter;
  }
  return "available";
}

export function withGlobalFilterQuery(
  pathname: string,
  queryString: string,
  filter: GlobalFilter
) {
  const params = new URLSearchParams(queryString);
  params.set("filter", filter);
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
