import { useTranslations } from "next-intl";
import type { Edition, HadithLocale, TextBlock } from "@/lib/hadith/types";
import { SourcePassage } from "./source-passage";

export function SourceText({ text, locale, title = true, includeText = true, anchors = false }: { text: TextBlock; locale: HadithLocale; title?: boolean; includeText?: boolean; anchors?: boolean }) {
  const t = useTranslations("Hadith");
  return <section className="hadith-source" lang={locale} dir={locale === "ar" ? "rtl" : "ltr"}>
    {title && <h2 className="hadith-source-title">{text.title}</h2>}
    {includeText && <section className="hadith-narration" id={anchors ? "narration" : undefined}>
      <h2 className="hadith-label">{t(locale === "ar" ? "arabicText" : "translation")}</h2>
      <SourcePassage text={text.text} locale={locale} />
    </section>}
    <dl className="hadith-reference">{(["grade", "attribution"] as const).map(key => text[key] ? <div key={key}><dt>{t(key)}</dt><dd dir="auto">{text[key]}</dd></div> : null)}</dl>
    {(["explanation", "benefits", "wordMeanings"] as const).map(key => text[key] ? <section key={key} id={anchors ? key : undefined} className="hadith-field">
      <h2>{t(key)}</h2>
      <SourcePassage text={text[key]} locale={locale} kind={key === "benefits" ? "benefits" : "prose"} />
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
