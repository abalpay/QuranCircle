import type { MetadataRoute } from "next";
import { createClient } from "@/lib/supabase/server";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const baseUrl = "https://qurancircle.io";

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
  const { data: events } = await supabase
    .from("events")
    .select("short_code, created_at")
    .eq("is_public", true)
    .eq("is_archived", false);

  const eventPages: MetadataRoute.Sitemap = (events ?? []).map((event) => ({
    url: `${baseUrl}/s/${event.short_code}`,
    lastModified: new Date(event.created_at),
    changeFrequency: "daily" as const,
    priority: 0.6,
  }));

  return [...staticPages, ...eventPages];
}
