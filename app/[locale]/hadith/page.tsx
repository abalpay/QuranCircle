import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { getTopics, getTopicPage } from "@/lib/hadith/repository";
import { assertLocale } from "@/lib/hadith/paths";

export default async function HadithHome({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params; assertLocale(locale);
  const [t, topics, all] = await Promise.all([getTranslations("Hadith"), getTopics(locale), getTopicPage(locale, "all", 1)]);
  return <>
    <header className="hadith-intro"><h1>{t("title")}</h1><p>{t("intro")}</p></header>
    <h2 className="hadith-label">{t("topics")}</h2>
    <ul className="hadith-topic-list">{topics.map(topic => <li key={topic.id}><Link href={`/hadith/topics/${topic.id}`}><span>{topic.title}</span><small>{t("entries", { count: topic.ids.length })}</small></Link></li>)}</ul>
    <Link className="hadith-link" href="/hadith/topics/all">{t("all")} · {t("entries", { count: all?.totalItems ?? 0 })}</Link>
  </>;
}
