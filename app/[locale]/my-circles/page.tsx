import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import MyCirclesContent from "@/components/my-circles-content";
import type { LocalePageProps } from "@/i18n/routing";

export async function generateMetadata({
  params,
}: LocalePageProps): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "MyCircles" });

  return {
    title: t("title"),
    description: t("description"),
    robots: { index: false, follow: false, nocache: true },
  };
}

export default async function MyCirclesPage({ params }: LocalePageProps) {
  const { locale } = await params;
  setRequestLocale(locale);

  return (
    <main className="page-shell grow">
      <MyCirclesContent />
    </main>
  );
}
