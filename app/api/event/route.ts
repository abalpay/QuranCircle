import { getEventByShortCode } from "@/lib/actions/events";
import { NextResponse } from "next/server";

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
  return NextResponse.json(event);
}
