import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { redirect } from "@/i18n/navigation";
import AccountPageClient from "@/components/account-page-client";
import { createClient } from "@/lib/supabase/server";
import type { LocalePageProps } from "@/i18n/routing";

export async function generateMetadata({
  params,
}: LocalePageProps): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "AccountPage" });

  return {
    title: t("accountSettings"),
    description: t("description"),
    robots: { index: false, follow: false, nocache: true },
  };
}

export default async function AccountPage({ params }: LocalePageProps) {
  const { locale } = await params;
  setRequestLocale(locale);

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user || user.is_anonymous) {
    redirect({ href: "/", locale });
  }

  return <AccountPageClient />;
}
