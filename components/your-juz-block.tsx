"use client";

import { useMemo, useRef, useState } from "react";
import { BookOpen, CheckCircle2, ExternalLink } from "lucide-react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import UnclaimConfirmDialog from "@/components/unclaim-confirm-dialog";
import { getMineRows } from "@/lib/event-filters";
import type { KhatmSnapshot } from "@/lib/types/events";
import { cn } from "@/lib/utils";

type Props = {
  khatms: KhatmSnapshot[];
  /** Archived circles are frozen: only the Quran.com link stays. */
  isReadOnly?: boolean;
  onDone: (juzId: string) => Promise<void> | void;
  onUndo: (juzId: string) => Promise<void> | void;
  onUnclaim: (juzId: string) => Promise<void> | void;
};

/** The visitor's own Juz, at the top of the circle page in every tab. Hidden when they have none. */
export default function YourJuzBlock({
  khatms,
  isReadOnly = false,
  onDone,
  onUndo,
  onUnclaim,
}: Props) {
  const t = useTranslations("YourJuz");
  const [busyId, setBusyId] = useState<string | null>(null);
  const [unclaiming, setUnclaiming] = useState<{ id: string; number: number } | null>(null);
  const confirmedRef = useRef(false);

  const rows = useMemo(
    () =>
      khatms.flatMap((khatm) =>
        getMineRows(khatm).map((juz) => ({
          juz,
          khatmNumber: khatm.khatm_number,
          isFinal: Boolean(khatm.completed_at),
        }))
      ),
    [khatms]
  );

  if (rows.length === 0) return null;

  const run = async (id: string, action: (juzId: string) => Promise<void> | void) => {
    if (busyId) return;
    setBusyId(id);
    try {
      await action(id);
    } finally {
      setBusyId(null);
    }
  };

  const showKhatmNumber = khatms.length > 1;

  // After an unclaim the pressed button is gone: land on the heading, or on the
  // filters when this was the last Juz and the block disappears.
  const restoreFocus = (event: Event) => {
    if (!confirmedRef.current) return;
    confirmedRef.current = false;
    event.preventDefault();
    const target =
      rows.length > 1
        ? document.getElementById("your-juz-heading")
        : document.getElementById("juz-filters-start");
    target?.focus();
  };

  return (
    <section
      aria-labelledby="your-juz-heading"
      className="quran-card max-w-[44rem] p-5 sm:p-6"
    >
      <h2
        id="your-juz-heading"
        tabIndex={-1}
        className="font-heading text-2xl text-quran-deep outline-none sm:text-3xl"
      >
        {t("title")}
      </h2>
      <ul className="mt-3 divide-y divide-quran-border/60">
        {rows.map(({ juz, khatmNumber, isFinal }) => {
          const isDone = juz.status === "read";
          const busy = busyId === juz.id;
          return (
            <li
              key={juz.id}
              className="flex flex-wrap items-center gap-x-3 gap-y-2 py-3 first:pt-0 last:pb-0"
            >
              <div className="order-1 flex flex-1 items-center gap-3">
                <span
                  aria-hidden="true"
                  className={cn(
                    "flex size-11 shrink-0 items-center justify-center rounded-xl border font-heading text-2xl tabular-nums lining-nums",
                    isDone
                      ? "border-emerald-600/60 bg-emerald-100 text-emerald-800"
                      : "border-amber-300/70 bg-amber-50 text-amber-900"
                  )}
                >
                  {juz.juz_number}
                </span>
                <div>
                  <p className="text-base font-semibold text-quran-deep">
                    {t("juz", { number: juz.juz_number })}
                    {showKhatmNumber && (
                      <span className="ms-2 text-sm font-normal text-quran-muted">
                        {t("khatm", { number: khatmNumber })}
                      </span>
                    )}
                  </p>
                  <p
                    className={cn(
                      "flex items-center gap-1.5 text-sm font-medium",
                      isDone ? "text-emerald-800" : "text-amber-900"
                    )}
                  >
                    {isDone ? (
                      <CheckCircle2 aria-hidden="true" className="size-4" />
                    ) : (
                      <BookOpen aria-hidden="true" className="size-4" />
                    )}
                    {isDone ? t("stateDone") : t("stateReading")}
                  </p>
                </div>
              </div>

              {!isReadOnly && !isFinal && (
                <Button
                  type="button"
                  variant="ghost"
                  aria-disabled={busy}
                  onClick={() => {
                    if (!busy) setUnclaiming({ id: juz.id, number: juz.juz_number });
                  }}
                  className="order-2 min-h-11 shrink-0 rounded-full px-3 text-sm font-medium text-quran-muted hover:text-quran-deep sm:order-3"
                >
                  {t("unclaim")}
                </Button>
              )}

              <div className="order-3 flex w-full flex-wrap items-center gap-2 sm:order-2 sm:w-auto">
                {!isReadOnly && (
                  // One stable button for Done/Undo, so focus survives the swap.
                  <Button
                    type="button"
                    variant={isDone ? "outline" : "default"}
                    aria-disabled={busy}
                    onClick={() => void run(juz.id, isDone ? onUndo : onDone)}
                    className="min-h-11 rounded-full px-5 text-sm font-semibold"
                  >
                    {isDone ? t("undo") : t("done")}
                  </Button>
                )}
                <Button
                  asChild
                  variant="ghost"
                  className="min-h-11 rounded-full px-3 text-sm font-semibold text-quran-deep hover:bg-quran-green/10"
                >
                  <a
                    href={`https://quran.com/juz/${juz.juz_number}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    aria-label={t("openQuranAria", { number: juz.juz_number })}
                  >
                    <ExternalLink className="size-4 rtl:-scale-x-100" aria-hidden="true" />
                    {t("openQuran")}
                  </a>
                </Button>
              </div>
            </li>
          );
        })}
      </ul>

      <UnclaimConfirmDialog
        juzNumber={unclaiming?.number ?? null}
        onCancel={() => setUnclaiming(null)}
        onCloseAutoFocus={restoreFocus}
        onConfirm={() => {
          const target = unclaiming;
          confirmedRef.current = true;
          setUnclaiming(null);
          if (target) void run(target.id, onUnclaim);
        }}
      />
    </section>
  );
}
