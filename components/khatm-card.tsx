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
  type CardFilter,
} from "@/lib/event-filters";
import type { JuzSnapshot, KhatmSnapshot } from "@/lib/types/events";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { useAuth } from "@/hooks/use-auth";
import { wasSessionCaptchaRejected } from "@/lib/captcha";
import { BookMarked, CheckCircle2, ChevronDown, ChevronUp, CircleCheck } from "lucide-react";
import { useId } from "react";
import { useTranslations } from "next-intl";
import CompleteKhatmBanner from "@/components/complete-khatm-banner";
import { CompletionContent } from "@/components/completion-moment";
import { isReadyToComplete } from "@/lib/completion";

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
  activeFilter: CardFilter;
  isCompleted?: boolean;
  /** Completed for good (completed_at set): no claim or unclaim. */
  isFinal?: boolean;
  onClaimSuccess?: (payload: ClaimSuccessPayload) => void;
  /** Circle name, shown on the completion record. */
  circleName?: string;
  /** The organizer sees "Complete the khatm" once all 30 Juz are claimed. */
  canManage?: boolean;
  /** The latest khatm's date is already in the page header, so its record leaves the date out. */
  isLatest?: boolean;
  onCompleted?: () => Promise<void> | void;
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
  circleName = "",
  canManage = false,
  isLatest = false,
  onCompleted,
}: Props) {
  const t = useTranslations("KhatmCard");
  const tc = useTranslations("Completion");
  const headingId = useId();
  const isComplete = Boolean(khatm.completed_at);
  const selectionContextKey = isReadOnly ? "1" : "0";
  const [selectionState, setSelectionState] = useState<{
    key: string;
    values: Set<number>;
  }>({
    key: selectionContextKey,
    values: new Set(),
  });
  const [isClaimDialogOpen, setIsClaimDialogOpen] = useState(false);
  const availableJuzs = useMemo(() => getAvailableRows(khatm), [khatm]);
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
      if (!wasSessionCaptchaRejected()) toast.error(t("sessionError"));
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
          isReadOnly={isReadOnly || isFinal || isComplete}
          isSelected={activeSelection.has(juz.juz_number)}
          takenUp={khatm.completion_source === "auto"}
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
          <div
            className={cn(
              "flex h-9 w-9 items-center justify-center rounded-full",
              isComplete ? "bg-quran-deep" : "bg-emerald-100"
            )}
          >
            {isComplete ? (
              <CheckCircle2 aria-hidden="true" className="h-4 w-4 text-white" />
            ) : (
              <BookMarked className="h-4 w-4 text-emerald-600" />
            )}
          </div>
          <div>
            <span className="text-sm font-semibold text-quran-deep">
              {t("khatmNumber", { number: khatm.khatm_number })}
            </span>
            <span className="ms-2 text-xs text-quran-muted">
              {activeFilter === "available" && !hasMatches && t("noAvailableInKhatm")}
              {activeFilter === "available" && hasMatches && t("availableCount", { count: matchingCount })}
              {activeFilter === "all" && isComplete && tc("completeShort")}
              {activeFilter === "all" && !isComplete && (
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
      {isComplete ? (
        <div className="relative border-b border-quran-border/60 bg-quran-card/50 p-5 sm:p-8">
          <CompletionContent
            circleName={circleName}
            khatm={khatm}
            variant="record"
            showDate={!isLatest}
            headingId={headingId}
          />
          <button
            type="button"
            onClick={() => setExpanded(false)}
            className="absolute end-7 top-7 flex size-11 shrink-0 items-center justify-center rounded-full text-white/85 transition-colors hover:bg-white/10 sm:end-11 sm:top-11"
            aria-label={t("collapseKhatm")}
          >
            <ChevronUp className="h-5 w-5" />
          </button>
        </div>
      ) : (
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
      )}

      {canManage && !isReadOnly && isReadyToComplete(khatm) && (
        <CompleteKhatmBanner
          khatm={khatm}
          shortCode={shortCode}
          onCompleted={async () => {
            await onCompleted?.();
          }}
        />
      )}

      <div className="bg-white/40 p-4 sm:p-8">
        {!isFinal && !isComplete && khatm.claimed_count < 30 && (
          <p className="mb-4 text-sm text-quran-muted">
            {t("tapToSelect")}
          </p>
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

      <FloatingClaimBar
        selectedCount={activeSelection.size}
        onClaim={handleBatchClaim}
        onClear={clearSelection}
      />
    </div>
  );
}
