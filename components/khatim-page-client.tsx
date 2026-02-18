"use client";

import { useCallback, useEffect, useMemo, useRef, useState, useTransition } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import type { EventSnapshot } from "@/lib/types/events";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Share2,
  Globe2,
  Link2,
  ShieldCheck,
  Settings,
  Archive,
  ArchiveRestore,
  Trash2,
} from "lucide-react";
import { toast } from "sonner";
import KhatmCard, { type ClaimSuccessPayload } from "@/components/khatm-card";
import DeleteEventDialog from "@/components/delete-event-dialog";
import { cn } from "@/lib/utils";
import {
  type GlobalFilter,
  getDisplayFilter,
  getCreatorManageRows,
  getEventFilterCounts,
  isFilterSyncPending,
  normalizeGlobalFilter,
  withGlobalFilterQuery,
} from "@/lib/event-filters";
import {
  markJuzAsRead,
  unclaimJuz,
  unmarkJuzAsRead,
} from "@/lib/actions/juz";
import {
  ensureEventMembershipForShortCode,
  archiveEvent,
  unarchiveEvent,
  deleteEvent,
} from "@/lib/actions/events";

const IDENTITY_MERGED_EVENT = "quran-circle:identity-merged";
const SESSION_BOOTSTRAP_MAX_RETRIES = 4;
const SESSION_BOOTSTRAP_BASE_DELAY_MS = 500;
const REALTIME_RECOVERY_POLL_MS = 5_000;
const REALTIME_SAFETY_POLL_MS = 60_000;
const MY_JUZ_NUDGE_KEY = "qc_my_juz_nudge_seen_v1";
const FILTER_SYNC_TIMEOUT_MS = 1_200;

type Props = {
  event: EventSnapshot;
  shortCode: string;
};

