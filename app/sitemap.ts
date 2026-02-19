import type { MetadataRoute } from "next";
import { createClient } from "@/lib/supabase/server";
import { getSiteUrl } from "@/lib/site-url";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const baseUrl = getSiteUrl();

  const staticPages: MetadataRoute.Sitemap = [
    {
      url: baseUrl,
      lastModified: new Date(),
      changeFrequency: "daily",
      priority: 1,
    },
    {
      url: `${baseUrl}/browse`,
      lastModified: new Date(),
      changeFrequency: "daily",
      priority: 0.8,
    },
  ];

  const supabase = await createClient();
  const { data: events } = await supabase.rpc("list_public_events_for_sitemap");

  const eventPages: MetadataRoute.Sitemap = (events ?? []).map((event: { short_code: string; created_at: string }) => ({
    url: `${baseUrl}/s/${event.short_code}`,
    lastModified: new Date(event.created_at),
    changeFrequency: "daily" as const,
    priority: 0.6,
  }));

  return [...staticPages, ...eventPages];
}
