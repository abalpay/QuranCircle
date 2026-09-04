import createOgImage from "@/lib/og-image";

export const runtime = "nodejs";
export const dynamic = "force-static";

export async function GET() {
  return createOgImage();
}
