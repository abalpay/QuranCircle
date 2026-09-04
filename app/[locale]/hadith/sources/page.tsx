import { getTranslations } from "next-intl/server";
import { getManifest } from "@/lib/hadith/repository";
import { HADITH_LOCALES } from "@/lib/hadith/paths";
import { localeConfig } from "@/i18n/locale-config";
import { SourceDetails } from "@/components/hadith/source-text";

import { requireHadithEnabled } from "@/lib/hadith/guard";
export default async function SourcesPage() {
  requireHadithEnabled();
  const [manifest, t] = await Promise.all([getManifest(), getTranslations("Hadith")]);
  return <div className="hadith-utility-page"><header className="hadith-intro"><p className="hadith-eyebrow">{t("sources")}</p><h1>{t("editionIntro")}</h1><p>{t("sourcesIntro")}</p></header><div className="hadith-editions">{HADITH_LOCALES.map(locale => <section className="hadith-edition" key={locale}><div className="hadith-edition-heading"><h2 lang={locale}>{localeConfig[locale].label}</h2><span>{locale.toUpperCase()}</span></div><SourceDetails edition={manifest.editions[locale]} /></section>)}</div></div>;
}
