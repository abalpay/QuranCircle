import type { MetadataRoute } from "next";
import { getSiteUrl } from "@/lib/site-url";

const FALLBACK_STATIC_LASTMOD = "2026-07-24T00:00:00.000Z";

function getStaticLastModified() {
  const value =
    process.env.NEXT_PUBLIC_SITEMAP_STATIC_LASTMOD ?? FALLBACK_STATIC_LASTMOD;
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return new Date(FALLBACK_STATIC_LASTMOD);
  }
  return parsed;
}

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const baseUrl = getSiteUrl();
  const staticLastModified = getStaticLastModified();

  const staticPages: MetadataRoute.Sitemap = [
    {
      url: baseUrl,
      lastModified: staticLastModified,
      changeFrequency: "daily",
      priority: 1,
    },
    {
      url: `${baseUrl}/browse`,
      lastModified: staticLastModified,
      changeFrequency: "daily",
      priority: 0.8,
    },
    {
      url: `${baseUrl}/khatm-coordination`,
      lastModified: staticLastModified,
      changeFrequency: "weekly",
      priority: 0.7,
    },
    {
      url: `${baseUrl}/group-khatm-whatsapp`,
      lastModified: staticLastModified,
      changeFrequency: "monthly",
      priority: 0.7,
    },
    {
      url: `${baseUrl}/ramadan-group-khatm`,
      lastModified: staticLastModified,
      changeFrequency: "monthly",
      priority: 0.7,
    },
    {
      url: `${baseUrl}/about`,
      lastModified: staticLastModified,
      changeFrequency: "monthly",
      priority: 0.4,
    },
    {
      url: `${baseUrl}/privacy`,
      lastModified: staticLastModified,
      changeFrequency: "monthly",
      priority: 0.4,
    },
    {
      url: `${baseUrl}/terms`,
      lastModified: staticLastModified,
      changeFrequency: "monthly",
      priority: 0.4,
    },
    {
      url: `${baseUrl}/contact`,
      lastModified: staticLastModified,
      changeFrequency: "monthly",
      priority: 0.4,
    },
  ];

  return staticPages;
}
