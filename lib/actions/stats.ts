"use server";

import { createClient } from "@/lib/supabase/server";

export async function getCommunityStats() {
  const supabase = await createClient();

  const { data, error } = await supabase.rpc("get_community_stats").single();
  const stats = data as
    | {
        total_circles: number;
        total_juz_claimed: number;
        khatms_completed: number;
      }
    | null;

  if (error || !stats) {
    return {
      totalCircles: 0,
      totalJuzClaimed: 0,
      khatmsCompleted: 0,
    };
  }

  return {
    totalCircles: Number(stats.total_circles ?? 0),
    totalJuzClaimed: Number(stats.total_juz_claimed ?? 0),
    khatmsCompleted: Number(stats.khatms_completed ?? 0),
  };
}
