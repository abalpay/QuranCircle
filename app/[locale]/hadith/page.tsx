import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { getTopics, getTopicPage } from "@/lib/hadith/repository";
import { assertLocale } from "@/lib/hadith/paths";

import { requireHadithEnabled } from "@/lib/hadith/guard";
export default async function HadithHome({ params }: { params: Promise<{ locale: string }> }) {
  requireHadithEnabled();
  const { locale } = await params; assertLocale(locale);
  const [t, topics, all] = await Promise.all([getTranslations("Hadith"), getTopics(locale), getTopicPage(locale, "all", 1)]);
  return <>
    <header className="hadith-intro"><p className="hadith-eyebrow">{t("collection")}</p><h1>{t("libraryIntro")}</h1><p>{t("browseIntro")}</p><Link className="hadith-primary-link" href="/hadith/topics/all">{t("all")} <span aria-hidden="true">→</span></Link></header>
    <div className="hadith-list-heading"><h2>{t("topics")}</h2><p>{t("topicCount", { count: topics.length })}</p></div>
    <ul className="hadith-topic-list">{topics.map((topic, index) => <li key={topic.id}><Link href={`/hadith/topics/${topic.id}`}><span className="hadith-topic-number" aria-hidden="true">{String(index + 1).padStart(2, "0")}</span><span className="hadith-topic-copy"><span>{topic.title}</span><small>{t("entries", { count: topic.ids.length })}</small></span><span className="hadith-arrow" aria-hidden="true">↗</span></Link></li>)}</ul>
    <div className="hadith-collection-note"><p>{t("entries", { count: all?.totalItems ?? 0 })} · {t("sourceCredit")}: <a href="https://hadeethenc.com/en/home">HadeethEnc</a></p><Link className="hadith-link" href="/hadith/sources">{t("sources")}</Link></div>
  </>;
}
