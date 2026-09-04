import { notFound } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { localeConfig } from "@/i18n/locale-config";
import { getReader, getTopicPage } from "@/lib/hadith/repository";
import { assertLocale, hadithPath } from "@/lib/hadith/paths";
import { ReaderControls } from "@/components/hadith/reader-controls";
import { SourceText, SourceDetails } from "@/components/hadith/source-text";

export default async function ReaderPage({ params, searchParams }: { params: Promise<{ locale: string; id: string }>; searchParams: Promise<{ topic?: string | string[]; page?: string | string[] }> }) {
  const [{ locale, id }, query] = await Promise.all([params, searchParams]); assertLocale(locale);
  if (!/^[0-9]+$/.test(id)) notFound();
  const [result, t] = await Promise.all([getReader(locale, id, typeof query.topic === "string" ? query.topic : undefined), getTranslations("Hadith")]);
  if (result.kind === "missing") notFound();
  const languages = <nav className="hadith-actions" aria-label={t("languages")}>{result.locales.map(language => <Link key={language} locale={language} href={hadithPath(id)} lang={language} dir={localeConfig[language].direction} aria-current={language === locale ? "page" : undefined}>{localeConfig[language].label}</Link>)}</nav>;
  if (result.kind === "unavailable") return <><h1>{t("title")}</h1><p>{t("unavailableEdition")}</p>{languages}</>;
  const { document, edition, topicId } = result;
  // Keep a valid originating topic/page; untrusted or stale context falls back to the entry's page.
  let page = result.returnPage;
  if (query.topic === topicId && typeof query.page === "string" && /^[1-9][0-9]*$/.test(query.page) && Number.isSafeInteger(Number(query.page))) {
    const origin = await getTopicPage(locale, topicId, Number(query.page));
    if (origin?.page === Number(query.page)) page = origin.page;
  }
  const readerHref = (entryId: string) => ({ pathname: hadithPath(entryId), query: { topic: topicId, page } });
  return <>
    <Link className="hadith-link" href={{ pathname: `/hadith/topics/${topicId}`, query: { page } }}>{t("back")}</Link>
    <h1 className="hadith-reader-title" lang={locale}>{document.text.title}</h1>
    {languages}
    <ReaderControls entry={{ id, title: document.text.title, locale, version: document.editionVersion }}>
      {document.arabic && <section className="hadith-source" lang="ar" dir="rtl"><p className="hadith-arabic" lang="ar">{document.arabic.text}</p></section>}
      <SourceText text={document.text} locale={locale} title={false} />
      {document.arabic && <details className="hadith-paired-details"><summary>{t("arabicMetadata")}</summary><SourceText text={document.arabic} locale="ar" includeText={false} /></details>}
      <SourceDetails edition={edition} sourceUrl={document.sourceUrl} />
    </ReaderControls>
    <nav className="hadith-pagination" aria-label={t("title")}>
      {result.previousId ? <Link href={readerHref(result.previousId)}>{t("previous")}</Link> : <span />}
      {result.nextId ? <Link href={readerHref(result.nextId)}>{t("next")}</Link> : <span />}
    </nav>
  </>;
}
