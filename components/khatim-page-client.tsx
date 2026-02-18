"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import type { EventSnapshot } from "@/lib/types/events";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Share2,
  Lock,
  Unlock,
  Globe2,
  Link2,
  ShieldCheck,
  ShieldAlert,
  Settings,
  Archive,
  ArchiveRestore,
  Trash2,
} from "lucide-react";
import { toast } from "sonner";
import KhatmCard from "@/components/khatm-card";
import DeleteEventDialog from "@/components/delete-event-dialog";
import {
  ensureEventMembershipForShortCode,
  lockEvent,
  unlockEvent,
  archiveEvent,
  unarchiveEvent,
  deleteEvent,
} from "@/lib/actions/events";

const IDENTITY_MERGED_EVENT = "quran-circle:identity-merged";
const SESSION_BOOTSTRAP_MAX_RETRIES = 4;
const SESSION_BOOTSTRAP_BASE_DELAY_MS = 500;
const REALTIME_RECOVERY_POLL_MS = 5_000;
const REALTIME_SAFETY_POLL_MS = 60_000;

type Props = {
  event: EventSnapshot;
  shortCode: string;
};

export default function KhatimPageClient({
  event: initialEvent,
  shortCode,
}: Props) {
  const router = useRouter();
  const [supabase] = useState(() => createClient());
  const { ensureSession } = useAuth();
  const [event, setEvent] = useState(initialEvent);
  const [isCreator, setIsCreator] = useState(initialEvent.can_manage);
  const [isLocking, setIsLocking] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [sessionInitialized, setSessionInitialized] = useState(false);
  const [isRealtimeDegraded, setIsRealtimeDegraded] = useState(false);

  // Realtime recovery: bump epoch to force subscription teardown/recreate
  const [subscriptionEpoch, setSubscriptionEpoch] = useState(0);

  // Re-establish realtime subscription when tab becomes visible or network reconnects
  useEffect(() => {
    const onVisible = () => {
      if (document.visibilityState === "visible") {
        setSubscriptionEpoch((e) => e + 1);
      }
    };
    const onOnline = () => setSubscriptionEpoch((e) => e + 1);

    document.addEventListener("visibilitychange", onVisible);
    window.addEventListener("online", onOnline);
    return () => {
      document.removeEventListener("visibilitychange", onVisible);
      window.removeEventListener("online", onOnline);
    };
  }, []);

  const refreshEvent = useCallback(async () => {
    try {
      const res = await fetch(`/api/event?shortCode=${shortCode}`, {
        cache: "no-store",
      });
      if (!res.ok) {
        console.warn("[QuranCircle] Failed to refresh event snapshot:", {
          shortCode,
          status: res.status,
          statusText: res.statusText,
        });
        return;
      }
      const data = await res.json();
      if (data && !data.error) {
        setEvent(data as EventSnapshot);
        setIsCreator(Boolean((data as EventSnapshot).can_manage));
        return;
      }
      console.warn("[QuranCircle] Event snapshot payload was invalid:", {
        shortCode,
      });
    } catch (err) {
      console.warn("[QuranCircle] Failed to refresh event:", err);
    }
  }, [shortCode]);

  // Ensure we have an auth-backed identity (anonymous or full) for claim ownership.
  useEffect(() => {
    let cancelled = false;
    let retryTimer: ReturnType<typeof setTimeout> | null = null;

    const bootstrapSession = async (attempt: number) => {
      const sessionUser = await ensureSession();
      if (cancelled) return;

      if (!sessionUser) {
        setSessionInitialized(false);

        if (attempt >= SESSION_BOOTSTRAP_MAX_RETRIES) {
          console.warn("[QuranCircle] Failed to initialize session for realtime.");
          return;
        }

        const delay = Math.min(
          SESSION_BOOTSTRAP_BASE_DELAY_MS * 2 ** attempt,
          5_000
        );
        retryTimer = setTimeout(() => {
          void bootstrapSession(attempt + 1);
        }, delay);
        return;
      }

      const membershipResult = await ensureEventMembershipForShortCode(shortCode);
      if (cancelled) return;
      if (membershipResult.error) {
        console.warn(
          "[QuranCircle] Failed to ensure event membership:",
          membershipResult.error
        );
      }

      setSessionInitialized(true);
      await refreshEvent();
    };

    void bootstrapSession(0);

    return () => {
      cancelled = true;
      if (retryTimer) clearTimeout(retryTimer);
    };
  }, [ensureSession, refreshEvent, shortCode]);

  // Private realtime subscription: listen for invalidation broadcasts only.
  useEffect(() => {
    if (!sessionInitialized) return;

    const canSubscribe = event.is_public || event.is_member || event.is_creator;
    if (!canSubscribe) return;

    const topic = `event:${event.id}`;
    let disposed = false;
    let retryCount = 0;
    let retryTimer: ReturnType<typeof setTimeout> | null = null;

    const markRealtimeDegraded = (status: string, err?: unknown) => {
      setIsRealtimeDegraded((prev) => {
        if (!prev) {
          console.warn("[QuranCircle] Realtime degraded:", status, err ?? "");
        }
        return true;
      });
    };

    const channel = supabase
      .channel(topic, {
        config: { private: true },
      })
      .on("broadcast", { event: "invalidate" }, () => {
        if (!disposed) {
          void refreshEvent();
        }
      })
      .subscribe((status, err) => {
        if (disposed) return;

        if (status === "SUBSCRIBED") {
          retryCount = 0;
          setIsRealtimeDegraded((prev) => {
            if (prev) {
              console.info("[QuranCircle] Realtime recovered.");
            }
            return false;
          });
          void refreshEvent();
          return;
        }

        if (status === "CHANNEL_ERROR" || status === "TIMED_OUT") {
          markRealtimeDegraded(status, err);
          void refreshEvent();

          const delay = Math.min(2000 * 2 ** retryCount, 30_000);
          retryCount++;

          if (retryTimer) {
            clearTimeout(retryTimer);
          }
          retryTimer = setTimeout(() => {
            if (!disposed) {
              void (async () => {
                const sessionUser = await ensureSession();
                if (disposed || !sessionUser) return;

                const membershipResult =
                  await ensureEventMembershipForShortCode(shortCode);
                if (disposed) return;
                if (membershipResult.error) {
                  console.warn(
                    "[QuranCircle] Failed to ensure event membership before realtime rejoin:",
                    membershipResult.error
                  );
                }

                setSubscriptionEpoch((epoch) => epoch + 1);
              })();
            }
          }, delay);
        }
      });

    return () => {
      disposed = true;
      if (retryTimer) clearTimeout(retryTimer);
      supabase.removeChannel(channel);
    };
  }, [
    event.id,
    event.is_creator,
    event.is_member,
    event.is_public,
    ensureSession,
    refreshEvent,
    sessionInitialized,
    shortCode,
    supabase,
    subscriptionEpoch,
  ]);

  // Fallback polling: use faster polling only while realtime is degraded.
  useEffect(() => {
    if (!sessionInitialized) return;

    const intervalMs = isRealtimeDegraded
      ? REALTIME_RECOVERY_POLL_MS
      : REALTIME_SAFETY_POLL_MS;

    const safetyInterval = setInterval(() => {
      void refreshEvent();
    }, intervalMs);

    return () => clearInterval(safetyInterval);
  }, [isRealtimeDegraded, refreshEvent, sessionInitialized]);

  // Merge completion can happen outside the realtime payload path.
  // Refresh immediately so "My Juz" reflects transferred ownership.
  useEffect(() => {
    const handleMerged = () => {
      void refreshEvent();
    };

    window.addEventListener(IDENTITY_MERGED_EVENT, handleMerged);
    return () => {
      window.removeEventListener(IDENTITY_MERGED_EVENT, handleMerged);
    };
  }, [refreshEvent]);

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
      try {
        await navigator.clipboard.writeText(url);
        toast.success("Link copied to clipboard");
      } catch {
        toast.error("Failed to copy link");
      }
    }
  };

  const handleLockToggle = async () => {
    setIsLocking(true);
    const result = event.is_locked
      ? await unlockEvent(shortCode)
      : await lockEvent(shortCode);
    setIsLocking(false);
    const lockError = (result as { error?: string }).error;
    if (lockError) {
      toast.error(lockError);
      return;
    }
    setEvent((current) => ({ ...current, is_locked: !current.is_locked }));
    toast.success(event.is_locked ? "Khatim unlocked" : "Khatim locked");
  };

  const handleArchiveToggle = async () => {
    const action = event.is_archived ? unarchiveEvent : archiveEvent;
    const result = await action(shortCode);
    const archiveError = (result as { error?: string }).error;
    if (archiveError) {
      toast.error(archiveError);
      return;
    }
    setEvent((current) => ({ ...current, is_archived: !current.is_archived }));
    toast.success(event.is_archived ? "Khatim unarchived" : "Khatim archived");
  };

  const handleDelete = async () => {
    setIsDeleting(true);
    const result = await deleteEvent(shortCode);
    setIsDeleting(false);
    const deleteError = (result as { error?: string }).error;
    if (deleteError) {
      toast.error(deleteError);
      return;
    }
    toast.success("Khatim deleted");
    router.push("/");
  };

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
            {event.is_archived ? (
              <>
                <Archive className="mr-2 h-3.5 w-3.5" />
                Archived
              </>
            ) : event.is_locked ? (
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
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="outline"
                    size="sm"
                    className="rounded-full border-quran-border bg-white/80 px-3"
                  >
                    <Settings className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem
                    onClick={handleLockToggle}
                    disabled={isLocking}
                  >
                    {event.is_locked ? (
                      <>
                        <Unlock className="mr-2 h-4 w-4" />
                        Unlock Khatim
                      </>
                    ) : (
                      <>
                        <Lock className="mr-2 h-4 w-4" />
                        Lock Khatim
                      </>
                    )}
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={handleArchiveToggle}>
                    {event.is_archived ? (
                      <>
                        <ArchiveRestore className="mr-2 h-4 w-4" />
                        Unarchive Khatim
                      </>
                    ) : (
                      <>
                        <Archive className="mr-2 h-4 w-4" />
                        Archive Khatim
                      </>
                    )}
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    className="text-red-600 focus:text-red-600"
                    onClick={() => setIsDeleteDialogOpen(true)}
                  >
                    <Trash2 className="mr-2 h-4 w-4" />
                    Delete Khatim
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            )}
          </div>
        </div>
      </section>

      {event.is_archived && (
        <div className="flex items-center justify-between rounded-xl border border-amber-200 bg-amber-50 px-5 py-4">
          <div className="flex items-center gap-3 text-sm text-amber-800">
            <Archive className="h-5 w-5 shrink-0 text-amber-600" />
            <span>This circle is archived and read-only.</span>
          </div>
          {isCreator && (
            <Button
              variant="outline"
              size="sm"
              className="shrink-0 rounded-full border-amber-300 text-amber-800 hover:bg-amber-100"
              onClick={handleArchiveToggle}
            >
              <ArchiveRestore className="mr-2 h-4 w-4" />
              Unarchive
            </Button>
          )}
        </div>
      )}

      <div className="space-y-8">
        {event.khatms.map((khatm, index) => {
          const hasNewerKhatm = index < event.khatms.length - 1;
          const isFullyClaimed = khatm.claimed_count === 30;
          return (
            <KhatmCard
              key={khatm.id}
              khatm={khatm}
              shortCode={shortCode}
              isLocked={event.is_locked || event.is_archived}
              isCreator={Boolean(isCreator)}
              onRefresh={refreshEvent}
              isCompleted={isFullyClaimed && hasNewerKhatm}
            />
          );
        })}
      </div>

      <DeleteEventDialog
        isOpen={isDeleteDialogOpen}
        onClose={() => setIsDeleteDialogOpen(false)}
        onConfirm={handleDelete}
        eventName={event.name}
        isDeleting={isDeleting}
      />
    </div>
  );
}
