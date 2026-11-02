"use client";

import { useState, useCallback, useMemo } from "react";
import { Progress } from "@/components/ui/progress";
import JuzCard from "@/components/juz-card";
import ClaimJuzDialog from "@/components/claim-juz-dialog";
import FloatingClaimBar from "@/components/floating-claim-bar";
import { claimMultipleJuz } from "@/lib/actions/juz";
import {
  getKhatmMatches,
  getAvailableRows,
  getMineRows,
  type GlobalFilter,
} from "@/lib/event-filters";
import type { JuzSnapshot, KhatmSnapshot } from "@/lib/types/events";
import { toast } from "sonner";
import { useAuth } from "@/hooks/use-auth";
import { BookMarked, ChevronDown, ChevronUp, CircleCheck } from "lucide-react";
import { useTranslations } from "next-intl";

type Juz = JuzSnapshot;
type Khatm = KhatmSnapshot;

export type ClaimSuccessPayload = {
  claimedCount: number;
  claimedNumbers: number[];
  newKhatmCreated: boolean;
};

type Props = {
  khatm: Khatm;
  shortCode: string;
  isReadOnly: boolean;
  onRefresh: () => Promise<void>;
  activeFilter: GlobalFilter;
  isCompleted?: boolean;
  /** Completed for good (completed_at set): no claim or unclaim. */
  isFinal?: boolean;
  onClaimSuccess?: (payload: ClaimSuccessPayload) => void;
};

export default function KhatmCard({
  khatm,
  shortCode,
  isReadOnly,
  onRefresh,
  activeFilter,
  isCompleted = false,
  isFinal = false,
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
      claimedNumbers: result.claimed ?? juzNumbers,
      newKhatmCreated: Boolean(result.newKhatmCreated),
    });
  };

  const renderJuzGrid = (juzs: Juz[]) => (
    <div className="grid grid-cols-4 gap-2 sm:grid-cols-6 md:grid-cols-10">
      {juzs.map((juz) => (
        <JuzCard
          key={juz.id}
          juz={juz}
          onClaim={() => handleClaimClick(juz)}
          isReadOnly={isReadOnly || isFinal}
          isSelected={activeSelection.has(juz.juz_number)}
        />
      ))}
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
                  {t("claimedOfThirty", { count: khatm.claimed_count })}
                  {readCount > 0 && <> · {t("doneCount", { count: readCount })}</>}
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
      <div className="border-b border-quran-border/60 bg-quran-card/50 p-5 sm:p-8">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2 className="text-base font-semibold text-quran-deep">
              {t("khatmNumber", { number: khatm.khatm_number })}
            </h2>
            <p className="mt-1 font-heading text-3xl tabular-nums lining-nums text-quran-green sm:text-4xl">
              {t("claimedOfThirty", { count: khatm.claimed_count })}
            </p>
            {readCount > 0 && (
              <p className="mt-1 text-sm text-quran-muted">
                {t("doneCount", { count: readCount })}
              </p>
            )}
          </div>
          <button
            type="button"
            onClick={() => setExpanded(false)}
            className="flex size-11 shrink-0 items-center justify-center rounded-full text-quran-muted transition-colors hover:bg-quran-border/30"
            aria-label={t("collapseKhatm")}
          >
            <ChevronUp className="h-5 w-5" />
          </button>
        </div>

        <Progress
          value={claimProgress}
          aria-label={`${t("khatmNumber", {
            number: khatm.khatm_number,
          })}: ${t("claimedOfThirty", { count: khatm.claimed_count })}`}
          className="mt-4 h-2.5 bg-quran-border/30"
        />
      </div>

      <div className="bg-white/40 p-4 sm:p-8">
        {activeFilter !== "mine" && (
          <p className="mb-4 text-sm text-quran-muted">
            {t("tapToSelect")}
          </p>
        )}

        {activeFilter === "mine" && hasMatches && renderJuzGrid(myJuzs)}

        {activeFilter === "mine" && !hasMatches && (
          <div className="px-2 py-8 text-center">
            <p className="text-base text-quran-deep">{t("noMyJuz")}</p>
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
