import { notFound } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { localeConfig } from "@/i18n/locale-config";
import { getReader, getTopicPage } from "@/lib/hadith/repository";
import { assertLocale, hadithPath } from "@/lib/hadith/paths";
import { ReaderControls } from "@/components/hadith/reader-controls";
import { SourceText, SourceDetails } from "@/components/hadith/source-text";
import { SourcePassage } from "@/components/hadith/source-passage";

import { requireHadithEnabled } from "@/lib/hadith/guard";
export default async function ReaderPage({ params, searchParams }: { params: Promise<{ locale: string; id: string }>; searchParams: Promise<{ topic?: string | string[]; page?: string | string[] }> }) {
  requireHadithEnabled();
  const [{ locale, id }, query] = await Promise.all([params, searchParams]); assertLocale(locale);
  if (!/^[0-9]+$/.test(id)) notFound();
  const [result, t] = await Promise.all([getReader(locale, id, typeof query.topic === "string" ? query.topic : undefined), getTranslations("Hadith")]);
  if (result.kind === "missing") notFound();
  const languageHref = typeof query.topic === "string" ? { pathname: hadithPath(id), query: { topic: query.topic } } : hadithPath(id);
  const languages = <nav className="hadith-languages" aria-label={t("languages")}>{result.locales.map(language => <Link key={language} locale={language} href={languageHref} lang={language} dir={localeConfig[language].direction} aria-current={language === locale ? "page" : undefined}>{localeConfig[language].label}</Link>)}</nav>;
  if (result.kind === "unavailable") return <><h1>{t("title")}</h1><p>{t("unavailableEdition")}</p>{languages}</>;
  const { document, edition, topicId } = result;
  // Keep a valid originating topic/page; untrusted or stale context falls back to the entry's page.
  let page = result.returnPage;
  if (query.topic === topicId && typeof query.page === "string" && /^[1-9][0-9]*$/.test(query.page) && Number.isSafeInteger(Number(query.page))) {
    const origin = await getTopicPage(locale, topicId, Number(query.page));
    if (origin?.page === Number(query.page)) page = origin.page;
  }
  const readerHref = (entryId: string) => ({ pathname: hadithPath(entryId), query: { topic: topicId, page } });
  const outline = <><a href="#narration">{t("narration")}</a>{(["explanation", "benefits", "wordMeanings"] as const).map(key => document.text[key] ? <a key={key} href={`#${key}`}>{t(key)}</a> : null)}<a href="#source">{t("sources")}</a></>;
  return <div className="hadith-reading-layout">
    <aside className="hadith-reading-rail">
      <Link className="hadith-link" href={{ pathname: `/hadith/topics/${topicId}`, query: { page } }}><span className="hadith-back-arrow" aria-hidden="true">←</span>{t("back")}</Link>
      <nav aria-label={t("onThisPage")}><p className="hadith-label">{t("onThisPage")}</p>{outline}</nav>
    </aside>
    <article className="hadith-reading-article">
    <a className="hadith-skip" href="#narration">{t("skipReader")}</a>
    <header className="hadith-reader-heading"><h1 className="hadith-reader-title" data-long-title={document.text.title.length > 160 || undefined} lang={locale}>{document.text.title}</h1>{languages}</header>
    <details className="hadith-mobile-outline"><summary>{t("onThisPage")}</summary><nav aria-label={t("onThisPage")}>{outline}</nav></details>
    <ReaderControls key={`${locale}:${id}`} hasArabic={!!document.arabic} entry={{ id, title: document.text.title, locale, version: document.editionVersion }}>
      {document.arabic && <section className="hadith-original" lang="ar" dir="rtl"><h2 className="hadith-label">{t("arabicText")}</h2><SourcePassage text={document.arabic.text} locale="ar" /></section>}
      <SourceText text={document.text} locale={locale} title={false} anchors />
      <div id="source"><SourceDetails edition={edition} sourceUrl={document.sourceUrl}>
        {document.arabic && <section className="hadith-source-supplement"><h2 className="hadith-label">{t("arabicMetadata")}</h2><SourceText text={document.arabic} locale="ar" includeText={false} /></section>}
      </SourceDetails></div>
    </ReaderControls>
    <nav className="hadith-pagination" aria-label={t("title")}>
      {result.previousId ? <Link href={readerHref(result.previousId)}>{t("previous")}</Link> : <span />}
      {result.nextId ? <Link href={readerHref(result.nextId)}>{t("next")}</Link> : <span />}
    </nav>
    </article>
  </div>;
}
