import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { isHadithEnabled } from "@/lib/hadith/feature";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("Hadith");
  return { title: t("title"), robots: { index: false, follow: false } };
}
export default async function HadithLayout({ children }: { children: React.ReactNode }) {
  if (!isHadithEnabled()) notFound();
  const t = await getTranslations("Hadith");
  return <main className="hadith-shell">
    <p className="hadith-preview">{t("preview")}</p>
    <nav className="hadith-actions hadith-section-nav" aria-label={t("title")}>
      <Link href="/hadith">{t("topics")}</Link><Link href="/hadith/topics/all">{t("all")}</Link><Link href="/hadith/saved">{t("saved")}</Link><Link href="/hadith/sources">{t("sources")}</Link>
    </nav>
    {children}
  </main>;
}
