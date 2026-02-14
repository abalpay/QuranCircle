import { notFound } from "next/navigation";
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

  return (
    <main className="page-shell flex-grow">
      <KhatimPageClient event={event} shortCode={shortCode} />
    </main>
  );
}
