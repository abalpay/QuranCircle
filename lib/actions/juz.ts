"use server";

import { createClient } from "@/lib/supabase/server";
import type { SupabaseClient } from "@supabase/supabase-js";
import { revalidatePath } from "next/cache";
import { z } from "zod";

const shortCodeSchema = z.string().min(1).max(20).regex(/^[A-Za-z0-9]+$/);
const uuidSchema = z.string().uuid();
const claimerNameSchema = z.string().min(1).max(100).trim();
const juzNumberSchema = z.number().int().min(1).max(30);
const juzNumbersSchema = z.array(juzNumberSchema).min(1).max(30);
const tokenSchema = z.string().max(255).optional();

function normalizeToken(token?: string): string | undefined {
  const trimmed = token?.trim();
  return trimmed || undefined;
}

async function createNextKhatm(
  supabase: SupabaseClient,
  eventId: string,
  currentKhatmNumber: number
): Promise<{ khatmId: string; khatmNumber: number } | null> {
  const nextNumber = currentKhatmNumber + 1;

  // Race guard: check if next khatm already exists
  const { data: existing } = await supabase
    .from("khatms")
    .select("id, khatm_number")
    .eq("event_id", eventId)
    .eq("khatm_number", nextNumber)
    .eq("is_deleted", false)
    .single();

  if (existing) {
    return { khatmId: existing.id, khatmNumber: existing.khatm_number };
  }

  // Insert new khatm
  const { data: khatm, error: khatmError } = await supabase
    .from("khatms")
    .insert({ event_id: eventId, khatm_number: nextNumber })
    .select()
    .single();

  if (khatmError) {
    // Unique constraint violation from concurrent request — fetch the winner's khatm
    if (khatmError.code === "23505") {
      const { data: winner } = await supabase
        .from("khatms")
        .select("id, khatm_number")
        .eq("event_id", eventId)
        .eq("khatm_number", nextNumber)
        .eq("is_deleted", false)
        .single();
      if (winner) {
        return { khatmId: winner.id, khatmNumber: winner.khatm_number };
      }
    }
    return null;
  }

  // Insert 30 unclaimed juz for the new khatm
  const juzInserts = Array.from({ length: 30 }, (_, i) => ({
    khatm_id: khatm.id,
    juz_number: i + 1,
  }));

  await supabase.from("juzs").insert(juzInserts);

  return { khatmId: khatm.id, khatmNumber: khatm.khatm_number };
}

export async function claimJuz(
  shortCode: string,
  khatmId: string,
  juzNumber: number,
  claimerName: string,
  deviceToken?: string
) {
  const parsed = z
    .object({
      shortCode: shortCodeSchema,
      khatmId: uuidSchema,
      juzNumber: juzNumberSchema,
      claimerName: claimerNameSchema,
      deviceToken: tokenSchema,
    })
    .safeParse({ shortCode, khatmId, juzNumber, claimerName, deviceToken });
  if (!parsed.success) return { error: "Invalid input" };

  const supabase = await createClient();
  const normalizedToken = normalizeToken(parsed.data.deviceToken);

  const { data: event } = await supabase
    .from("events")
    .select("id, is_locked")
    .eq("short_code", shortCode)
    .single();

  if (!event) return { error: "Event not found" };
  if (event.is_locked) return { error: "This Khatim is locked" };

  const {
    data: { user },
  } = await supabase.auth.getUser();

  // Atomic update: WHERE status = 'unclaimed' prevents race conditions
  const { data: updated, error } = await supabase
    .from("juzs")
    .update({
      claimed_by_name: claimerName,
      claimed_by_user_id: user?.id ?? null,
      device_token: normalizedToken ?? null,
      status: "claimed",
      claimed_at: new Date().toISOString(),
    })
    .eq("khatm_id", khatmId)
    .eq("juz_number", juzNumber)
    .eq("status", "unclaimed")
    .select("id");

  if (error) return { error: "Failed to claim juz. Please try again." };
  if (!updated?.length) return { error: "Juz already claimed" };

  // Check if all juz in this khatm are now claimed → auto-create next khatm
  let newKhatmCreated = false;
  const { count: unclaimed } = await supabase
    .from("juzs")
    .select("*", { count: "exact", head: true })
    .eq("khatm_id", khatmId)
    .eq("status", "unclaimed");

  if (unclaimed === 0) {
    const { data: khatm } = await supabase
      .from("khatms")
      .select("event_id, khatm_number")
      .eq("id", khatmId)
      .single();

    if (khatm) {
      const result = await createNextKhatm(supabase, khatm.event_id, khatm.khatm_number);
      if (result) newKhatmCreated = true;
    }
  }

  revalidatePath(`/s/${shortCode}`);
  return { newKhatmCreated };
}

