import { useTranslations } from "next-intl";
import type { Edition, HadithLocale, TextBlock } from "@/lib/hadith/types";

export function SourceText({ text, locale, title = true, includeText = true }: { text: TextBlock; locale: HadithLocale; title?: boolean; includeText?: boolean }) {
  const t = useTranslations("Hadith");
  return <section className="hadith-source" lang={locale} dir={locale === "ar" ? "rtl" : "ltr"}>
    {title && <h2 className="hadith-source-title">{text.title}</h2>}
    {includeText && <p className={locale === "ar" ? "hadith-arabic" : "hadith-translation"} lang={locale}>{text.text}</p>}
    {(["grade", "attribution", "explanation", "benefits", "wordMeanings"] as const).map(key => text[key] ? <section key={key} className="hadith-field">
      <h3 className="hadith-label">{t(key)}</h3>
      <p className={locale === "ar" ? "hadith-arabic" : "hadith-translation"}>{text[key]}</p>
    </section> : null)}
  </section>;
}

export function SourceDetails({ edition, sourceUrl }: { edition: Edition; sourceUrl?: string }) {
  const t = useTranslations("Hadith");
  return <aside className="hadith-provenance">
    <p>HadeethEnc · {t("version")} <bdi>{edition.version}</bdi></p>
    {sourceUrl && <a className="hadith-link" href={sourceUrl}>{t("originalEntry")}</a>}
    <details>
      <summary>{t("sourceDetails")}</summary>
      <p className="hadith-notice" dir="auto">{edition.notice}</p>
      <dl><dt>{t("publisherUpdated")}</dt><dd><bdi>{edition.publisherUpdatedAt}</bdi></dd><dt>{t("retrieved")}</dt><dd><bdi>{edition.retrievedAt}</bdi></dd></dl>
      <div className="hadith-actions">
        <a href={edition.sourceUrl}>{t("publisher")}</a>
        <a href={edition.downloadUrl}>{t("download")}</a>
        <a href={edition.checkUrl}>{t("check")}</a>
      </div>
    </details>
  </aside>;
}
