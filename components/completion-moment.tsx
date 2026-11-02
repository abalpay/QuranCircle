"use client";

import { useId, useState, type ReactNode } from "react";
import { cn } from "@/lib/utils";
import { useFormatter, useLocale, useTranslations } from "next-intl";
import { CheckCircle2, ExternalLink, Send, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogClose, DialogContent, DialogTitle } from "@/components/ui/dialog";
import {
  COMPLETION_DUA_AR,
  getReaderNames,
  isCircleOldEnoughForSupportAsk,
} from "@/lib/completion";
import { getSupportUrl } from "@/lib/support";
import { buildWhatsAppShareUrl } from "@/lib/whatsapp";
import { textScript } from "@/lib/text-script";
import type { KhatmSnapshot } from "@/lib/types/events";

/** Up to this many names show at first; the rest wait behind "and N more". */
export const READERS_COLLAPSED = 12;

type HeadingProps = { id: string; className: string; children: ReactNode };

type ContentProps = {
  circleName: string;
  khatm: KhatmSnapshot;
  /**
   * "dialog": the person's name is the display line, readers and the support ask follow.
   * "record": sits above the grid (which is the register); the page title already shows the name.
   */
  variant: "dialog" | "record";
  /** The record shows the date when the page header does not already say it. */
  showDate?: boolean;
  /** Keep the share button and the support ask pinned at the bottom while the dialog scrolls. */
  stickyFooter?: boolean;
  /** The support ask (D10/D19). It still needs getSupportUrl() to return a URL. Dialog only. */
  showSupport?: boolean;
  headingId: string;
  /** A dialog supplies its own title element. */
  renderHeading?: (props: HeadingProps) => ReactNode;
};

/** The completion screen: still on purpose (no confetti, no motion), name first (direction.md, taste call 4). */
export function CompletionContent({
  circleName,
  khatm,
  variant,
  showDate = variant === "dialog",
  showSupport = false,
  stickyFooter = false,
  headingId,
  renderHeading,
}: ContentProps) {
  const t = useTranslations("Completion");
  const locale = useLocale();
  const format = useFormatter();
  const supportUrl = getSupportUrl();
  const [showAllReaders, setShowAllReaders] = useState(false);
  const readers = variant === "dialog" ? getReaderNames(khatm) : [];
  const visibleReaders = showAllReaders ? readers : readers.slice(0, READERS_COLLAPSED);
  const hiddenReaders = readers.length - visibleReaders.length;
  // UTC so the server render and the browser agree on the day.
  const completedOn =
    showDate && khatm.completed_at
      ? format.dateTime(new Date(khatm.completed_at), { dateStyle: "long", timeZone: "UTC" })
      : null;
  const isAuto = khatm.completion_source === "auto";
  const title = t("title", { number: khatm.khatm_number });

  const shareOnWhatsApp = () => {
    const url = `${window.location.origin}${window.location.pathname}`;
    window.open(
      buildWhatsAppShareUrl(t("shareText", { number: khatm.khatm_number, name: circleName }), url),
      "_blank",
      "noopener,noreferrer"
    );
  };

  const isDialog = variant === "dialog";
  const headingClass = isDialog
    ? "block"
    : "font-heading text-3xl leading-tight tabular-nums lining-nums text-white sm:text-4xl";
  const status = [title, completedOn].filter(Boolean).join(" · ");
  const heading = isDialog ? (
    <>
      <span
        dir="auto"
        data-script={textScript(circleName)}
        className="block line-clamp-3 break-words font-heading text-3xl leading-tight text-white sm:text-4xl"
      >
        <bdi>{circleName}</bdi>
      </span>
      <span className="mt-2 block text-base font-normal tabular-nums lining-nums text-white/85">
        {status}
      </span>
    </>
  ) : (
    title
  );
  const meta = [isAuto ? t("autoWording") : null, isDialog ? null : completedOn].filter(
    (line): line is string => Boolean(line)
  );
  const prayer = t("prayer");

  return (
    <div className="space-y-6">
      <div className="rounded-2xl bg-quran-deep px-5 py-6 text-center text-white sm:px-8">
        <CheckCircle2
          aria-hidden="true"
          className="mx-auto mb-3 size-7 text-[hsl(var(--quran-gold-on-dark))]"
        />
        {renderHeading ? (
          renderHeading({ id: headingId, className: headingClass, children: heading })
        ) : (
          <h2 id={headingId} className={headingClass}>
            {heading}
          </h2>
        )}
        {isDialog && isAuto && <p className="mt-3 text-sm text-white/80 rtl:text-base">{t("autoWording")}</p>}
        {!isDialog && meta.length > 0 && (
          <div className="mt-3 space-y-0.5 text-sm text-white/80 rtl:text-base">
            {meta.map((line) => (
              <p key={line}>{line}</p>
            ))}
          </div>
        )}
      </div>

      <section aria-label={t("duaLabel")} className="space-y-3 text-center">
        <p
          lang="ar"
          dir="rtl"
          data-script="arabic"
          className="text-2xl leading-[2] text-quran-deep sm:text-3xl"
        >
          {COMPLETION_DUA_AR}
        </p>
        {locale !== "ar" && (
          <p className="mx-auto max-w-prose text-base leading-7 text-quran-deep/90">
            {t("duaTranslation")}
          </p>
        )}
        <p dir="auto" data-script={textScript(prayer)} className="font-heading text-xl text-quran-deep">
          {prayer}
        </p>
      </section>

      {readers.length > 0 && (
        <section aria-labelledby={`${headingId}-readers`}>
          <h3 id={`${headingId}-readers`} className="text-sm font-semibold text-quran-deep rtl:text-base">
            {isAuto ? t("takenUpBy") : t("readBy")}
          </h3>
          {/* Spacing only, each name isolated: no separator can land at a line edge in mixed-script or RTL lists. */}
          <ul
            id={`${headingId}-readers-list`}
            className="mt-1 flex flex-wrap gap-x-5 gap-y-1 text-base leading-7 text-quran-deep/90"
          >
            {visibleReaders.map((name) => (
              <li key={name}>
                <bdi>{name}</bdi>
              </li>
            ))}
          </ul>
          {readers.length > READERS_COLLAPSED && (
            <button
              type="button"
              aria-expanded={showAllReaders}
              aria-controls={`${headingId}-readers-list`}
              onClick={() => setShowAllReaders((open) => !open)}
              className="mt-1 inline-flex min-h-11 items-center rounded-full px-3 text-sm font-medium text-quran-green underline underline-offset-4 hover:bg-quran-green/10 rtl:text-base"
            >
              {showAllReaders ? t("readersShowFewer") : t("readersMore", { count: hiddenReaders })}
            </button>
          )}
        </section>
      )}

      <div
        className={cn(
          "space-y-4",
          stickyFooter &&
            "sticky bottom-0 -mx-5 border-t border-quran-border/60 bg-quran-card/95 px-5 py-3 backdrop-blur-sm sm:-mx-6 sm:px-6"
        )}
      >
        <div className="flex justify-center">
          <Button
            type="button"
            onClick={shareOnWhatsApp}
            className="w-full rounded-full bg-quran-green px-6 text-white hover:bg-quran-green/90 rtl:text-base sm:w-auto"
          >
            <Send aria-hidden="true" className="rtl:-scale-x-100" />
            {t("shareWhatsApp")}
          </Button>
        </div>

        {showSupport && supportUrl && (
          <div className={cn("text-center", stickyFooter ? "pt-0" : "border-t border-quran-border/60 pt-4")}>
            <p className="mx-auto max-w-prose text-sm leading-6 text-quran-muted rtl:text-base">{t("supportLine")}</p>
            <a
              href={supportUrl}
              target="_blank"
              rel="noopener noreferrer"
              data-testid="completion-support-link"
              className="mt-1 inline-flex min-h-11 items-center gap-1.5 rounded-full px-3 text-sm font-medium text-quran-green underline underline-offset-4 hover:bg-quran-green/10 rtl:text-base"
            >
              {t("supportLink")}
              <ExternalLink aria-hidden="true" className="size-3.5 rtl:-scale-x-100" />
              <span className="sr-only"> {t("opensInNewTab")}</span>
            </a>
          </div>
        )}
      </div>
    </div>
  );
}

