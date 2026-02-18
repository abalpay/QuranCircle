"use server";

import { createClient } from "@/lib/supabase/server";
import {
  SHORT_CODE_MAX_LENGTH,
  SHORT_CODE_MIN_LENGTH,
  SHORT_CODE_REGEX,
} from "@/lib/constants/short-code";
import { generateShortCode } from "@/lib/utils";
import type { EventSnapshot, PublicEventWithProgress } from "@/lib/types/events";
import { revalidatePath } from "next/cache";
import { z } from "zod";

const shortCodeSchema = z
  .string()
  .min(SHORT_CODE_MIN_LENGTH)
  .max(SHORT_CODE_MAX_LENGTH)
  .regex(SHORT_CODE_REGEX);

const createEventSchema = z.object({
  name: z.string().min(1).max(200).trim(),
  description: z.string().max(2000).trim().optional(),
  isPublic: z.boolean().optional(),
});

function isAnonymousUser(user: { is_anonymous?: boolean } | null | undefined) {
  return Boolean(user?.is_anonymous);
}

function isShortCodeCollision(error: { code?: string; message?: string } | null) {
  if (!error) return false;
  return (
    error.code === "23505" ||
    (error.message ?? "").toLowerCase().includes("short_code")
  );
}

function logUserEventsError(
  step: string,
  error: {
    code?: string;
    message?: string;
    details?: string | null;
    hint?: string | null;
  } | null,
  context: Record<string, unknown> = {}
) {
  if (!error) return;
  console.error("[getUserEvents] query failed", {
    step,
    code: error.code,
    message: error.message,
    details: error.details ?? null,
    hint: error.hint ?? null,
    ...context,
  });
}

export async function createEvent(formData: {
  name: string;
  description?: string;
  isPublic?: boolean;
}) {
  const parsed = createEventSchema.safeParse(formData);
  if (!parsed.success) return { error: "Invalid input" };
  const { name, description, isPublic } = parsed.data;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user || isAnonymousUser(user)) {
    return { error: "Sign in required to create a circle." };
  }

  const maxAttempts = 10;
  let shortCode = generateShortCode(8);

  for (let attempts = 0; attempts < maxAttempts; attempts++) {
    const { data, error } = await supabase
      .rpc("create_event_with_initial_khatm", {
        p_name: name,
        p_description: description || null,
        p_is_public: isPublic ?? false,
        p_short_code: shortCode,
      })
      .single();

    const createdEvent = data as { event_id: string; short_code: string } | null;

    if (!error && createdEvent) {
      revalidatePath("/");
      revalidatePath("/browse");
      return {
        data: {
          eventId: createdEvent.event_id,
          shortCode: createdEvent.short_code,
        },
      };
    }

    if (isShortCodeCollision(error)) {
      shortCode = generateShortCode(8);
      continue;
    }

    return { error: error?.message ?? "Failed to create event. Please try again." };
  }

  return { error: "Failed to create a unique link. Please try again." };
}

export async function getEventByShortCode(shortCode: string): Promise<EventSnapshot | null> {
  if (!shortCodeSchema.safeParse(shortCode).success) return null;

  const supabase = await createClient();
  const { data, error } = await supabase.rpc("get_event_snapshot_by_shortcode", {
    p_short_code: shortCode,
  });

  if (error || !data) {
    return null;
  }

  return data as EventSnapshot;
}

export async function ensureEventMembershipForShortCode(shortCode: string) {
  if (!shortCodeSchema.safeParse(shortCode).success) {
    return { error: "Invalid input" };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { error: "Active session required" };
  }

  const { data, error } = await supabase.rpc("ensure_event_membership", {
    p_short_code: shortCode,
  });

  if (error) {
    return { error: error.message || "Failed to initialize event membership" };
  }

  if (!data) {
    return { error: "Event not found" };
  }

  return {};
}

export async function getPublicEvents(): Promise<PublicEventWithProgress[]> {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("list_public_events_with_progress", {
    p_limit: 50,
  });

  if (error || !data) {
    return [];
  }

  return (data as PublicEventWithProgress[]).map((event) => ({
    ...event,
    claimed: Number(event.claimed ?? 0),
    total: Number(event.total ?? 30),
  }));
}

export async function getUserEvents() {
  const supabase = await createClient();
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError) {
    console.error("[getUserEvents] auth.getUser failed", {
      code: userError.code,
      message: userError.message,
    });
    return [];
  }

  if (!user || isAnonymousUser(user)) return [];

  const { data, error } = await supabase.rpc("list_user_events_with_progress");

  if (error) {
    logUserEventsError("list_user_events_with_progress", error, {
      userId: user.id,
    });
    return [];
  }

  if (!data) return [];

  return (
    data as Array<{
      id: string;
      name: string;
      description: string | null;
      short_code: string;
      deadline: string | null;
      is_public: boolean;
      created_at: string;
      is_archived: boolean;
      claimed: number;
      total: number;
    }>
  ).map((event) => ({
    ...event,
    claimed: Number(event.claimed ?? 0),
    total: Number(event.total ?? 30),
  }));
}

async function runEventMutation(
  shortCode: string,
  rpcName: "set_event_lock" | "set_event_archive" | "delete_event_by_shortcode",
  args: Record<string, unknown> = {}
) {
  if (!shortCodeSchema.safeParse(shortCode).success) return { error: "Invalid input" };

  const supabase = await createClient();
  const { error } = await supabase.rpc(rpcName, {
    p_short_code: shortCode,
    ...args,
  });

  if (error) {
    return { error: error.message || "Request failed" };
  }

  return {};
}

export async function lockEvent(shortCode: string) {
  const result = await runEventMutation(shortCode, "set_event_lock", {
    p_is_locked: true,
  });
  if (result.error) return result;

  revalidatePath(`/s/${shortCode}`);
  return {};
}

export async function unlockEvent(shortCode: string) {
  const result = await runEventMutation(shortCode, "set_event_lock", {
    p_is_locked: false,
  });
  if (result.error) return result;

  revalidatePath(`/s/${shortCode}`);
  return {};
}

export async function archiveEvent(shortCode: string) {
  const result = await runEventMutation(shortCode, "set_event_archive", {
    p_is_archived: true,
  });
  if (result.error) return result;

  revalidatePath(`/s/${shortCode}`);
  revalidatePath("/");
  revalidatePath("/browse");
  return {};
}

export async function unarchiveEvent(shortCode: string) {
  const result = await runEventMutation(shortCode, "set_event_archive", {
    p_is_archived: false,
  });
  if (result.error) return result;

  revalidatePath(`/s/${shortCode}`);
  revalidatePath("/");
  revalidatePath("/browse");
  return {};
}

export async function deleteEvent(shortCode: string) {
  const result = await runEventMutation(shortCode, "delete_event_by_shortcode");
  if (result.error) return result;

  revalidatePath("/");
  revalidatePath("/browse");
  return {};
}
