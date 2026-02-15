"use server";

import { createClient } from "@/lib/supabase/server";

export async function getCommunityStats() {
  const supabase = await createClient();

  const [eventsResult, juzResult, khatmsResult] = await Promise.all([
    supabase
      .from("events")
      .select("*", { count: "exact", head: true })
      .eq("is_archived", false),
    supabase
      .from("juzs")
      .select("*", { count: "exact", head: true })
      .neq("status", "unclaimed"),
    supabase
      .from("khatms")
      .select("*", { count: "exact", head: true })
      .eq("is_deleted", false),
  ]);

  return {
    totalCircles: eventsResult.count ?? 0,
    totalJuzClaimed: juzResult.count ?? 0,
    activeKhatms: khatmsResult.count ?? 0,
  };
}
