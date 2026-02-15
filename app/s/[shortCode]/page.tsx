import { notFound } from "next/navigation";
import { cookies } from "next/headers";
import { getEventByShortCode } from "@/lib/actions/events";
import KhatimPageClient from "@/components/khatim-page-client";

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
