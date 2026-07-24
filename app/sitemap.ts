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
  const pages = [
    { path: "", changeFrequency: "daily", priority: 1 },
    { path: "/browse", changeFrequency: "daily", priority: 0.8 },
    {
      path: "/khatm-coordination",
      changeFrequency: "weekly",
      priority: 0.7,
    },
    {
      path: "/group-khatm-whatsapp",
      changeFrequency: "monthly",
      priority: 0.7,
    },
    {
      path: "/ramadan-group-khatm",
      changeFrequency: "monthly",
      priority: 0.7,
    },
    { path: "/about", changeFrequency: "monthly", priority: 0.4 },
    { path: "/privacy", changeFrequency: "monthly", priority: 0.4 },
    { path: "/terms", changeFrequency: "monthly", priority: 0.4 },
    { path: "/contact", changeFrequency: "monthly", priority: 0.4 },
  ] as const;

  return pages.flatMap(({ path, changeFrequency, priority }) => {
    const englishUrl = `${baseUrl}${path}`;
    const turkishUrl = `${baseUrl}/tr${path}`;
    const languages = { en: englishUrl, tr: turkishUrl };

    return [
      {
        url: englishUrl,
        lastModified: staticLastModified,
        changeFrequency,
        priority,
        alternates: { languages },
      },
      {
        url: turkishUrl,
        lastModified: staticLastModified,
        changeFrequency,
        priority,
        alternates: { languages },
      },
    ];
  });
}
