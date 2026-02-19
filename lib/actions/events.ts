"use server";

import { createClient } from "@/lib/supabase/server";
import {
  SHORT_CODE_MAX_LENGTH,
  SHORT_CODE_MIN_LENGTH,
  SHORT_CODE_REGEX,
} from "@/lib/constants/short-code";
import { generateShortCode } from "@/lib/utils";
import type {
  EventSnapshot,
  MyCircleWithProgress,
  PublicEventWithProgress,
} from "@/lib/types/events";
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

const EVENT_SNAPSHOT_DEFAULT_KHATM_LIMIT = 3;
const EVENT_SNAPSHOT_MAX_KHATM_LIMIT = 20;
const DEFAULT_PUBLIC_EVENTS_PAGE_SIZE = 24;
const MAX_PUBLIC_EVENTS_PAGE_SIZE = 100;

export type EventLookupErrorCode =
  | "invalid_short_code"
  | "invalid_cursor"
  | "not_found"
  | "upstream_error";

export type EventLookupResult =
  | { ok: true; data: EventSnapshot }
  | {
      ok: false;
      code: EventLookupErrorCode;
      message: string;
      status: number;
    };

export type EventSnapshotQuery = {
  khatmLimit?: number | null;
  beforeKhatmNumber?: number | null;
};

export type PublicEventsCursor = {
  createdAt: string;
  id: string;
};

export type PublicEventsPage = {
  events: PublicEventWithProgress[];
  hasMore: boolean;
  nextCursor: PublicEventsCursor | null;
};

function normalizeKhatmLimit(limit: number | null | undefined) {
  if (limit === null) return null;
  if (typeof limit !== "number" || !Number.isFinite(limit)) {
    return EVENT_SNAPSHOT_DEFAULT_KHATM_LIMIT;
  }
  return Math.max(1, Math.min(EVENT_SNAPSHOT_MAX_KHATM_LIMIT, Math.trunc(limit)));
}

function normalizePublicEventsLimit(limit: number | null | undefined) {
  if (typeof limit !== "number" || !Number.isFinite(limit)) {
    return DEFAULT_PUBLIC_EVENTS_PAGE_SIZE;
  }
  return Math.max(1, Math.min(MAX_PUBLIC_EVENTS_PAGE_SIZE, Math.trunc(limit)));
}

function isAnonymousUser(user: { is_anonymous?: boolean } | null | undefined) {
  return Boolean(user?.is_anonymous);
}

type RpcErrorLike = {
  code?: string;
  message?: string;
  details?: string | null;
  hint?: string | null;
};

function isShortCodeCollision(error: RpcErrorLike | null) {
  if (!error || error.code !== "23505") return false;

  const fingerprint = `${error.message ?? ""} ${error.details ?? ""} ${
    error.hint ?? ""
  }`.toLowerCase();

  return (
    fingerprint.includes("short_code") ||
    fingerprint.includes("events_short_code") ||
    fingerprint.includes("events_short_code_key")
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
  let lastShortCodeError: RpcErrorLike | null = null;

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
      revalidatePath("/my-circles");
      return {
        data: {
          eventId: createdEvent.event_id,
          shortCode: createdEvent.short_code,
        },
      };
    }

    if (isShortCodeCollision(error)) {
      lastShortCodeError = error;
      shortCode = generateShortCode(8);
      continue;
    }

    if (error) {
      console.error("[createEvent] create_event_with_initial_khatm failed", {
        code: error.code,
        message: error.message,
        details: error.details ?? null,
        hint: error.hint ?? null,
      });
    }
    return { error: error?.message ?? "Failed to create event. Please try again." };
  }

  console.error("[createEvent] exhausted short-code retries", {
    attempts: maxAttempts,
    code: lastShortCodeError?.code,
    message: lastShortCodeError?.message,
    details: lastShortCodeError?.details ?? null,
    hint: lastShortCodeError?.hint ?? null,
  });
  return { error: "Failed to create a unique link. Please try again." };
}

export async function getEventByShortCodeResult(
  shortCode: string,
  query: EventSnapshotQuery = {}
): Promise<EventLookupResult> {
  if (!shortCodeSchema.safeParse(shortCode).success) {
    return {
      ok: false,
      code: "invalid_short_code",
      message: "Invalid shortCode",
      status: 400,
    };
  }

  const beforeKhatmNumber =
    query.beforeKhatmNumber === null || query.beforeKhatmNumber === undefined
      ? null
      : Math.trunc(query.beforeKhatmNumber);
  if (beforeKhatmNumber !== null && beforeKhatmNumber < 1) {
    return {
      ok: false,
      code: "invalid_cursor",
      message: "Invalid beforeKhatmNumber",
      status: 400,
    };
  }

  const khatmLimit = normalizeKhatmLimit(query.khatmLimit);
  const supabase = await createClient();
  const rpcParams: Record<string, unknown> = {
    p_short_code: shortCode,
    p_khatm_limit: khatmLimit,
  };
  if (beforeKhatmNumber !== null) {
    rpcParams.p_before_khatm_number = beforeKhatmNumber;
  }

  const { data, error } = await supabase.rpc(
    "get_event_snapshot_by_shortcode",
    rpcParams
  );

  if (error) {
    console.error("[getEventByShortCodeResult] snapshot lookup failed", {
      shortCode,
      code: error.code,
      message: error.message,
      details: error.details ?? null,
      hint: error.hint ?? null,
    });
    return {
      ok: false,
      code: "upstream_error",
      message: "Failed to load event snapshot",
      status: 502,
    };
  }

  if (!data) {
    return {
      ok: false,
      code: "not_found",
      message: "Event not found",
      status: 404,
    };
  }

  return { ok: true, data: data as EventSnapshot };
}

