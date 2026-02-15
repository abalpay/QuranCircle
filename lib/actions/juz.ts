"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

const CLAIM_LIMIT_PER_DEVICE = 5;

function normalizeToken(token?: string): string | undefined {
  const trimmed = token?.trim();
  return trimmed || undefined;
}

export async function claimJuz(
  shortCode: string,
  khatmId: string,
  juzNumber: number,
  claimerName: string,
  deviceToken?: string
) {
  const supabase = await createClient();
  const normalizedToken = normalizeToken(deviceToken);

  const { data: event } = await supabase
    .from("events")
    .select("id, is_locked")
    .eq("short_code", shortCode)
    .single();

  if (!event) return { error: "Event not found" };
  if (event.is_locked) return { error: "This Khatim is locked" };

  if (normalizedToken) {
    const { count } = await supabase
      .from("juzs")
      .select("*", { count: "exact", head: true })
      .eq("khatm_id", khatmId)
      .eq("device_token", normalizedToken);

    if ((count ?? 0) >= CLAIM_LIMIT_PER_DEVICE) {
      return { error: `You can only claim up to ${CLAIM_LIMIT_PER_DEVICE} Juz per Khatim` };
    }
  }

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: juz } = await supabase
    .from("juzs")
    .select("id, status")
    .eq("khatm_id", khatmId)
    .eq("juz_number", juzNumber)
    .single();

  if (!juz) return { error: "Juz not found" };
  if (juz.status !== "unclaimed") return { error: "Juz already claimed" };

  const { error } = await supabase
    .from("juzs")
    .update({
      claimed_by_name: claimerName,
      claimed_by_user_id: user?.id ?? null,
      device_token: normalizedToken ?? null,
      status: "claimed",
      claimed_at: new Date().toISOString(),
    })
    .eq("id", juz.id);

  if (error) return { error: error.message };

  revalidatePath(`/s/${shortCode}`);
  return {};
}

export async function claimMultipleJuz(
  shortCode: string,
  khatmId: string,
  juzNumbers: number[],
  claimerName: string,
  deviceToken?: string
) {
  const supabase = await createClient();
  const normalizedToken = normalizeToken(deviceToken);

  const { data: event } = await supabase
    .from("events")
    .select("id, is_locked")
    .eq("short_code", shortCode)
    .single();

  if (!event) return { error: "Event not found" };
  if (event.is_locked) return { error: "This Khatim is locked" };

  if (normalizedToken) {
    const { count } = await supabase
      .from("juzs")
      .select("*", { count: "exact", head: true })
      .eq("khatm_id", khatmId)
      .eq("device_token", normalizedToken);

    const afterClaim = (count ?? 0) + juzNumbers.length;
    if (afterClaim > CLAIM_LIMIT_PER_DEVICE) {
      return {
        error: `You can only claim up to ${CLAIM_LIMIT_PER_DEVICE} Juz per Khatim. You have ${count ?? 0} claimed.`,
      };
    }
  }

  const {
    data: { user },
  } = await supabase.auth.getUser();

  for (const juzNumber of juzNumbers) {
    await supabase
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
      .eq("status", "unclaimed");
  }

  revalidatePath(`/s/${shortCode}`);
  return {};
}

export async function unclaimJuz(
  shortCode: string,
  juzId: string,
  deviceToken?: string,
  creatorToken?: string
) {
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

  if (error) return { error: error.message };

  revalidatePath(`/s/${shortCode}`);
  return {};
}

export async function unmarkJuzAsRead(
  shortCode: string,
  juzId: string,
  deviceToken?: string,
  creatorToken?: string
) {
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

  if (error) return { error: error.message };

  revalidatePath(`/s/${shortCode}`);
  return {};
}
