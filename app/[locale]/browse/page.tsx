import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { getPublicEventsPage } from "@/lib/actions/events";
import { Globe2 } from "lucide-react";
import BrowseEvents from "@/components/browse-events";
import AppPageHero from "@/components/app-page-hero";
import type { LocalePageProps } from "@/i18n/routing";
import {
  getLanguageAlternates,
  getLocalizedPath,
} from "@/i18n/locale-config";

const INITIAL_PUBLIC_CIRCLES_LIMIT = 12;

export async function generateMetadata({
  params,
}: LocalePageProps): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "BrowsePage" });
  const canonical = getLocalizedPath(locale, "/browse");

  return {
    title: t("metadataTitle"),
    description: t("metadataDescription"),
    alternates: {
      canonical,
      languages: getLanguageAlternates("/browse"),
    },
    openGraph: {
      title: `${t("metadataTitle")} - QuranCircle`,
      description: t("metadataDescription"),
      url: canonical,
    },
    twitter: {
      title: `${t("metadataTitle")} - QuranCircle`,
      description: t("metadataDescription"),
    },
  };
}

export default async function BrowsePage({ params }: LocalePageProps) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("BrowsePage");

  const initialPage = await getPublicEventsPage({
    limit: INITIAL_PUBLIC_CIRCLES_LIMIT,
  });

  return (
    <main className="page-shell grow">
      <AppPageHero
        eyebrow={t("eyebrow")}
        title={t("title")}
        description={t("description")}
        icon={Globe2}
      >
        <div className="app-hero-ledger browse-hero-ledger">
          <p className="text-[0.65rem] font-bold uppercase tracking-[0.2em] text-quran-gold">
            {t("ledgerLabel")}
          </p>
          <div className="app-hero-ledger-value">
            <strong>30</strong>
            <span>{t("juz")}</span>
          </div>
          <p className="mt-4 text-sm leading-6 text-quran-muted">
            {t("ledgerDescription")}
          </p>
        </div>
      </AppPageHero>

      <div className="mt-8">
        <BrowseEvents initialPage={initialPage} />
      </div>
    </main>
  );
}
