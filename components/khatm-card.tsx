"use client";

import { useState, useCallback, useMemo } from "react";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import JuzCard from "@/components/juz-card";
import ClaimJuzDialog from "@/components/claim-juz-dialog";
import FloatingClaimBar from "@/components/floating-claim-bar";
import {
  claimMultipleJuz,
  unclaimJuz,
  markJuzAsRead,
  unmarkJuzAsRead,
} from "@/lib/actions/juz";
import {
  getKhatmMatches,
  getAvailableRows,
  getMineRows,
  type GlobalFilter,
} from "@/lib/event-filters";
import type { JuzSnapshot, KhatmSnapshot } from "@/lib/types/events";
import { toast } from "sonner";
import { useAuth } from "@/hooks/use-auth";
import {
  BookMarked,
  ChevronDown,
  ChevronUp,
  CircleCheck,
  ExternalLink,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useTranslations } from "next-intl";
import { trackProductEvent } from "@/lib/analytics";

type Juz = JuzSnapshot;
type Khatm = KhatmSnapshot;

export type ClaimSuccessPayload = {
  claimedCount: number;
  newKhatmCreated: boolean;
};

type Props = {
  khatm: Khatm;
  shortCode: string;
  isReadOnly: boolean;
  onRefresh: () => Promise<void>;
  activeFilter: GlobalFilter;
  isCompleted?: boolean;
  onClaimSuccess?: (payload: ClaimSuccessPayload) => void;
};

