import { notFound } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { getTopicPage, HADITH_PAGE_SIZE } from "@/lib/hadith/repository";
import { assertLocale, hadithPath } from "@/lib/hadith/paths";

import { requireHadithEnabled } from "@/lib/hadith/guard";
export default async function TopicPage({ params, searchParams }: { params: Promise<{ locale: string; topicId: string }>; searchParams: Promise<{ page?: string | string[] }> }) {
  requireHadithEnabled();
  const [{ locale, topicId }, query] = await Promise.all([params, searchParams]); assertLocale(locale);
  if (query.page !== undefined && (typeof query.page !== "string" || !/^[1-9][0-9]*$/.test(query.page))) notFound();
  const page = query.page === undefined ? 1 : Number(query.page);
  if (!Number.isSafeInteger(page)) notFound();
  const [result, t] = await Promise.all([getTopicPage(locale, topicId, page), getTranslations("Hadith")]);
  if (!result || result.page !== page) notFound();
  const href = (next: number) => ({ pathname: `/hadith/topics/${topicId}`, query: { page: next } });
  return <>
    <h1>{topicId === "all" ? t("all") : result.topic.title}</h1>
    <p>{t("entries", { count: result.totalItems })}</p>
    <ol className="hadith-entry-list" start={(page - 1) * HADITH_PAGE_SIZE + 1}>{result.items.map(item => <li key={item.id}><Link href={{ pathname: hadithPath(item.id), query: { topic: topicId, page } }}>{item.title}</Link></li>)}</ol>
    <nav className="hadith-pagination" aria-label={t("page", { page, total: result.totalPages })}>
      {page > 1 ? <Link href={href(page - 1)}>{t("previous")}</Link> : <span />}
      <span>{t("page", { page, total: result.totalPages })}</span>
      {page < result.totalPages ? <Link href={href(page + 1)}>{t("next")}</Link> : <span />}
    </nav>
  </>;
}