type DialogProps = {
  khatm: KhatmSnapshot | null;
  circleName: string;
  /** D19: the support ask waits until the circle is more than 72 hours old. */
  circleCreatedAt: string;
  onClose: () => void;
};

/** Opens for the visitor's own completion or their stake in a finished khatm; see useCompletionMoment. */
export function CompletionDialog({ khatm, circleName, circleCreatedAt, onClose }: DialogProps) {
  const headingId = useId();
  const tCommon = useTranslations("Common");
  const [now] = useState(() => Date.now());
  return (
    <Dialog open={khatm !== null} onOpenChange={(open) => !open && onClose()}>
      {/* The dialog scrolls inside the viewport: close stays pinned on top, share and support pinned below. */}
      <DialogContent
        aria-describedby={undefined}
        showCloseButton={false}
        // Land on the dialog itself, not the close button, so no focus ring flashes on arrival.
        onOpenAutoFocus={(event) => {
          event.preventDefault();
          (event.currentTarget as HTMLElement).focus();
        }}
        className="max-w-xl gap-0 p-0 sm:p-0"
      >
        <div className="sticky top-0 z-10 flex justify-end bg-quran-card/95 px-2.5 pt-2.5 backdrop-blur-sm">
          <DialogClose
            aria-label={tCommon("close")}
            className="flex size-11 items-center justify-center rounded-full text-quran-muted transition-colors hover:bg-quran-green/10 hover:text-quran-green focus-visible:ring-2 focus-visible:ring-quran-green focus-visible:outline-hidden"
          >
            <X aria-hidden="true" className="size-4" />
          </DialogClose>
        </div>
        <div className="px-5 pb-5 sm:px-6 sm:pb-6">
          {khatm && (
            <CompletionContent
              circleName={circleName}
              khatm={khatm}
              variant="dialog"
              stickyFooter
              showSupport={isCircleOldEnoughForSupportAsk(circleCreatedAt, now)}
              headingId={headingId}
              renderHeading={({ id, className, children }) => (
                <DialogTitle id={id} className={className}>
                  {children}
                </DialogTitle>
              )}
            />
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
