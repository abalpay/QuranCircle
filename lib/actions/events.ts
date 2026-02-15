"use server";

import { createClient } from "@/lib/supabase/server";
import { generateShortCode } from "@/lib/utils";
import { revalidatePath } from "next/cache";

export async function createEvent(formData: {
  name: string;
  description?: string;
  isPublic?: boolean;
  creatorToken?: string;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  let shortCode = generateShortCode(6);
  let attempts = 0;
  const maxAttempts = 10;

  while (attempts < maxAttempts) {
    const { data: existing } = await supabase
      .from("events")
      .select("id")
      .eq("short_code", shortCode)
      .single();
    if (!existing) break;
    shortCode = generateShortCode(6);
    attempts++;
  }

  const { data: event, error: eventError } = await supabase
    .from("events")
    .insert({
      name: formData.name,
      description: formData.description || null,
      is_public: formData.isPublic ?? false,
      created_by: user?.id ?? null,
      creator_token: formData.creatorToken ?? null,
      short_code: shortCode,
    })
    .select()
    .single();

  if (eventError) {
    return { error: eventError.message };
  }

  const { data: khatm, error: khatmError } = await supabase
    .from("khatms")
    .insert({
      event_id: event.id,
      khatm_number: 1,
    })
    .select()
    .single();

  if (khatmError) {
    return { error: khatmError.message };
  }

  const juzInserts = Array.from({ length: 30 }, (_, i) => ({
    khatm_id: khatm.id,
    juz_number: i + 1,
  }));

  const { error: juzError } = await supabase.from("juzs").insert(juzInserts);

  if (juzError) {
    return { error: juzError.message };
  }

  revalidatePath("/");
  revalidatePath("/browse");
  return { data: { event, shortCode } };
}

export async function getEventByShortCode(shortCode: string) {
  const supabase = await createClient();
  const { data: event, error } = await supabase
    .from("events")
    .select("*")
    .eq("short_code", shortCode)
    .eq("is_archived", false)
    .single();

  if (error || !event) {
    return null;
  }

  const { data: khatms } = await supabase
    .from("khatms")
    .select("*")
    .eq("event_id", event.id)
    .eq("is_deleted", false)
    .order("khatm_number", { ascending: true });

  if (!khatms?.length) {
    return { ...event, khatms: [] };
  }

  const khatmsWithJuzs = await Promise.all(
    khatms.map(async (k) => {
      const { data: juzs } = await supabase
        .from("juzs")
        .select("*")
        .eq("khatm_id", k.id)
        .order("juz_number", { ascending: true });
      const claimedCount = juzs?.filter((j) => j.status !== "unclaimed").length ?? 0;
      const readCount = juzs?.filter((j) => j.status === "read").length ?? 0;
      return {
        ...k,
        juzs: juzs ?? [],
        claimed_count: claimedCount,
        read_count: readCount,
      };
    })
  );

  return { ...event, khatms: khatmsWithJuzs };
}

export async function getPublicEvents() {
  const supabase = await createClient();
  const { data: events } = await supabase
    .from("events")
    .select("id, name, description, short_code, deadline, is_public, created_at")
    .eq("is_public", true)
    .eq("is_archived", false)
    .order("created_at", { ascending: false })
    .limit(50);

  if (!events?.length) {
    return [];
  }

  const withProgress = await Promise.all(
    events.map(async (e) => {
      const { data: khatms } = await supabase
        .from("khatms")
        .select("id")
        .eq("event_id", e.id)
        .eq("is_deleted", false);
      let claimed = 0;
      let total = 0;
      if (khatms) {
        for (const k of khatms) {
          const { count } = await supabase
            .from("juzs")
            .select("*", { count: "exact", head: true })
            .eq("khatm_id", k.id);
          const { count: claimedCount } = await supabase
            .from("juzs")
            .select("*", { count: "exact", head: true })
            .eq("khatm_id", k.id)
            .neq("status", "unclaimed");
          total += count ?? 0;
          claimed += claimedCount ?? 0;
        }
      }
      return { ...e, claimed, total: total || 30 };
    })
  );

  return withProgress;
}

export async function getUserEvents() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return [];

  const { data: events } = await supabase
    .from("events")
    .select("id, name, description, short_code, deadline, is_public, created_at, is_archived")
    .eq("created_by", user.id)
    .order("created_at", { ascending: false });

  if (!events?.length) return [];

  const withProgress = await Promise.all(
    events.map(async (e) => {
      const eventFull = await getEventByShortCode(e.short_code);
      const claimed = eventFull?.khatms?.[0]?.claimed_count ?? 0;
      const total = eventFull?.khatms?.[0]?.juzs?.length ?? 30;
      return { ...e, claimed, total };
    })
  );

  return withProgress;
}

export async function lockEvent(shortCode: string, creatorToken?: string) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  const { data: event } = await supabase
    .from("events")
    .select("id, created_by, creator_token")
    .eq("short_code", shortCode)
    .single();

  if (!event) return { error: "Event not found" };
  const isCreator =
    user?.id === event.created_by ||
    (creatorToken && event.creator_token === creatorToken);
  if (!isCreator) return { error: "Unauthorized" };

  await supabase
    .from("events")
    .update({ is_locked: true })
    .eq("id", event.id);

  revalidatePath(`/s/${shortCode}`);
  return {};
}

export async function unlockEvent(shortCode: string, creatorToken?: string) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  const { data: event } = await supabase
    .from("events")
    .select("id, created_by, creator_token")
    .eq("short_code", shortCode)
    .single();

  if (!event) return { error: "Event not found" };
  const isCreator =
    user?.id === event.created_by ||
    (creatorToken && event.creator_token === creatorToken);
  if (!isCreator) return { error: "Unauthorized" };

  await supabase
    .from("events")
    .update({ is_locked: false })
    .eq("id", event.id);

  revalidatePath(`/s/${shortCode}`);
  return {};
}