export async function getEventByShortCode(
  shortCode: string,
  query: EventSnapshotQuery = {}
): Promise<EventSnapshot | null> {
  const result = await getEventByShortCodeResult(shortCode, query);
  if (!result.ok) return null;
  return result.data;
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

export async function getPublicEventsPage({
  limit = DEFAULT_PUBLIC_EVENTS_PAGE_SIZE,
  cursor = null,
}: {
  limit?: number;
  cursor?: PublicEventsCursor | null;
} = {}): Promise<PublicEventsPage> {
  const normalizedLimit = normalizePublicEventsLimit(limit);
  const queryLimit = normalizedLimit + 1;
  const supabase = await createClient();

  const rpcParams: Record<string, unknown> = {
    p_limit: queryLimit,
  };
  if (cursor) {
    rpcParams.p_before_created_at = cursor.createdAt;
    rpcParams.p_before_id = cursor.id;
  }

  const { data, error } = await supabase.rpc(
    "list_public_events_with_progress",
    rpcParams
  );

  if (error || !data) {
    if (error) {
      console.error("[getPublicEventsPage] list_public_events_with_progress failed", {
        code: error.code,
        message: error.message,
        details: error.details ?? null,
        hint: error.hint ?? null,
      });
    }
    return { events: [], hasMore: false, nextCursor: null };
  }

  const mapped = (data as PublicEventWithProgress[]).map((event) => ({
    ...event,
    claimed: Number(event.claimed ?? 0),
    total: Number(event.total ?? 30),
  }));

  const hasMore = mapped.length > normalizedLimit;
  const events = hasMore ? mapped.slice(0, normalizedLimit) : mapped;
  const lastEvent = hasMore ? events[events.length - 1] : null;

  return {
    events,
    hasMore,
    nextCursor:
      hasMore && lastEvent
        ? { createdAt: lastEvent.created_at, id: lastEvent.id }
        : null,
  };
}

export async function getPublicEvents(limit = 50): Promise<PublicEventWithProgress[]> {
  const page = await getPublicEventsPage({ limit });
  return page.events;
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

export async function getMyCircles(): Promise<MyCircleWithProgress[]> {
  const supabase = await createClient();
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError) {
    console.error("[getMyCircles] auth.getUser failed", {
      code: userError.code,
      message: userError.message,
    });
    return [];
  }

  if (!user) return [];

  const { data, error } = await supabase.rpc("list_my_circles_with_progress");

  if (error) {
    logUserEventsError("list_my_circles_with_progress", error, {
      userId: user.id,
      isAnonymous: isAnonymousUser(user),
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
      is_public: boolean;
      created_at: string;
      is_archived: boolean;
      archived_at: string | null;
      relation: "creator" | "participant";
      claimed: number;
      total: number;
      my_claimed: number;
      my_read: number;
      last_activity_at: string;
    }>
  ).map((circle) => ({
    ...circle,
    relation: circle.relation === "creator" ? "creator" : "participant",
    claimed: Number(circle.claimed ?? 0),
    total: Number(circle.total ?? 30),
    my_claimed: Number(circle.my_claimed ?? 0),
    my_read: Number(circle.my_read ?? 0),
    last_activity_at: circle.last_activity_at ?? circle.created_at,
  }));
}

async function runEventMutation(
  shortCode: string,
  rpcName: "set_event_archive" | "delete_event_by_shortcode",
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

export async function archiveEvent(shortCode: string) {
  const result = await runEventMutation(shortCode, "set_event_archive", {
    p_is_archived: true,
  });
  if (result.error) return result;

  revalidatePath(`/s/${shortCode}`);
  revalidatePath("/");
  revalidatePath("/browse");
  revalidatePath("/my-circles");
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
  revalidatePath("/my-circles");
  return {};
}

export async function deleteEvent(shortCode: string) {
  const result = await runEventMutation(shortCode, "delete_event_by_shortcode");
  if (result.error) return result;

  revalidatePath("/");
  revalidatePath("/browse");
  revalidatePath("/my-circles");
  return {};
}