export async function claimMultipleJuz(
  shortCode: string,
  khatmId: string,
  juzNumbers: number[],
  claimerName: string,
  deviceToken?: string
) {
  const parsed = z
    .object({
      shortCode: shortCodeSchema,
      khatmId: uuidSchema,
      juzNumbers: juzNumbersSchema,
      claimerName: claimerNameSchema,
      deviceToken: tokenSchema,
    })
    .safeParse({ shortCode, khatmId, juzNumbers, claimerName, deviceToken });
  if (!parsed.success) return { error: "Invalid input" };

  const supabase = await createClient();
  const normalizedToken = normalizeToken(parsed.data.deviceToken);

  const { data: event } = await supabase
    .from("events")
    .select("id, is_locked")
    .eq("short_code", shortCode)
    .single();

  if (!event) return { error: "Event not found" };
  if (event.is_locked) return { error: "This Khatim is locked" };

  const {
    data: { user },
  } = await supabase.auth.getUser();

  // Track which juz were actually claimed (WHERE status = 'unclaimed' prevents races)
  const claimed: number[] = [];
  const failed: number[] = [];

  for (const juzNumber of juzNumbers) {
    const { data: updated } = await supabase
      .from("juzs")
      .update({
        claimed_by_name: claimerName,
        claimed_by_user_id: user?.id ?? null,
        device_token: normalizedToken ?? null,
        status: "claimed",
        claimed_at: new Date().toISOString(),
      })
      .eq("khatm_id", khatmId)
      .eq("juz_number", juzNumber)
      .eq("status", "unclaimed")
      .select("id");

    if (updated?.length) {
      claimed.push(juzNumber);
    } else {
      failed.push(juzNumber);
    }
  }

  if (claimed.length === 0) {
    return { error: "All selected juz were already claimed by someone else" };
  }

  // Check if all juz in this khatm are now claimed → auto-create next khatm
  let newKhatmCreated = false;
  const { count: unclaimed } = await supabase
    .from("juzs")
    .select("*", { count: "exact", head: true })
    .eq("khatm_id", khatmId)
    .eq("status", "unclaimed");

  if (unclaimed === 0) {
    const { data: khatm } = await supabase
      .from("khatms")
      .select("event_id, khatm_number")
      .eq("id", khatmId)
      .single();

    if (khatm) {
      const result = await createNextKhatm(supabase, khatm.event_id, khatm.khatm_number);
      if (result) newKhatmCreated = true;
    }
  }

  revalidatePath(`/s/${shortCode}`);

  if (failed.length > 0) {
    return {
      newKhatmCreated,
      claimed,
      failed,
      partialError: `Juz ${failed.join(", ")} already claimed by someone else`,
    };
  }

  return { newKhatmCreated, claimed };
}

export async function unclaimJuz(
  shortCode: string,
  juzId: string,
  deviceToken?: string,
  creatorToken?: string
) {
  const parsed = z
    .object({
      shortCode: shortCodeSchema,
      juzId: uuidSchema,
      deviceToken: tokenSchema,
      creatorToken: tokenSchema,
    })
    .safeParse({ shortCode, juzId, deviceToken, creatorToken });
  if (!parsed.success) return { error: "Invalid input" };

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: juz } = await supabase
    .from("juzs")
    .select("id, khatm_id, claimed_by_user_id, device_token")
    .eq("id", juzId)
    .single();

  if (!juz) return { error: "Juz not found" };

  const { data: khatm } = await supabase
    .from("khatms")
    .select("event_id")
    .eq("id", juz.khatm_id)
    .single();

  if (!khatm) return { error: "Khatm not found" };

  const { data: event } = await supabase
    .from("events")
    .select("created_by, creator_token")
    .eq("id", khatm.event_id)
    .single();

  const isCreator =
    (user?.id && user.id === event?.created_by) ||
    (creatorToken && event?.creator_token && creatorToken === event.creator_token);
  const isClaimer =
    (user?.id && user.id === juz.claimed_by_user_id) ||
    (deviceToken && juz.device_token && deviceToken === juz.device_token);

  if (!isCreator && !isClaimer) {
    return { error: "Only the claimer or event creator can unclaim" };
  }

  await supabase
    .from("juzs")
    .update({
      claimed_by_name: null,
      claimed_by_user_id: null,
      device_token: null,
      status: "unclaimed",
      claimed_at: null,
      read_at: null,
    })
    .eq("id", juzId);

  revalidatePath(`/s/${shortCode}`);
  return {};
}

