import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { cookies } from "next/headers";
import { getEventByShortCode } from "@/lib/actions/events";
import KhatimPageClient from "@/components/khatim-page-client";

type PageProps = {
  params: Promise<{ shortCode: string }>;
};

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { shortCode } = await params;
  const event = await getEventByShortCode(shortCode);
  if (!event) {
    return { title: "Circle Not Found" };
  }

  const description =
    event.description || `Join the ${event.name} Khatm circle on QuranCircle`;
  const url = `https://qurancircle.io/s/${shortCode}`;

  return {
    title: event.name,
    description,
    openGraph: {
      title: `${event.name} - QuranCircle`,
      description,
      url,
      type: "website",
    },
    twitter: {
      card: "summary_large_image",
      title: `${event.name} - QuranCircle`,
      description,
    },
  };
}

export default async function KhatimPage({
  params,
}: {
  params: Promise<{ shortCode: string }>;
}) {
  const { shortCode } = await params;
  const event = await getEventByShortCode(shortCode);

  if (!event) {
    notFound();
  }

  const cookieStore = await cookies();
  const deviceToken = cookieStore.get("quran_circle_device_token")?.value ?? "";
  const creatorToken = cookieStore.get("quran_circle_creator_token")?.value;

  return (
    <main className="page-shell grow">
      <KhatimPageClient
        event={event}
        shortCode={shortCode}
        deviceToken={deviceToken}
        creatorToken={creatorToken}
      />
    </main>
  );
}
