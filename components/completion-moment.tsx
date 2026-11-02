"use client";

import { useId, type ReactNode } from "react";
import { useFormatter, useLocale, useTranslations } from "next-intl";
import { CheckCircle2, ExternalLink, Send } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { COMPLETION_DUA_AR, getReaderNames } from "@/lib/completion";
import { getSupportUrl } from "@/lib/support";
import { buildWhatsAppShareUrl } from "@/lib/whatsapp";
import { textScript } from "@/lib/text-script";
import type { KhatmSnapshot } from "@/lib/types/events";

type HeadingProps = { id: string; className: string; children: ReactNode };

type ContentProps = {
  circleName: string;
  khatm: KhatmSnapshot;
  /** "dialog" lists the readers; "record" sits above the grid, which already is the register. */
  variant: "dialog" | "record";
  /** Whether the support ask is allowed here. It still needs getSupportUrl() to return a URL. */
  showSupport: boolean;
  headingId: string;
  /** A dialog supplies its own title element. */
  renderHeading?: (props: HeadingProps) => ReactNode;
};

/** The completion screen: still on purpose (no confetti, no motion), name first (direction.md, taste call 4). */
export function CompletionContent({
  circleName,
  khatm,
  variant,
  showSupport,
  headingId,
  renderHeading,
}: ContentProps) {
  const t = useTranslations("Completion");
  const locale = useLocale();
  const format = useFormatter();
  const supportUrl = getSupportUrl();
  const readers = variant === "dialog" ? getReaderNames(khatm) : [];
  // UTC so the server render and the browser agree on the day.
  const completedOn = khatm.completed_at
    ? format.dateTime(new Date(khatm.completed_at), { dateStyle: "long", timeZone: "UTC" })
    : null;
  const isAuto = khatm.completion_source === "auto";

  const shareOnWhatsApp = () => {
    const url = `${window.location.origin}${window.location.pathname}`;
    window.open(
      buildWhatsAppShareUrl(t("shareText", { number: khatm.khatm_number, name: circleName }), url),
      "_blank",
      "noopener,noreferrer"
    );
  };

  const headingClass = "font-heading text-3xl leading-tight tabular-nums lining-nums text-white sm:text-4xl";
  const heading = t("title", { number: khatm.khatm_number });
  const meta = [isAuto ? t("autoWording") : null, completedOn ? t("completedOn", { date: completedOn }) : null].filter(
    (line): line is string => Boolean(line)
  );

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
        <p
          dir="auto"
          data-script={textScript(circleName)}
          className="mt-2 line-clamp-3 break-words text-lg text-white/90"
        >
          <bdi>{circleName}</bdi>
        </p>
        {meta.length > 0 && (
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
        <p className="font-heading text-xl text-quran-deep">{t("prayer")}</p>
      </section>

      {readers.length > 0 && (
        <section aria-labelledby={`${headingId}-readers`}>
          <h3 id={`${headingId}-readers`} className="text-sm font-semibold text-quran-deep rtl:text-base">
            {isAuto ? t("takenUpBy") : t("readBy")}
          </h3>
          <p dir="auto" className="mt-1 text-base leading-7 text-quran-deep/90">
            {readers.map((name, index) => (
              <span key={name}>
                {index > 0 && " · "}
                <bdi>{name}</bdi>
              </span>
            ))}
          </p>
        </section>
      )}

      <div className="flex justify-center">
        <Button
          type="button"
          onClick={shareOnWhatsApp}
          className="w-full rounded-full bg-quran-green px-6 text-white hover:bg-quran-green/90 sm:w-auto"
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
            className="mt-1 inline-flex min-h-11 items-center gap-1.5 rounded-full px-3 text-sm font-medium text-quran-green rtl:text-base underline underline-offset-4 hover:bg-quran-green/10"
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
  onClose: () => void;
};

/** Shown once per device the first time a visitor sees a khatm completed. */
export function CompletionDialog({ khatm, circleName, onClose }: DialogProps) {
  const headingId = useId();
  return (
    <Dialog open={khatm !== null} onOpenChange={(open) => !open && onClose()}>
      <DialogContent aria-describedby={undefined} className="max-w-xl pt-14 sm:pt-14">
        {khatm && (
          <CompletionContent
            circleName={circleName}
            khatm={khatm}
            variant="dialog"
            showSupport
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
