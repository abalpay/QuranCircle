import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { ScrollText } from "lucide-react";
import AppPageHero from "@/components/app-page-hero";
import type { LocalePageProps } from "@/i18n/routing";

export async function generateMetadata({
  params,
}: LocalePageProps): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "TermsPage" });
  const canonical = locale === "tr" ? "/tr/terms" : "/terms";
  return {
    title: t("title"),
    description: t("metadataDescription"),
    alternates: {
      canonical,
      languages: { en: "/terms", tr: "/tr/terms" },
    },
    openGraph: {
      title: `${t("title")} - QuranCircle`,
      description: t("metadataDescription"),
      url: canonical,
    },
    twitter: {
      title: `${t("title")} - QuranCircle`,
      description: t("metadataDescription"),
    },
  };
}

export default async function TermsPage({ params }: LocalePageProps) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("TermsPage");

  return (
    <main className="page-shell grow">
      <AppPageHero
        eyebrow={t("eyebrow")}
        title={t("title")}
        description={t("description")}
        icon={ScrollText}
        compact
      />

      <div className="app-prose-layout">
        <aside className="app-prose-rail">
          <p className="text-xs font-bold uppercase tracking-[0.18em] text-quran-gold">
            {t("sharedResponsibility")}
          </p>
          <p className="mt-3 text-sm leading-6 text-quran-muted">
            {t("sharedDescription")}
          </p>
        </aside>

        <article className="app-prose-panel">
          <section className="app-prose-section">
            <span className="app-prose-number">01</span>
            <div>
              <h2 className="font-heading text-3xl text-quran-deep">
                {t("acceptableTitle")}
              </h2>
              <p className="mt-3 max-w-3xl leading-7 text-quran-muted">
                {t("acceptableDescription")}
              </p>
            </div>
          </section>

          <section className="app-prose-section">
            <span className="app-prose-number">02</span>
            <div>
              <h2 className="font-heading text-3xl text-quran-deep">
                {t("accountTitle")}
              </h2>
              <p className="mt-3 max-w-3xl leading-7 text-quran-muted">
                {t("accountDescription")}
              </p>
            </div>
          </section>

          <section className="app-prose-section">
            <span className="app-prose-number">03</span>
            <div>
              <h2 className="font-heading text-3xl text-quran-deep">
                {t("availabilityTitle")}
              </h2>
              <p className="mt-3 max-w-3xl leading-7 text-quran-muted">
                {t("availabilityDescription")}
              </p>
            </div>
          </section>
        </article>
      </div>
    </main>
  );
}
