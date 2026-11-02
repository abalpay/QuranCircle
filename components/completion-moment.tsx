"use client";

import { useId, useState, type ReactNode } from "react";
import { useFormatter, useLocale, useTranslations } from "next-intl";
import { CheckCircle2, ExternalLink, Send } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import {
  COMPLETION_DUA_AR,
  getReaderNames,
  isCircleOldEnoughForSupportAsk,
} from "@/lib/completion";
import { getSupportUrl } from "@/lib/support";
import { buildWhatsAppShareUrl } from "@/lib/whatsapp";
import { textScript } from "@/lib/text-script";
import type { KhatmSnapshot } from "@/lib/types/events";

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
  headingId,
  renderHeading,
}: ContentProps) {
  const t = useTranslations("Completion");
  const locale = useLocale();
  const format = useFormatter();
  const supportUrl = getSupportUrl();
  const readers = variant === "dialog" ? getReaderNames(khatm) : [];
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
          {/* One li per name, the separator in CSS: mixed-script names never reorder around it. */}
          <ul className="mt-1 flex flex-wrap gap-x-2 text-base leading-7 text-quran-deep/90 [&>li+li]:before:me-2 [&>li+li]:before:content-['·']">
            {readers.map((name) => (
              <li key={name} dir="auto">
                {name}
              </li>
            ))}
          </ul>
        </section>
      )}

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
        <div className="border-t border-quran-border/60 pt-4 text-center">
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
  const [now] = useState(() => Date.now());
  return (
    <Dialog open={khatm !== null} onOpenChange={(open) => !open && onClose()}>
      <DialogContent aria-describedby={undefined} className="max-w-xl pt-14 sm:pt-14">
        {khatm && (
          <CompletionContent
            circleName={circleName}
            khatm={khatm}
            variant="dialog"
            showSupport={isCircleOldEnoughForSupportAsk(circleCreatedAt, now)}
            headingId={headingId}
            renderHeading={({ id, className, children }) => (
              <DialogTitle id={id} className={className}>
                {children}
              </DialogTitle>
            )}
          />
        )}
      </DialogContent>
    </Dialog>
  );
}
