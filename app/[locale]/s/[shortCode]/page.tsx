import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { notFound } from "next/navigation";
import { getEventByShortCode } from "@/lib/actions/events";
import KhatimPageClient from "@/components/khatim-page-client";
import { toAbsoluteUrl } from "@/lib/site-url";
import { getPathname } from "@/i18n/navigation";
import type { AppLocale } from "@/i18n/routing";

const SNAPSHOT_WINDOW_KHATM_LIMIT = 3;

type PageProps = {
  params: Promise<{ locale: AppLocale; shortCode: string }>;
};

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { locale, shortCode } = await params;
  const t = await getTranslations({ locale, namespace: "CircleMetadata" });
  const event = await getEventByShortCode(shortCode, {
    khatmLimit: SNAPSHOT_WINDOW_KHATM_LIMIT,
  });
  if (!event) {
    notFound();
  }

  const description =
    event.description || t("description", { eventName: event.name });
  const pathname = getPathname({ locale, href: `/s/${shortCode}` });
  const url = toAbsoluteUrl(pathname);
  const ogVersion = new Date(event.created_at).getTime().toString(36);
  const ogImageUrl = toAbsoluteUrl(
    `${pathname}/opengraph-image?v=${ogVersion}`
  );

  return {
    title: event.name,
    description,
    robots: {
      index: false,
      follow: true,
      googleBot: {
        index: false,
        follow: true,
      },
    },
    alternates: {
      canonical: url,
    },
    openGraph: {
      title: `${event.name} - QuranCircle`,
      description,
      url,
      type: "website",
      images: [{ url: ogImageUrl, width: 1200, height: 630 }],
    },
    twitter: {
      card: "summary_large_image",
      title: `${event.name} - QuranCircle`,
      description,
      images: [ogImageUrl],
    },
  };
}

export default async function KhatimPage({ params }: PageProps) {
  const { locale, shortCode } = await params;
  setRequestLocale(locale);

  const event = await getEventByShortCode(shortCode, {
    khatmLimit: SNAPSHOT_WINDOW_KHATM_LIMIT,
  });

  if (!event) {
    notFound();
  }

  return (
    <main className="page-shell grow">
      <KhatimPageClient event={event} shortCode={shortCode} />
    </main>
  );
}
