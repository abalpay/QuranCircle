import { getTranslations } from "next-intl/server";
import { getManifest } from "@/lib/hadith/repository";
import { HADITH_LOCALES } from "@/lib/hadith/paths";
import { localeConfig } from "@/i18n/locale-config";
import { SourceDetails } from "@/components/hadith/source-text";

export default async function SourcesPage() {
  const [manifest, t] = await Promise.all([getManifest(), getTranslations("Hadith")]);
  return <><h1>{t("sources")}</h1><p>{t("sourcesIntro")}</p>{HADITH_LOCALES.map(locale => <section key={locale}><h2 lang={locale}>{localeConfig[locale].label}</h2><SourceDetails edition={manifest.editions[locale]} /></section>)}</>;
}
