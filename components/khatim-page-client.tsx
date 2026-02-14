"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
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

const CREATOR_TOKEN_KEY = "quran_circle_creator_token";
const DEVICE_TOKEN_KEY = "quran_circle_device_token";

function getOrCreateDeviceToken(): string {
  if (typeof window === "undefined") return "";
  let token = document.cookie
    .split("; ")
    .find((r) => r.startsWith(`${DEVICE_TOKEN_KEY}=`))
    ?.split("=")[1];
  if (!token) {
    token = crypto.randomUUID();
    document.cookie = `${DEVICE_TOKEN_KEY}=${token}; path=/; max-age=31536000`;
  }
  return token;
}

function getCreatorToken(): string | undefined {
  if (typeof window === "undefined") return undefined;
  return document.cookie
    .split("; ")
    .find((r) => r.startsWith(`${CREATOR_TOKEN_KEY}=`))
    ?.split("=")[1];
}

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
};

export default function KhatimPageClient({ event: initialEvent, shortCode }: Props) {
  const [event, setEvent] = useState(initialEvent);
  const [isLocking, setIsLocking] = useState(false);
  const deviceToken = getOrCreateDeviceToken();
  const khatmIds = event.khatms.map((k) => k.id).join(",");

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
        () => {
          fetch(`/api/event?shortCode=${shortCode}`)
            .then((r) => r.json())
            .then((data) => data && setEvent(data))
            .catch(() => {});
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [shortCode, khatmIds]);

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
    const creatorToken = getCreatorToken();
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
  const creatorToken = getCreatorToken();
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
          />
        ))}
      </div>
    </div>
  );
}