export default function KhatmCard({
  khatm,
  shortCode,
  isReadOnly,
  onRefresh,
  activeFilter,
  isCompleted = false,
  onClaimSuccess,
}: Props) {
  const t = useTranslations("KhatmCard");
  const selectionContextKey = `${isReadOnly ? "1" : "0"}:${activeFilter === "mine" ? "1" : "0"}`;
  const [selectionState, setSelectionState] = useState<{
    key: string;
    values: Set<number>;
  }>({
    key: selectionContextKey,
    values: new Set(),
  });
  const [isClaimDialogOpen, setIsClaimDialogOpen] = useState(false);
  const availableJuzs = useMemo(() => getAvailableRows(khatm), [khatm]);
  const myJuzs = useMemo(() => getMineRows(khatm), [khatm]);
  const matchingJuzs = useMemo(
    () => getKhatmMatches(khatm, activeFilter),
    [activeFilter, khatm]
  );
  const matchingCount = matchingJuzs.length;
  const hasMatches = matchingCount > 0;
  const expansionKey = `${activeFilter}:${isCompleted ? "1" : "0"}:${hasMatches ? "1" : "0"}`;
  const defaultExpanded = activeFilter === "all" ? !isCompleted : hasMatches;
  const [expansionOverride, setExpansionOverride] = useState<{
    key: string;
    value: boolean;
  } | null>(null);
  const isExpanded =
    expansionOverride?.key === expansionKey
      ? expansionOverride.value
      : defaultExpanded;
  const { ensureSession } = useAuth();

  const setExpanded = useCallback(
    (nextExpanded: boolean) => {
      setExpansionOverride({ key: expansionKey, value: nextExpanded });
    },
    [expansionKey]
  );

  // Derive pruned selection: intersection of user selection with unclaimed juz
  const activeSelection = useMemo(() => {
    const scopedSelection =
      selectionState.key === selectionContextKey
        ? selectionState.values
        : new Set<number>();
    const unclaimed = new Set(
      khatm.juzs.filter((j) => j.status === "unclaimed").map((j) => j.juz_number)
    );
    return new Set([...scopedSelection].filter((n) => unclaimed.has(n)));
  }, [selectionContextKey, selectionState, khatm.juzs]);

  const toggleJuzSelection = useCallback((juz: Juz) => {
    setSelectionState((prev) => {
      const source =
        prev.key === selectionContextKey ? prev.values : new Set<number>();
      const next = new Set(source);
      if (next.has(juz.juz_number)) {
        next.delete(juz.juz_number);
      } else {
        next.add(juz.juz_number);
      }
      return { key: selectionContextKey, values: next };
    });
  }, [selectionContextKey]);

  const clearSelection = useCallback(() => {
    setSelectionState({ key: selectionContextKey, values: new Set() });
  }, [selectionContextKey]);

  const handleBatchClaim = useCallback(() => {
    if (activeSelection.size === 0) return;
    setIsClaimDialogOpen(true);
  }, [activeSelection]);

  const ensureClaimSession = useCallback(async () => {
    const sessionUser = await ensureSession();
    if (!sessionUser) {
      toast.error(t("sessionError"));
      return false;
    }
    return true;
  }, [ensureSession, t]);

  const claimProgress = Math.round((khatm.claimed_count / 30) * 100);
  const readCount =
    khatm.read_count ??
    khatm.juzs.filter((j) => j.status === "read").length;

  const handleClaimClick = (juz: Juz) => {
    if (isReadOnly) {
      toast.error(t("khatmArchived"));
      return;
    }
    toggleJuzSelection(juz);
  };

  const handleClaimSubmit = async (claimerName: string, juzNumbers: number[]) => {
    if (!(await ensureClaimSession())) return;

    const result = await claimMultipleJuz(shortCode, khatm.id, juzNumbers, claimerName);
    if (result.error) {
      toast.error(result.error);
      return;
    }
    const count = result.claimed?.length ?? juzNumbers.length;
    if (count === 0) {
      toast.error(t("allClaimedError"));
      setIsClaimDialogOpen(false);
      clearSelection();
      await onRefresh();
      return;
    }
    if (result.partialError) {
      toast.warning(result.partialError);
    }

    setIsClaimDialogOpen(false);
    clearSelection();
    await onRefresh();
    onClaimSuccess?.({
      claimedCount: count,
      newKhatmCreated: Boolean(result.newKhatmCreated),
    });
  };

  const handleUnclaim = async (juzId: string) => {
    if (!(await ensureClaimSession())) return;

    const result = await unclaimJuz(shortCode, juzId);
    if (result.error) {
      toast.error(result.error);
      return;
    }
    toast.success(t("juzUnclaimed"));
    await onRefresh();
  };

  const handleMarkRead = async (juzId: string) => {
    if (!(await ensureClaimSession())) return;

    const result = await markJuzAsRead(shortCode, juzId);
    if (result.error) {
      toast.error(result.error);
      return;
    }
    toast.success(t("juzMarkedRead"));
    if (result.newlyCompleted) {
      trackProductEvent("Khatm Completed", {});
    }
    await onRefresh();
  };

  const handleUnmarkRead = async (juzId: string) => {
    if (!(await ensureClaimSession())) return;

    const result = await unmarkJuzAsRead(shortCode, juzId);
    if (result.error) {
      toast.error(result.error);
      return;
    }
    toast.success(t("juzMarkedUnread"));
    await onRefresh();
  };

  const renderJuzGrid = (juzs: Juz[]) => (
    <div className="grid grid-cols-5 gap-2 sm:grid-cols-6 md:grid-cols-10 lg:grid-cols-10">
      {juzs.map((juz) => (
        <JuzCard
          key={juz.id}
          juz={juz}
          onClaim={() => handleClaimClick(juz)}
          isReadOnly={isReadOnly}
          isSelected={activeSelection.has(juz.juz_number)}
        />
      ))}
    </div>
  );

  const renderMineRows = (juzs: Juz[]) => (
    <div className="space-y-2">
      {juzs.map((juz) => {
        const hasQuranLink = juz.juz_number >= 1 && juz.juz_number <= 30;
        const quranLinkHref = `https://quran.com/juz/${juz.juz_number}`;

        return (
          <div
            key={juz.id}
            className={cn(
              "flex flex-wrap items-center justify-between gap-3 rounded-xl border px-4 py-3 transition-colors",
              juz.status === "read"
                ? "border-emerald-200 bg-emerald-50/50"
                : "border-amber-200 bg-amber-50/50"
            )}
          >
            <div className="flex items-center gap-3">
              <span
                className={cn(
                  "flex h-9 w-9 items-center justify-center rounded-lg font-heading text-lg font-bold",
                  juz.status === "read"
                    ? "bg-emerald-100 text-emerald-700"
                    : "bg-amber-100 text-amber-700"
                )}
              >
                {juz.juz_number}
              </span>
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium text-quran-deep">
                    {t("juzLabel", { number: juz.juz_number })}
                  </span>
                  <span
                    className={cn(
                      "inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-medium",
                      juz.status === "read"
                        ? "bg-emerald-100 text-emerald-700"
                        : "bg-amber-100 text-amber-700"
                    )}
                  >
                    {juz.status === "read" ? t("read") : t("claimedStatus")}
                  </span>
                </div>
              </div>
            </div>
            <div className="flex flex-wrap items-center justify-end gap-2">
              {hasQuranLink && (
                <Button
                  asChild
                  variant="ghost"
                  size="sm"
                  className="min-h-10 rounded-full bg-quran-green/10 px-3 py-2 text-xs font-semibold text-quran-deep hover:bg-quran-green/20 hover:text-quran-deep focus-visible:ring-quran-green/35"
                >
                  <a
                    href={quranLinkHref}
                    target="_blank"
                    rel="noopener noreferrer"
                    aria-label={`Open Juz ${juz.juz_number} on Quran.com (opens in new tab)`}
                  >
                    <ExternalLink className="h-3.5 w-3.5" />
                    {t("openQuran")}
                  </a>
                </Button>
              )}
              {juz.status === "claimed" && (
                <button
                  className="rounded-full bg-emerald-100 min-h-10 px-3 py-2 text-xs font-semibold text-emerald-700 transition-colors hover:bg-emerald-200"
                  onClick={() => handleMarkRead(juz.id)}
                >
                  {t("markRead")}
                </button>
              )}
              {juz.status === "read" && (
                <button
                  className="rounded-full bg-amber-100 min-h-10 px-3 py-2 text-xs font-semibold text-amber-700 transition-colors hover:bg-amber-200"
                  onClick={() => handleUnmarkRead(juz.id)}
                >
                  {t("undo")}
                </button>
              )}
              <button
                className="rounded-full bg-red-50 min-h-10 px-3 py-2 text-xs font-semibold text-red-600 transition-colors hover:bg-red-100 hover:text-red-600"
                onClick={() => handleUnclaim(juz.id)}
              >
                {t("unclaim")}
              </button>
            </div>
          </div>
        );
      })}
    </div>
  );

  if (!isExpanded) {
    return (
      <button
        type="button"
        onClick={() => setExpanded(true)}
        className="quran-card flex w-full items-center justify-between p-4 text-start transition-colors hover:bg-quran-card/80 sm:p-5"
      >
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-full bg-emerald-100">
            <BookMarked className="h-4 w-4 text-emerald-600" />
          </div>
          <div>
            <span className="text-sm font-semibold text-quran-deep">
              {t("khatmNumber", { number: khatm.khatm_number })}
            </span>
            <span className="ms-2 text-xs text-quran-muted">
              {activeFilter === "mine" && !hasMatches && t("noMyJuzInKhatm")}
              {activeFilter === "mine" && hasMatches && t("myJuzCount", { count: matchingCount })}
              {activeFilter === "available" && !hasMatches && t("noAvailableInKhatm")}
              {activeFilter === "available" && hasMatches && t("availableCount", { count: matchingCount })}
              {activeFilter === "all" && (
                <>
                  {t("claimedWithRead", { claimed: khatm.claimed_count })}
                  {readCount > 0 && <> · {t("readCount", { count: readCount })}</>}
                </>
              )}
            </span>
          </div>
        </div>
        <ChevronDown className="h-5 w-5 text-quran-muted" />
      </button>
    );
  }

  return (
    <div className="quran-card overflow-hidden p-0">
      <div className="border-b border-quran-border/60 bg-quran-card/50 p-6 sm:p-8">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <div className="mb-3 inline-flex items-center gap-2 rounded-full bg-quran-green/10 px-3 py-1 text-xs font-medium text-quran-green">
              <BookMarked className="h-3.5 w-3.5" />
              <span>{t("khatmNumber", { number: khatm.khatm_number })}</span>
            </div>
            <h2 className="font-heading text-3xl text-quran-deep sm:text-4xl">
              {t("progressTracker")}
            </h2>
          </div>
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => setExpanded(false)}
              className="flex size-11 items-center justify-center rounded-full text-quran-muted transition-colors hover:bg-quran-border/30"
              aria-label={t("collapseKhatm")}
            >
              <ChevronUp className="h-5 w-5" />
            </button>
            <div className="text-end">
              <span className="block font-heading text-4xl text-quran-green">
                {claimProgress}%
              </span>
              <span className="text-xs font-medium uppercase tracking-wider text-quran-muted">
                {t("claimed")}
              </span>
            </div>
          </div>
        </div>

        <div className="mt-6">
          <Progress
            value={claimProgress}
            aria-label={`${t("khatmNumber", {
              number: khatm.khatm_number,
            })}: ${t("claimedWithRead", { claimed: khatm.claimed_count })}`}
            className="h-3 bg-quran-border/30"
          />
          <div className="mt-2 flex justify-between text-xs text-quran-muted">
            <span>
              {t("claimedCount", { count: khatm.claimed_count })}
              {readCount > 0 && <> · {t("readCount", { count: readCount })}</>}
            </span>
            <span>{t("juzCount")}</span>
          </div>
        </div>
      </div>

      <div className="bg-white/40 p-6 sm:p-8">
        {activeFilter !== "mine" && (
          <p className="mb-4 rounded-lg border border-quran-border/50 bg-white/70 px-3 py-2 text-xs text-quran-muted sm:text-sm">
            {t("tapToSelect")}
          </p>
        )}

        {activeFilter === "mine" && hasMatches && renderMineRows(myJuzs)}

        {activeFilter === "mine" && !hasMatches && (
          <div className="rounded-xl border border-quran-border/40 bg-white/60 py-8 text-center">
            <p className="text-sm text-quran-muted">{t("noMyJuz")}</p>
          </div>
        )}

        {activeFilter === "all" && renderJuzGrid(khatm.juzs)}

        {activeFilter === "available" && hasMatches && renderJuzGrid(availableJuzs)}

        {activeFilter === "available" && !hasMatches && (
          <div className="rounded-xl border border-emerald-200 bg-emerald-50/50 py-8 text-center">
            <CircleCheck className="mx-auto mb-2 h-8 w-8 text-emerald-500" />
            <p className="text-sm font-medium text-emerald-700">{t("noAvailableJuz")}</p>
            {isCompleted && (
              <p className="mt-1 text-xs text-emerald-600/70">
                {t("checkNextKhatm")}
              </p>
            )}
          </div>
        )}
      </div>

      <ClaimJuzDialog
        isOpen={isClaimDialogOpen && activeSelection.size > 0}
        onClose={() => {
          setIsClaimDialogOpen(false);
        }}
        juzNumbers={Array.from(activeSelection).sort((a, b) => a - b)}
        onSubmit={handleClaimSubmit}
      />

      {activeFilter !== "mine" && (
        <FloatingClaimBar
          selectedCount={activeSelection.size}
          onClaim={handleBatchClaim}
          onClear={clearSelection}
        />
      )}
    </div>
  );
}
