import type { Metadata } from "next";
import type { AppLocale } from "@/i18n/routing";
import { getOpenGraphLocale } from "@/i18n/locale-config";
import { BRAND_SOCIAL_IMAGE_PATH } from "@/lib/brand";
import { toAbsoluteUrl } from "@/lib/site-url";

type SocialMetadataInput = {
  locale: AppLocale;
  title: string;
  description: string;
  /** Localized path or URL of the page (resolved against metadataBase). */
  url: string;
  type?: "website" | "article";
  imageAlt?: string;
  twitterTitle?: string;
  twitterDescription?: string;
};

/**
 * A page-level openGraph or twitter object replaces the layout's whole object, so every public page
 * repeats the image, og:locale, og:site_name and the large twitter card here (#104).
 */
export function socialMetadata({
  locale,
  title,
  description,
  url,
  type = "website",
  imageAlt = "QuranCircle",
  twitterTitle,
  twitterDescription,
}: SocialMetadataInput): Pick<Metadata, "openGraph" | "twitter"> {
  // One card per locale: /opengraph-image/{locale} (proxy.ts leaves *opengraph-image paths alone).
  const image = toAbsoluteUrl(`${BRAND_SOCIAL_IMAGE_PATH}/${locale}`);
  return {
    openGraph: {
      type,
      locale: getOpenGraphLocale(locale),
      siteName: "QuranCircle",
      title,
      description,
      url,
      images: [{ url: image, width: 1200, height: 630, alt: imageAlt }],
    },
    twitter: {
      card: "summary_large_image",
      title: twitterTitle ?? title,
      description: twitterDescription ?? description,
      images: [{ url: image, alt: imageAlt }],
    },
  };
}
