import { CheckCircle2, Link2, MousePointerClick, Radio } from "lucide-react";
import { getTranslations } from "next-intl/server";
import CreateCircleAction from "@/components/create-circle-action";

type PreviewStatus = "available" | "claimed" | "read";

const CLAIMED_NAMES: Record<number, string> = {
  13: "Amina",
  14: "Yusuf",
  15: "Meryem",
  16: "Omar",
  17: "Zaynab",
  18: "Ali",
};

function getPreviewStatus(juzNumber: number): PreviewStatus {
  if (juzNumber <= 12) return "read";
  if (juzNumber <= 18) return "claimed";
  return "available";
}

export default async function KhatmProductPreview() {
  const t = await getTranslations("KhatmGuide");
  const participantSteps = [
    {
      icon: MousePointerClick,
      label: t("productPreview.openLink"),
    },
    {
      icon: Link2,
      label: t("productPreview.claimJuz"),
    },
    {
      icon: CheckCircle2,
      label: t("productPreview.markRead"),
    },
  ];

  return (
    <section
      id="product-preview"
      aria-labelledby="product-preview-title"
      className="scroll-mt-32"
    >
      <div className="max-w-3xl">
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-quran-gold">
          {t("productPreview.eyebrow")}
        </p>
        <h2
          id="product-preview-title"
          className="font-heading mt-1 text-3xl text-quran-deep sm:text-4xl"
        >
          {t("productPreview.title")}
        </h2>
        <p className="mt-3 leading-7 text-quran-muted">
          {t("productPreview.description")}
        </p>
      </div>

      <div className="mt-7 grid gap-5 lg:grid-cols-[minmax(0,1.45fr)_minmax(17rem,0.55fr)]">
        <div className="quran-card-primary overflow-hidden">
          <div className="border-b border-quran-border/60 bg-white/50 px-5 py-4 sm:px-7">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <p className="text-[0.65rem] font-bold uppercase tracking-[0.18em] text-quran-gold">
                  {t("productPreview.previewLabel")}
                </p>
                <h3 className="font-heading mt-1 text-2xl text-quran-deep">
                  {t("productPreview.circleName")}
                </h3>
              </div>
              <span className="inline-flex items-center gap-1.5 rounded-full border border-quran-border bg-quran-card px-3 py-1.5 text-xs font-semibold text-quran-deep">
                <Link2 className="h-3.5 w-3.5 text-quran-green" />
                {t("productPreview.linkOnly")}
              </span>
            </div>

            <div className="mt-5 flex items-center justify-between gap-4 text-sm">
              <span className="font-semibold text-quran-deep">
                {t("productPreview.progress", { count: 18 })}
              </span>
              <span className="font-heading text-xl text-quran-green">60%</span>
            </div>
            <div className="mt-2 h-2 overflow-hidden rounded-full bg-quran-border/40">
              <div className="h-full w-3/5 rounded-full bg-linear-to-r from-quran-green to-quran-light-green" />
            </div>

            <ul className="mt-4 flex flex-wrap gap-x-5 gap-y-2 text-xs font-medium text-quran-muted">
              <li className="flex items-center gap-2">
                <span className="h-2.5 w-2.5 rounded-sm border border-quran-border bg-white" />
                {t("productPreview.available")}
              </li>
              <li className="flex items-center gap-2">
                <span className="h-2.5 w-2.5 rounded-sm border border-amber-300 bg-amber-100" />
                {t("productPreview.claimed")}
              </li>
              <li className="flex items-center gap-2">
                <span className="h-2.5 w-2.5 rounded-sm border border-emerald-400 bg-emerald-100" />
                {t("productPreview.read")}
              </li>
            </ul>
          </div>

          <ol
            aria-label={t("productPreview.gridLabel")}
            className="grid grid-cols-5 gap-2 p-4 sm:grid-cols-6 sm:p-6 md:grid-cols-10"
          >
            {Array.from({ length: 30 }, (_, index) => {
              const juzNumber = index + 1;
              const status = getPreviewStatus(juzNumber);
              const claimedName = CLAIMED_NAMES[juzNumber];
              const stateClass =
                status === "read"
                  ? "border-t-emerald-500 bg-linear-to-b from-emerald-50/90 to-emerald-50/30 text-emerald-700"
                  : status === "claimed"
                    ? "border-t-amber-400 bg-linear-to-b from-amber-50/90 to-amber-50/30 text-amber-700"
                    : "border-t-quran-border/60 bg-white/75 text-quran-muted";

              return (
                <li
                  key={juzNumber}
                  aria-label={t(`productPreview.${status}Label`, {
                    number: juzNumber,
                    name: claimedName ?? "",
                  })}
                  className={`flex aspect-square flex-col items-center justify-center rounded-xl border border-quran-border/50 border-t-[3px] ${stateClass}`}
                >
                  <span className="font-heading text-xl leading-none sm:text-2xl">
                    {juzNumber}
                  </span>
                  {status === "read" ? (
                    <CheckCircle2 className="mt-1 h-3 w-3 text-emerald-500" />
                  ) : status === "claimed" ? (
                    <span className="mt-1 max-w-[90%] truncate text-[0.58rem] font-semibold text-amber-600/80">
                      {claimedName}
                    </span>
                  ) : null}
                </li>
              );
            })}
          </ol>
        </div>

        <aside className="quran-card flex flex-col p-5 sm:p-6">
          <Radio className="h-6 w-6 text-quran-green" />
          <h3 className="font-heading mt-4 text-2xl text-quran-deep">
            {t("productPreview.participantTitle")}
          </h3>
          <ol className="mt-5 space-y-4">
            {participantSteps.map(({ icon: StepIcon, label }, index) => (
              <li key={label} className="flex items-start gap-3">
                <span className="relative flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-quran-green/10 text-quran-green">
                  <StepIcon className="h-4 w-4" />
                  <span className="absolute -right-1 -top-1 text-[0.6rem] font-bold text-quran-gold">
                    {index + 1}
                  </span>
                </span>
                <span className="pt-1 text-sm leading-6 text-quran-muted">
                  {label}
                </span>
              </li>
            ))}
          </ol>

          <div className="my-6 h-px bg-quran-border/60" />
          <h4 className="font-heading text-xl text-quran-deep">
            {t("productPreview.organizerTitle")}
          </h4>
          <p className="mt-2 text-sm leading-6 text-quran-muted">
            {t("productPreview.organizerText")}
          </p>

          <CreateCircleAction
            source="guide_preview"
            className="mt-6 w-full rounded-full"
          >
            {t("startCircle")}
          </CreateCircleAction>
        </aside>
      </div>
    </section>
  );
}
