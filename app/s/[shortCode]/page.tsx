import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getEventByShortCode } from "@/lib/actions/events";
import KhatimPageClient from "@/components/khatim-page-client";
import { toAbsoluteUrl } from "@/lib/site-url";

const SNAPSHOT_WINDOW_KHATM_LIMIT = 3;

type PageProps = {
  params: Promise<{ shortCode: string }>;
};

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { shortCode } = await params;
  const event = await getEventByShortCode(shortCode, {
    khatmLimit: SNAPSHOT_WINDOW_KHATM_LIMIT,
  });
  if (!event) {
    notFound();
  }

  const description =
    event.description || `Join the ${event.name} Khatm circle on QuranCircle`;
  const url = toAbsoluteUrl(`/s/${shortCode}`);
  const ogVersion = new Date(event.created_at).getTime().toString(36);
  const ogImageUrl = toAbsoluteUrl(
    `/s/${shortCode}/opengraph-image?v=${ogVersion}`
  );

  return {
    title: event.name,
    description,
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

export default async function KhatimPage({
  params,
}: {
  params: Promise<{ shortCode: string }>;
}) {
  const { shortCode } = await params;
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
