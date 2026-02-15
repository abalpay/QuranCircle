import { getEventByShortCode } from "@/lib/actions/events";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const shortCode = searchParams.get("shortCode");
  if (!shortCode) {
    return NextResponse.json({ error: "Missing shortCode" }, { status: 400 });
  }
  const event = await getEventByShortCode(shortCode);
  if (!event) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  // Strip sensitive fields before sending to client
  const { creator_token, created_by, ...safeEvent } = event;
  const safeKhatms = safeEvent.khatms?.map(
    (k: Record<string, unknown> & { juzs?: Record<string, unknown>[] }) => ({
      ...k,
      juzs: k.juzs?.map(({ device_token, claimed_by_user_id, ...safeJuz }: Record<string, unknown>) => safeJuz),
    })
  );

  return NextResponse.json({ ...safeEvent, khatms: safeKhatms ?? [] });
}
