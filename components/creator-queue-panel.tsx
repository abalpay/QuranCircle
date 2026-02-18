"use client";

import { useMemo, useState } from "react";
import {
  type CreatorManageRow,
  type CreatorQueueFilters,
  filterCreatorQueueRows,
  getCreatorQueueStats,
  sortCreatorQueueRows,
} from "@/lib/event-filters";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { cn } from "@/lib/utils";
import { Search, SlidersHorizontal } from "lucide-react";

const INITIAL_VISIBLE_ROWS = 60;
const LOAD_MORE_STEP = 60;

type Props = {
  rows: CreatorManageRow[];
  onMarkRead: (juzId: string) => void;
  onUndoRead: (juzId: string) => void;
  onUnclaim: (juzId: string) => void;
};

export default function CreatorQueuePanel({
  rows,
  onMarkRead,
  onUndoRead,
  onUnclaim,
}: Props) {
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState<CreatorQueueFilters["status"]>("all");
  const [khatm, setKhatm] = useState<CreatorQueueFilters["khatm"]>("all");
  const [onlyMine, setOnlyMine] = useState(false);
  const [visibleRows, setVisibleRows] = useState(INITIAL_VISIBLE_ROWS);

  const khatmOptions = useMemo(
    () =>
      Array.from(new Set(rows.map((row) => row.khatmNumber))).sort((a, b) => a - b),
    [rows]
  );

  const filters: CreatorQueueFilters = useMemo(
    () => ({
      query,
      status,
      khatm,
      onlyMine,
    }),
    [khatm, onlyMine, query, status]
  );

  const filteredRows = useMemo(
    () => sortCreatorQueueRows(filterCreatorQueueRows(rows, filters)),
    [filters, rows]
  );
  const queueStats = useMemo(() => getCreatorQueueStats(rows), [rows]);

  const displayedRows = filteredRows.slice(0, visibleRows);
  const hasMoreRows = displayedRows.length < filteredRows.length;

  const clearFilters = () => {
    setQuery("");
    setStatus("all");
    setKhatm("all");
    setOnlyMine(false);
    setVisibleRows(INITIAL_VISIBLE_ROWS);
  };

  return (
    <section className="quran-card p-6 sm:p-7">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="font-heading text-2xl text-quran-deep sm:text-3xl">
            Creator Queue
          </h2>
          <p className="mt-2 text-sm text-quran-muted">
            Triage event-wide claims while keeping your personal My Juz flow separate.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Badge
            variant="outline"
            className="border-quran-border bg-white/70 px-3 py-1 text-quran-deep"
          >
            Total {queueStats.total}
          </Badge>
          <Badge
            variant="outline"
            className="border-amber-200 bg-amber-50 px-3 py-1 text-amber-700"
          >
            Claimed {queueStats.claimed}
          </Badge>
          <Badge
            variant="outline"
            className="border-emerald-200 bg-emerald-50 px-3 py-1 text-emerald-700"
          >
            Read {queueStats.read}
          </Badge>
          <Badge
            variant="outline"
            className="border-quran-green/30 bg-quran-green/10 px-3 py-1 text-quran-green"
          >
            Yours {queueStats.mine}
          </Badge>
        </div>
      </div>

      <div className="sticky top-3 z-10 mt-5 rounded-2xl border border-quran-border/70 bg-white/95 p-4 shadow-sm backdrop-blur-sm">
        <div className="grid gap-3 md:grid-cols-[1fr_auto_auto_auto]">
          <div>
            <label
              htmlFor="creator-queue-search"
              className="sr-only"
            >
              Search creator queue rows
            </label>
            <div className="relative">
              <Search className="pointer-events-none absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-quran-muted" />
              <Input
                id="creator-queue-search"
                value={query}
                onChange={(event) => {
                  setQuery(event.target.value);
                  setVisibleRows(INITIAL_VISIBLE_ROWS);
                }}
                className="pl-9"
                placeholder="Search name, khatm, or juz"
              />
            </div>
          </div>
          <div className="space-y-1">
            <span className="text-xs font-medium text-quran-muted">Status</span>
            <Select
              value={status}
              onValueChange={(value) => {
                setStatus(value as CreatorQueueFilters["status"]);
                setVisibleRows(INITIAL_VISIBLE_ROWS);
              }}
            >
              <SelectTrigger className="w-full bg-white/90 md:w-[140px]">
                <SelectValue placeholder="All statuses" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All</SelectItem>
                <SelectItem value="claimed">Claimed</SelectItem>
                <SelectItem value="read">Read</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1">
            <span className="text-xs font-medium text-quran-muted">Khatm</span>
            <Select
              value={khatm === "all" ? "all" : String(khatm)}
              onValueChange={(value) => {
                if (value === "all") {
                  setKhatm("all");
                  setVisibleRows(INITIAL_VISIBLE_ROWS);
                  return;
                }
                const parsed = Number.parseInt(value, 10);
                if (!Number.isNaN(parsed)) {
                  setKhatm(parsed);
                  setVisibleRows(INITIAL_VISIBLE_ROWS);
                }
              }}
            >
              <SelectTrigger className="w-full bg-white/90 md:w-[140px]">
                <SelectValue placeholder="All khatms" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All</SelectItem>
                {khatmOptions.map((khatmNumber) => (
                  <SelectItem key={khatmNumber} value={String(khatmNumber)}>
                    Khatm {khatmNumber}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="flex flex-col justify-end gap-2">
            <label
              htmlFor="creator-only-mine"
              className="flex min-h-10 items-center gap-2 rounded-lg px-2 text-sm text-quran-muted"
            >
              <Switch
                id="creator-only-mine"
                checked={onlyMine}
                onCheckedChange={(checked) => {
                  setOnlyMine(checked);
                  setVisibleRows(INITIAL_VISIBLE_ROWS);
                }}
                size="default"
              />
              Only mine
            </label>
            <Button
              type="button"
              variant="ghost"
              className="min-h-10 justify-start rounded-lg px-2 text-quran-muted hover:bg-quran-border/30 hover:text-quran-deep"
              onClick={clearFilters}
            >
              <SlidersHorizontal className="mr-2 h-4 w-4" />
              Clear filters
            </Button>
          </div>
        </div>
      </div>

      <p className="mt-4 text-xs text-quran-muted">
        Showing {displayedRows.length} of {filteredRows.length} matching rows.
      </p>
      <p className="sr-only" role="status" aria-live="polite">
        {filteredRows.length} creator queue rows shown.
      </p>

      {filteredRows.length === 0 ? (
        <div className="mt-4 rounded-xl border border-quran-border/60 bg-white/60 py-10 text-center">
          <p className="text-sm text-quran-muted">
            No rows match your current filters.
          </p>
        </div>
      ) : (
        <ScrollArea className="mt-4 h-[min(60vh,560px)] rounded-xl border border-quran-border/60 bg-white/50">
          <div className="space-y-2 p-3">
            {displayedRows.map((row) => (
              <div
                key={row.juzId}
                className={cn(
                  "flex flex-wrap items-center justify-between gap-3 rounded-xl border px-4 py-3",
                  row.status === "read"
                    ? "border-emerald-200 bg-emerald-50/70"
                    : "border-amber-200 bg-amber-50/70"
                )}
              >
                <div className="flex flex-wrap items-center gap-2 text-sm">
                  <span className="font-semibold text-quran-deep">
                    Khatm #{row.khatmNumber} · Juz {row.juzNumber}
                  </span>
                  <span
                    className={cn(
                      "rounded-full px-2 py-0.5 text-[10px] font-medium",
                      row.status === "read"
                        ? "bg-emerald-100 text-emerald-700"
                        : "bg-amber-100 text-amber-700"
                    )}
                  >
                    {row.status === "read" ? "Read" : "Claimed"}
                  </span>
                  <span className="text-quran-muted">
                    {row.claimedByName ? `by ${row.claimedByName}` : "name unavailable"}
                  </span>
                  {row.isMine && (
                    <span className="rounded-full bg-quran-green/10 px-2 py-0.5 text-[10px] font-medium text-quran-green">
                      Yours
                    </span>
                  )}
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  {row.status === "claimed" && (
                    <button
                      type="button"
                      className="min-h-10 rounded-full bg-emerald-100 px-3 py-2 text-xs font-medium text-emerald-700 transition-colors hover:bg-emerald-200"
                      onClick={() => onMarkRead(row.juzId)}
                    >
                      Mark Read
                    </button>
                  )}
                  {row.status === "read" && (
                    <button
                      type="button"
                      className="min-h-10 rounded-full bg-amber-100 px-3 py-2 text-xs font-medium text-amber-700 transition-colors hover:bg-amber-200"
                      onClick={() => onUndoRead(row.juzId)}
                    >
                      Undo
                    </button>
                  )}
                  <button
                    type="button"
                    className="min-h-10 rounded-full px-3 py-2 text-xs font-medium text-quran-muted transition-colors hover:bg-red-100 hover:text-red-600"
                    onClick={() => onUnclaim(row.juzId)}
                  >
                    Unclaim
                  </button>
                </div>
              </div>
            ))}
          </div>
        </ScrollArea>
      )}

      {hasMoreRows && (
        <div className="mt-4 flex justify-center">
          <Button
            type="button"
            variant="outline"
            className="rounded-full border-quran-border bg-white/90 px-5"
            onClick={() => setVisibleRows((current) => current + LOAD_MORE_STEP)}
          >
            Load more
          </Button>
        </div>
      )}
    </section>
  );
}
