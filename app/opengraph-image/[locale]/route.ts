import createOgImage from "@/lib/og-image";
import { routing } from "@/i18n/routing";

export const runtime = "nodejs";
export const dynamic = "force-static";
export const dynamicParams = false;

export function generateStaticParams() {
  return routing.locales.map((locale) => ({ locale }));
}

/** The home, guide and site pages' link preview, one card per locale (#104). */
export async function GET(_request: Request, { params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  return createOgImage(locale);
}
