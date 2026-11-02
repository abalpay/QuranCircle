import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { notFound } from "next/navigation";
import { getEventByShortCode } from "@/lib/actions/events";
import KhatimPageClient from "@/components/khatim-page-client";
import { toAbsoluteUrl } from "@/lib/site-url";
import { getPathname } from "@/i18n/navigation";
import type { AppLocale } from "@/i18n/routing";
import { getOpenGraphLocale } from "@/i18n/locale-config";
import { getCircleOgState, getOgDescription, ogVersion } from "@/lib/circle-og";

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

  const state = getCircleOgState(event, event.name);
  const description = getOgDescription(state, event.description, (key, values) =>
    t(key, values)
  );
  const pathname = getPathname({ locale, href: `/s/${shortCode}` });
  const url = toAbsoluteUrl(pathname);
  // "Invitation to join" only fits an open circle; the other states describe where it stands.
  const imageAlt = state.status === "open" ? t("imageAlt", { eventName: event.name }) : description;
  // Everything the card shows feeds the version, so the preview refreshes when the state changes
  // (completed, full, archived, renamed) instead of serving a cached card.
  const latestKhatm = event.khatms[event.khatms.length - 1];
  const ogImageVersion = ogVersion(
    event.name,
    event.description,
    state.status,
    state.isPublic,
    state.completedKhatmNumber,
    latestKhatm?.khatm_number,
    event.created_at
  );
  // The image route lives under [locale] and the proxy does not rewrite *opengraph-image paths,
  // so the locale segment is always explicit, English included (#103).
  const ogImageUrl = toAbsoluteUrl(
    `/${locale}/s/${shortCode}/opengraph-image?v=${ogImageVersion}`
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
      siteName: "QuranCircle",
      locale: getOpenGraphLocale(locale),
      images: [
        {
          url: ogImageUrl,
          width: 1200,
          height: 630,
          alt: imageAlt,
        },
      ],
    },
    twitter: {
      card: "summary_large_image",
      title: `${event.name} - QuranCircle`,
      description,
      images: [{ url: ogImageUrl, alt: imageAlt }],
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