export default function KhatimPageClient({
  event: initialEvent,
  shortCode,
}: Props) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [supabase] = useState(() => createClient());
  const { ensureSession, user } = useAuth();
  const [event, setEvent] = useState(initialEvent);
  const [isCreator, setIsCreator] = useState(initialEvent.can_manage);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [sessionInitialized, setSessionInitialized] = useState(false);
  const [isRealtimeDegraded, setIsRealtimeDegraded] = useState(false);
  const [, startFilterTransition] = useTransition();
  const [pendingFilter, setPendingFilter] = useState<GlobalFilter | null>(null);
  const [shouldNudgeMyJuz, setShouldNudgeMyJuz] = useState(false);
  const [showMyJuzNudge, setShowMyJuzNudge] = useState(false);
  const latestKhatmIdRef = useRef<string | null>(
    initialEvent.khatms[initialEvent.khatms.length - 1]?.id ?? null
  );

  const urlFilter = useMemo(
    () => normalizeGlobalFilter(searchParams.get("filter")),
    [searchParams]
  );
  const displayFilter = getDisplayFilter(urlFilter, pendingFilter);
  const filterSyncPending = isFilterSyncPending(urlFilter, pendingFilter);
  const filterCounts = useMemo(() => getEventFilterCounts(event), [event]);
  const creatorManageRows = useMemo(() => getCreatorManageRows(event), [event]);

  // Realtime recovery: bump epoch to force subscription teardown/recreate
  const [subscriptionEpoch, setSubscriptionEpoch] = useState(0);

  useEffect(() => {
    latestKhatmIdRef.current = event.khatms[event.khatms.length - 1]?.id ?? null;
  }, [event.khatms]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    setShouldNudgeMyJuz(window.localStorage.getItem(MY_JUZ_NUDGE_KEY) !== "1");
  }, []);

  useEffect(() => {
    if (displayFilter !== "mine") return;
    if (showMyJuzNudge) setShowMyJuzNudge(false);
    if (shouldNudgeMyJuz && typeof window !== "undefined") {
      window.localStorage.setItem(MY_JUZ_NUDGE_KEY, "1");
      setShouldNudgeMyJuz(false);
    }
  }, [displayFilter, shouldNudgeMyJuz, showMyJuzNudge]);

  useEffect(() => {
    if (pendingFilter === null) return;
    if (pendingFilter !== urlFilter) return;
    setPendingFilter(null);
  }, [pendingFilter, urlFilter]);

  useEffect(() => {
    if (!filterSyncPending) return;
    const timeoutId = window.setTimeout(() => {
      setPendingFilter(null);
    }, FILTER_SYNC_TIMEOUT_MS);
    return () => window.clearTimeout(timeoutId);
  }, [filterSyncPending]);

  const setActiveFilter = useCallback(
    (nextFilterValue: string) => {
      const nextFilter = normalizeGlobalFilter(nextFilterValue);
      if (nextFilter === displayFilter) return;
      setPendingFilter(nextFilter);
      const href = withGlobalFilterQuery(
        pathname,
        searchParams.toString(),
        nextFilter
      );
      startFilterTransition(() => {
        router.replace(href, { scroll: false });
      });
    },
    [displayFilter, pathname, router, searchParams, startFilterTransition]
  );

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

  const jumpToLatestKhatm = useCallback((baselineKhatmId: string | null = null) => {
    let attempts = 0;

    const tryScroll = () => {
      const latestKhatmId = latestKhatmIdRef.current;
      if (!latestKhatmId) return;

      // Avoid jumping to a stale card captured before async refresh completed.
      if (baselineKhatmId && latestKhatmId === baselineKhatmId) {
        if (attempts === 0) {
          void refreshEvent();
        }
        if (attempts >= 5) return;
        attempts += 1;
        window.setTimeout(tryScroll, 120);
        return;
      }

      const target = document.getElementById(`khatm-card-${latestKhatmId}`);
      if (target) {
        target.scrollIntoView({ behavior: "smooth", block: "start" });
        return;
      }
      if (attempts === 0) {
        void refreshEvent();
      }
      if (attempts >= 5) return;
      attempts += 1;
      window.setTimeout(tryScroll, 120);
    };

    tryScroll();
  }, [refreshEvent]);

  const ensureMutationSession = useCallback(async () => {
    const sessionUser = await ensureSession();
    if (!sessionUser) {
      toast.error("Unable to start a session. Please refresh and try again.");
      return false;
    }
    return true;
  }, [ensureSession]);

  const handleCreatorMarkRead = useCallback(
    async (juzId: string) => {
      if (!(await ensureMutationSession())) return;
      const result = await markJuzAsRead(shortCode, juzId);
      if (result.error) {
        toast.error(result.error);
        return;
      }
      toast.success("Juz marked as read");
      await refreshEvent();
    },
    [ensureMutationSession, refreshEvent, shortCode]
  );

  const handleCreatorUnmarkRead = useCallback(
    async (juzId: string) => {
      if (!(await ensureMutationSession())) return;
      const result = await unmarkJuzAsRead(shortCode, juzId);
      if (result.error) {
        toast.error(result.error);
        return;
      }
      toast.success("Juz marked as unread");
      await refreshEvent();
    },
    [ensureMutationSession, refreshEvent, shortCode]
  );

  const handleCreatorUnclaim = useCallback(
    async (juzId: string) => {
      if (!(await ensureMutationSession())) return;
      const result = await unclaimJuz(shortCode, juzId);
      if (result.error) {
        toast.error(result.error);
        return;
      }
      toast.success("Juz unclaimed");
      await refreshEvent();
    },
    [ensureMutationSession, refreshEvent, shortCode]
  );

  const handleClaimSuccess = useCallback(
    ({ claimedCount, newKhatmCreated }: ClaimSuccessPayload) => {
      const successMessage = newKhatmCreated
        ? "Juz claimed! A new Khatm cycle has started."
        : claimedCount === 1
          ? "Juz claimed."
          : `${claimedCount} Juz claimed.`;
      const shouldGuideToMyJuz = shouldNudgeMyJuz && displayFilter !== "mine";
      if (shouldGuideToMyJuz) {
        setShowMyJuzNudge(true);
      }

      if (newKhatmCreated && displayFilter === "available") {
        const baselineKhatmId = latestKhatmIdRef.current;
        toast.success(successMessage, {
          action: {
            label: "Jump to new Khatm",
            onClick: () => jumpToLatestKhatm(baselineKhatmId),
          },
        });
        return;
      }

      if (shouldGuideToMyJuz) {
        toast.success("Juz claimed. Manage it in My Juz.", {
          action: {
            label: "Go to My Juz",
            onClick: () => setActiveFilter("mine"),
          },
        });
        return;
      }

      toast.success(successMessage);
    },
    [displayFilter, jumpToLatestKhatm, setActiveFilter, shouldNudgeMyJuz]
  );

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
  }, [ensureSession, refreshEvent, shortCode, user?.id]);

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
    ensureSession,
    event.id,
    event.is_creator,
    event.is_member,
    event.is_public,
    refreshEvent,
    sessionInitialized,
    shortCode,
    subscriptionEpoch,
    supabase,
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

      <section className="quran-card p-4 sm:p-5">
        <Tabs value={displayFilter}>
          <TabsList className="w-full sm:w-auto">
            <TabsTrigger value="all" onClick={() => setActiveFilter("all")}>
              All ({filterCounts.all})
            </TabsTrigger>
            <TabsTrigger
              value="available"
              onClick={() => setActiveFilter("available")}
            >
              Available ({filterCounts.available})
            </TabsTrigger>
            <TabsTrigger
              value="mine"
              onClick={() => setActiveFilter("mine")}
              className={cn(showMyJuzNudge && "animate-pulse ring-2 ring-emerald-300")}
            >
              <span className="flex items-center gap-2">
                <span>My Juz ({filterCounts.mine})</span>
                {showMyJuzNudge && (
                  <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-semibold text-emerald-700">
                    New
                  </span>
                )}
              </span>
            </TabsTrigger>
          </TabsList>
        </Tabs>
        {filterSyncPending && (
          <p
            className="mt-2 text-xs text-quran-muted"
            role="status"
            aria-live="polite"
          >
            Updating...
          </p>
        )}
      </section>

      {isCreator && displayFilter === "mine" && creatorManageRows.length > 0 && (
        <section className="quran-card p-6 sm:p-7">
          <h2 className="font-heading text-2xl text-quran-deep sm:text-3xl">
            Creator Management
          </h2>
          <p className="mt-2 text-sm text-quran-muted">
            Manage claimed juz across the full event, including other participants.
          </p>
          <div className="mt-5 space-y-2">
            {creatorManageRows.map((row) => (
              <div
                key={row.juzId}
                className={cn(
                  "flex flex-wrap items-center justify-between gap-3 rounded-xl border px-4 py-3",
                  row.status === "read"
                    ? "border-emerald-200 bg-emerald-50/50"
                    : "border-amber-200 bg-amber-50/50"
                )}
              >
                <div className="flex flex-wrap items-center gap-2 text-sm">
                  <span className="font-semibold text-quran-deep">
                    Khatm #{row.khatmNumber} · Juz {row.juzNumber}
                  </span>
                  <span
                    className={cn(
                      "rounded-full px-2 py-0.5 text-[10px] font-medium",
                      row.status === "read"
                        ? "bg-emerald-100 text-emerald-700"
                        : "bg-amber-100 text-amber-700"
                    )}
                  >
                    {row.status === "read" ? "Read" : "Claimed"}
                  </span>
                  <span className="text-quran-muted">
                    {row.claimedByName ? `by ${row.claimedByName}` : "name unavailable"}
                  </span>
                  {row.isMine && (
                    <span className="rounded-full bg-quran-green/10 px-2 py-0.5 text-[10px] font-medium text-quran-green">
                      Yours
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  {row.status === "claimed" && (
                    <button
                      className="rounded-full bg-emerald-100 px-3 py-1 text-xs font-medium text-emerald-700 transition-colors hover:bg-emerald-200"
                      onClick={() => handleCreatorMarkRead(row.juzId)}
                    >
                      Mark Read
                    </button>
                  )}
                  {row.status === "read" && (
                    <button
                      className="rounded-full bg-amber-100 px-3 py-1 text-xs font-medium text-amber-700 transition-colors hover:bg-amber-200"
                      onClick={() => handleCreatorUnmarkRead(row.juzId)}
                    >
                      Undo
                    </button>
                  )}
                  <button
                    className="rounded-full px-3 py-1 text-xs font-medium text-quran-muted transition-colors hover:bg-red-100 hover:text-red-600"
                    onClick={() => handleCreatorUnclaim(row.juzId)}
                  >
                    Unclaim
                  </button>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      <div className="space-y-8">
        {event.khatms.map((khatm, index) => {
          const hasNewerKhatm = index < event.khatms.length - 1;
          const isFullyClaimed = khatm.claimed_count === 30;
          return (
            <div
              key={khatm.id}
              id={`khatm-card-${khatm.id}`}
              className="scroll-mt-24"
            >
              <KhatmCard
                khatm={khatm}
                shortCode={shortCode}
                isReadOnly={event.is_archived}
                onRefresh={refreshEvent}
                activeFilter={displayFilter}
                isCompleted={isFullyClaimed && hasNewerKhatm}
                onClaimSuccess={handleClaimSuccess}
              />
            </div>
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
