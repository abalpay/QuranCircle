"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import type { RealtimePostgresChangesPayload } from "@supabase/supabase-js";
import { Button } from "@/components/ui/button";
import {
  Share2,
  Lock,
  Unlock,
  Globe2,
  Link2,
  ShieldCheck,
  ShieldAlert,
} from "lucide-react";
import { toast } from "sonner";
import KhatmCard from "@/components/khatm-card";
import { lockEvent, unlockEvent } from "@/lib/actions/events";
import { useAuth } from "@/hooks/use-auth";

const DEVICE_TOKEN_KEY = "quran_circle_device_token";

type EventData = {
  id: string;
  name: string;
  description: string | null;
  short_code: string;
  is_locked: boolean;
  is_public: boolean;
  created_by: string | null;
  creator_token: string | null;
  khatms: Array<{
    id: string;
    khatm_number: number;
    juzs: Array<{
      id: string;
      juz_number: number;
      status: string;
      claimed_by_name: string | null;
      claimed_by_user_id: string | null;
      device_token: string | null;
    }>;
    claimed_count: number;
  }>;
};

type Props = {
  event: EventData;
  shortCode: string;
  deviceToken: string;
  creatorToken?: string;
};

export default function KhatimPageClient({
  event: initialEvent,
  shortCode,
  deviceToken: initialDeviceToken,
  creatorToken,
}: Props) {
  const [event, setEvent] = useState(initialEvent);
  const [isLocking, setIsLocking] = useState(false);
  const [deviceToken, setDeviceToken] = useState(initialDeviceToken);

  // First-visit: generate device token after hydration if none exists
  useEffect(() => {
    if (deviceToken) return;
    const token = crypto.randomUUID();
    document.cookie = `${DEVICE_TOKEN_KEY}=${token}; path=/; max-age=31536000`;
    setDeviceToken(token);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps
  const khatmIds = event.khatms.map((k) => k.id).join(",");

  const refreshEvent = useCallback(async () => {
    try {
      const res = await fetch(`/api/event?shortCode=${shortCode}`);
      const data = await res.json();
      if (data && !data.error) setEvent(data);
    } catch {}
  }, [shortCode]);

  // Realtime subscription: use payload directly to update juz state
  const batchTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pendingUpdatesRef = useRef<Map<string, Record<string, unknown>>>(new Map());

  const flushRealtimeUpdates = useCallback(() => {
    const updates = new Map(pendingUpdatesRef.current);
    pendingUpdatesRef.current.clear();
    batchTimerRef.current = null;

    if (updates.size === 0) return;

    setEvent((prev) => ({
      ...prev,
      khatms: prev.khatms.map((khatm) => {
        let changed = false;
        const updatedJuzs = khatm.juzs.map((juz) => {
          const update = updates.get(juz.id);
          if (!update) return juz;
          changed = true;
          return {
            id: juz.id,
            juz_number: juz.juz_number,
            status: update.status as string,
            claimed_by_name: update.claimed_by_name as string | null,
            claimed_by_user_id: update.claimed_by_user_id as string | null,
            device_token: update.device_token as string | null,
          };
        });
        if (!changed) return khatm;
        return {
          ...khatm,
          juzs: updatedJuzs,
          claimed_count: updatedJuzs.filter((j) => j.status !== "unclaimed").length,
        };
      }),
    }));
  }, []);

  useEffect(() => {
    if (!khatmIds) return;

    const supabase = createClient();
    const channel = supabase
      .channel(`juzs-${shortCode}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "juzs",
          filter: `khatm_id=in.(${khatmIds})`,
        },
        (payload: RealtimePostgresChangesPayload<Record<string, unknown>>) => {
          if (payload.eventType === "DELETE") {
            refreshEvent();
            return;
          }
          const row = payload.new as Record<string, unknown>;
          if (row && typeof row.id === "string") {
            pendingUpdatesRef.current.set(row.id, row);
            if (!batchTimerRef.current) {
              batchTimerRef.current = setTimeout(flushRealtimeUpdates, 100);
            }
          }
        }
      )
      .subscribe((status, err) => {
        if (status === "SUBSCRIBED") {
          console.log("[QuranCircle] Realtime subscribed for", shortCode);
        }
        if (status === "CHANNEL_ERROR" || status === "TIMED_OUT") {
          console.error("[QuranCircle] Realtime error:", status, err);
        }
      });

    // Safety-net: full refresh every 60s to catch any missed events
    const safetyInterval = setInterval(refreshEvent, 60_000);

    return () => {
      supabase.removeChannel(channel);
      clearInterval(safetyInterval);
      if (batchTimerRef.current) {
        clearTimeout(batchTimerRef.current);
        batchTimerRef.current = null;
      }
    };
  }, [shortCode, khatmIds, refreshEvent, flushRealtimeUpdates]);

  const handleShare = async () => {
    const url = `${window.location.origin}/s/${shortCode}`;
    if (navigator.share) {
      try {
        await navigator.share({
          title: event.name,
          text: `Join our Khatim circle: ${event.name}`,
          url,
        });
      } catch {
        // User cancellation is expected in native share sheets.
      }
    } else {
      navigator.clipboard.writeText(url);
      toast.success("Link copied to clipboard");
    }
  };

  const handleLockToggle = async () => {
    setIsLocking(true);
    const result = event.is_locked
      ? await unlockEvent(shortCode, creatorToken)
      : await lockEvent(shortCode, creatorToken);
    setIsLocking(false);
    if (result.error) {
      toast.error(result.error);
      return;
    }
    setEvent((e) => ({ ...e, is_locked: !e.is_locked }));
    toast.success(event.is_locked ? "Khatim unlocked" : "Khatim locked");
  };

  const { user } = useAuth();
  const isCreator =
    (user && event.created_by === user.id) ||
    (event.creator_token && creatorToken && event.creator_token === creatorToken);

  return (
    <div className="space-y-8 sm:space-y-10">
      <section className="quran-card-primary p-6 sm:p-8">
        <div className="mb-6 flex flex-wrap items-center gap-3">
          <span className="quran-badge">
            {event.is_public ? (
              <>
                <Globe2 className="mr-2 h-3.5 w-3.5" />
                Public Circle
              </>
            ) : (
              <>
                <Link2 className="mr-2 h-3.5 w-3.5" />
                Link-Only Circle
              </>
            )}
          </span>
          <span className="quran-badge">
            {event.is_locked ? (
              <>
                <ShieldAlert className="mr-2 h-3.5 w-3.5" />
                Locked
              </>
            ) : (
              <>
                <ShieldCheck className="mr-2 h-3.5 w-3.5" />
                Open For Claims
              </>
            )}
          </span>
        </div>

        <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
          <div>
            <h1 className="font-heading text-4xl leading-tight text-quran-deep">
              {event.name}
            </h1>
            {event.description && (
              <p className="mt-2 max-w-2xl text-sm leading-relaxed text-quran-muted sm:text-base">
                {event.description}
              </p>
            )}
          </div>
          <div className="flex flex-wrap gap-2">
            <Button
              variant="outline"
              size="sm"
              className="rounded-full border-quran-border bg-white/80 px-4"
              onClick={handleShare}
            >
              <Share2 className="mr-2 h-4 w-4" />
              Share
            </Button>
            {isCreator && (
              <Button
                variant={event.is_locked ? "outline" : "default"}
                size="sm"
                className="rounded-full px-4"
                onClick={handleLockToggle}
                disabled={isLocking}
              >
                {event.is_locked ? (
                  <>
                    <Unlock className="mr-2 h-4 w-4" />
                    Unlock
                  </>
                ) : (
                  <>
                    <Lock className="mr-2 h-4 w-4" />
                    Lock
                  </>
                )}
              </Button>
            )}
          </div>
        </div>
      </section>

      <div className="space-y-8">
        {event.khatms.map((khatm) => (
          <KhatmCard
            key={khatm.id}
            khatm={khatm}
            shortCode={shortCode}
            isLocked={event.is_locked}
            deviceToken={deviceToken}
            isCreator={Boolean(isCreator)}
            onRefresh={refreshEvent}
          />
        ))}
      </div>
    </div>
  );
}
