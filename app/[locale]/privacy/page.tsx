import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { ShieldCheck } from "lucide-react";
import AppPageHero from "@/components/app-page-hero";
import type { LocalePageProps } from "@/i18n/routing";
import {
  getLanguageAlternates,
  getLocalizedPath,
} from "@/i18n/locale-config";

export async function generateMetadata({
  params,
}: LocalePageProps): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "PrivacyPage" });
  const canonical = getLocalizedPath(locale, "/privacy");
  return {
    title: t("title"),
    description: t("metadataDescription"),
    alternates: {
      canonical,
      languages: getLanguageAlternates("/privacy"),
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

export default async function PrivacyPage({ params }: LocalePageProps) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("PrivacyPage");

  return (
    <main className="page-shell grow">
      <AppPageHero
        eyebrow={t("eyebrow")}
        title={t("title")}
        description={t("description")}
        icon={ShieldCheck}
        compact
      />

      <div className="app-prose-layout">
        <aside className="app-prose-rail">
          <p className="text-xs font-bold uppercase tracking-[0.18em] text-quran-gold">
            {t("plainLanguage")}
          </p>
          <p className="mt-3 text-sm leading-6 text-quran-muted">
            {t("plainDescription")}
          </p>
        </aside>

        <article className="app-prose-panel">
          <section className="app-prose-section">
            <span className="app-prose-number">01</span>
            <div>
              <h2 className="font-heading text-3xl text-quran-deep">
                {t("collectedTitle")}
              </h2>
              <p className="mt-3 max-w-3xl leading-7 text-quran-muted">
                {t("collectedDescription")}
              </p>
            </div>
          </section>

          <section className="app-prose-section">
            <span className="app-prose-number">02</span>
            <div>
              <h2 className="font-heading text-3xl text-quran-deep">
                {t("usageTitle")}
              </h2>
              <p className="mt-3 max-w-3xl leading-7 text-quran-muted">
                {t("usageDescription")}
              </p>
            </div>
          </section>

          <section className="app-prose-section">
            <span className="app-prose-number">03</span>
            <div>
              <h2 className="font-heading text-3xl text-quran-deep">
                {t("analyticsTitle")}
              </h2>
              <p className="mt-3 max-w-3xl leading-7 text-quran-muted">
                {t("analyticsDescription")}
              </p>
            </div>
          </section>

          <section className="app-prose-section">
            <span className="app-prose-number">04</span>
            <div>
              <h2 className="font-heading text-3xl text-quran-deep">
                {t("accessTitle")}
              </h2>
              <p className="mt-3 max-w-3xl leading-7 text-quran-muted">
                {t("accessDescription")}
              </p>
            </div>
          </section>
        </article>
      </div>
    </main>
  );
}
