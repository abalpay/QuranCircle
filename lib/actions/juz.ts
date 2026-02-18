"use server";

import { createClient } from "@/lib/supabase/server";
import {
  SHORT_CODE_MAX_LENGTH,
  SHORT_CODE_MIN_LENGTH,
  SHORT_CODE_REGEX,
} from "@/lib/constants/short-code";
import { revalidatePath } from "next/cache";
import { z } from "zod";

const shortCodeSchema = z
  .string()
  .min(SHORT_CODE_MIN_LENGTH)
  .max(SHORT_CODE_MAX_LENGTH)
  .regex(SHORT_CODE_REGEX);
const uuidSchema = z.string().uuid();
const claimerNameSchema = z.string().min(1).max(100).trim();
const juzNumberSchema = z.number().int().min(1).max(30);
const juzNumbersSchema = z.array(juzNumberSchema).min(1).max(30);

type ClaimBatchResult = {
  claimed?: number[];
  failed?: number[];
  new_khatm_created?: boolean;
};

function asNumberArray(value: unknown): number[] {
  if (!Array.isArray(value)) return [];
  return value
    .map((item) => Number(item))
    .filter((item) => Number.isInteger(item) && item >= 1 && item <= 30);
}

export async function claimJuz(
  shortCode: string,
  khatmId: string,
  juzNumber: number,
  claimerName: string
) {
  return claimMultipleJuz(shortCode, khatmId, [juzNumber], claimerName);
}

export async function claimMultipleJuz(
  shortCode: string,
  khatmId: string,
  juzNumbers: number[],
  claimerName: string
) {
  const parsed = z
    .object({
      shortCode: shortCodeSchema,
      khatmId: uuidSchema,
      juzNumbers: juzNumbersSchema,
      claimerName: claimerNameSchema,
    })
    .safeParse({ shortCode, khatmId, juzNumbers, claimerName });
  if (!parsed.success) return { error: "Invalid input" };

  const supabase = await createClient();
  const { data, error } = await supabase.rpc("claim_juz_batch", {
    p_short_code: parsed.data.shortCode,
    p_khatm_id: parsed.data.khatmId,
    p_juz_numbers: parsed.data.juzNumbers,
    p_claimer_name: parsed.data.claimerName,
  });

  if (error) {
    return { error: error.message || "Failed to claim juz. Please try again." };
  }

  const result = (data ?? {}) as ClaimBatchResult;
  const claimed = asNumberArray(result.claimed);
  const failed = asNumberArray(result.failed);
  const newKhatmCreated = Boolean(result.new_khatm_created);

  revalidatePath(`/s/${shortCode}`);

  if (failed.length > 0) {
    return {
      claimed,
      failed,
      newKhatmCreated,
      partialError: `Juz ${failed.join(", ")} already claimed by someone else`,
    };
  }

  return { claimed, newKhatmCreated };
}

export async function unclaimJuz(shortCode: string, juzId: string) {
  const parsed = z
    .object({
      shortCode: shortCodeSchema,
      juzId: uuidSchema,
    })
    .safeParse({ shortCode, juzId });
  if (!parsed.success) return { error: "Invalid input" };

  const supabase = await createClient();
  const { error } = await supabase.rpc("unclaim_juz", {
    p_short_code: parsed.data.shortCode,
    p_juz_id: parsed.data.juzId,
  });

  if (error) {
    return { error: error.message || "Failed to unclaim juz" };
  }

  revalidatePath(`/s/${shortCode}`);
  return {};
}

export async function markJuzAsRead(shortCode: string, juzId: string) {
  const parsed = z
    .object({
      shortCode: shortCodeSchema,
      juzId: uuidSchema,
    })
    .safeParse({ shortCode, juzId });
  if (!parsed.success) return { error: "Invalid input" };

  const supabase = await createClient();
  const { error } = await supabase.rpc("mark_juz_read", {
    p_short_code: parsed.data.shortCode,
    p_juz_id: parsed.data.juzId,
  });

  if (error) {
    return { error: error.message || "Failed to mark juz as read" };
  }

  revalidatePath(`/s/${shortCode}`);
  return {};
}

export async function unmarkJuzAsRead(shortCode: string, juzId: string) {
  const parsed = z
    .object({
      shortCode: shortCodeSchema,
      juzId: uuidSchema,
    })
    .safeParse({ shortCode, juzId });
  if (!parsed.success) return { error: "Invalid input" };

  const supabase = await createClient();
  const { error } = await supabase.rpc("unmark_juz_read", {
    p_short_code: parsed.data.shortCode,
    p_juz_id: parsed.data.juzId,
  });

  if (error) {
    return { error: error.message || "Failed to update juz status" };
  }

  revalidatePath(`/s/${shortCode}`);
  return {};
}