export async function markJuzAsRead(
  shortCode: string,
  juzId: string,
  deviceToken?: string,
  creatorToken?: string
) {
  const parsed = z
    .object({
      shortCode: shortCodeSchema,
      juzId: uuidSchema,
      deviceToken: tokenSchema,
      creatorToken: tokenSchema,
    })
    .safeParse({ shortCode, juzId, deviceToken, creatorToken });
  if (!parsed.success) return { error: "Invalid input" };

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: juz } = await supabase
    .from("juzs")
    .select("id, khatm_id, status, claimed_by_user_id, device_token")
    .eq("id", juzId)
    .single();

  if (!juz) return { error: "Juz not found" };
  if (juz.status !== "claimed") return { error: "Juz must be claimed before marking as read" };

  const { data: khatm } = await supabase
    .from("khatms")
    .select("event_id")
    .eq("id", juz.khatm_id)
    .single();

  if (!khatm) return { error: "Khatm not found" };

  const { data: event } = await supabase
    .from("events")
    .select("created_by, creator_token")
    .eq("id", khatm.event_id)
    .single();

  const isCreator =
    (user?.id && user.id === event?.created_by) ||
    (creatorToken && event?.creator_token && creatorToken === event.creator_token);
  const isClaimer =
    (user?.id && user.id === juz.claimed_by_user_id) ||
    (deviceToken && juz.device_token && deviceToken === juz.device_token);

  if (!isCreator && !isClaimer) {
    return { error: "Only the claimer or event creator can mark as read" };
  }

  const { error } = await supabase
    .from("juzs")
    .update({
      status: "read",
      read_at: new Date().toISOString(),
    })
    .eq("id", juzId);

  if (error) return { error: "Failed to mark juz as read. Please try again." };

  revalidatePath(`/s/${shortCode}`);
  return {};
}

export async function unmarkJuzAsRead(
  shortCode: string,
  juzId: string,
  deviceToken?: string,
  creatorToken?: string
) {
  const parsed = z
    .object({
      shortCode: shortCodeSchema,
      juzId: uuidSchema,
      deviceToken: tokenSchema,
      creatorToken: tokenSchema,
    })
    .safeParse({ shortCode, juzId, deviceToken, creatorToken });
  if (!parsed.success) return { error: "Invalid input" };

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: juz } = await supabase
    .from("juzs")
    .select("id, khatm_id, status, claimed_by_user_id, device_token")
    .eq("id", juzId)
    .single();

  if (!juz) return { error: "Juz not found" };
  if (juz.status !== "read") return { error: "Juz is not marked as read" };

  const { data: khatm } = await supabase
    .from("khatms")
    .select("event_id")
    .eq("id", juz.khatm_id)
    .single();

  if (!khatm) return { error: "Khatm not found" };

  const { data: event } = await supabase
    .from("events")
    .select("created_by, creator_token")
    .eq("id", khatm.event_id)
    .single();

  const isCreator =
    (user?.id && user.id === event?.created_by) ||
    (creatorToken && event?.creator_token && creatorToken === event.creator_token);
  const isClaimer =
    (user?.id && user.id === juz.claimed_by_user_id) ||
    (deviceToken && juz.device_token && deviceToken === juz.device_token);

  if (!isCreator && !isClaimer) {
    return { error: "Only the claimer or event creator can unmark as read" };
  }

  const { error } = await supabase
    .from("juzs")
    .update({
      status: "claimed",
      read_at: null,
    })
    .eq("id", juzId);

  if (error) return { error: "Failed to update juz status. Please try again." };

  revalidatePath(`/s/${shortCode}`);
  return {};
}
