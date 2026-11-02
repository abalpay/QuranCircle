import type { Metadata } from "next";
import { setRequestLocale } from "next-intl/server";
import CircleNotFound from "@/components/circle-not-found";
import type { LocalePageProps } from "@/i18n/routing";

// Target of the proxy rewrite for unknown circle links (status 404 is set there).
export const metadata: Metadata = { robots: { index: false, follow: false } };

export default async function CircleNotFoundPage({ params }: LocalePageProps) {
  setRequestLocale((await params).locale);
  return <CircleNotFound />;
}
