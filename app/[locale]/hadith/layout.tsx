import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { isHadithEnabled } from "@/lib/hadith/feature";
import { HadithSectionNav } from "@/components/hadith/section-nav";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("Hadith");
  return { title: t("title"), robots: { index: false, follow: false } };
}
export default async function HadithLayout({ children }: { children: React.ReactNode }) {
  if (!isHadithEnabled()) notFound();
  const t = await getTranslations("Hadith");
  return <main className="hadith-shell">
    <div className="hadith-masthead"><span className="hadith-wordmark">{t("library")}</span><span className="hadith-preview">{t("preview")}</span></div>
    <HadithSectionNav />
    {children}
  </main>;
}
