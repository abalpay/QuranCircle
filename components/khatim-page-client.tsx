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
import InstallAppSheet from "@/components/install-app-sheet";
import { useTranslations } from "next-intl";
import CreatorQueuePanel from "@/components/creator-queue-panel";
import { cn } from "@/lib/utils";
import { shareCircleInvite } from "@/lib/share-invite";
import {
  type GlobalFilter,
  getDisplayFilter,
  getCreatorManageRows,
  getEventFilterCounts,
  isFilterSyncPending,
  normalizeMineView,
  normalizeGlobalFilter,
  withMineViewQuery,
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
import {
  hasSeenClaimInstallPrompt,
  isInstallPromptEnabled,
  markClaimInstallPromptSeen,
} from "@/hooks/use-pwa-install";

const IDENTITY_MERGED_EVENT = "quran-circle:identity-merged";
const SESSION_BOOTSTRAP_MAX_RETRIES = 4;
const SESSION_BOOTSTRAP_BASE_DELAY_MS = 500;
const REALTIME_RECOVERY_POLL_MS = 5_000;
const REALTIME_SAFETY_POLL_MS = 60_000;
const MY_JUZ_NUDGE_KEY = "qc_my_juz_nudge_seen_v1";
const FILTER_SYNC_TIMEOUT_MS = 1_200;
const CLAIM_SUCCESS_INSTALL_PROMPT_DELAY_MS = 1_400;
const SNAPSHOT_WINDOW_KHATM_LIMIT = 3;
const SNAPSHOT_WINDOW_MAX_KHATM_LIMIT = 20;

type Props = {
  event: EventSnapshot;
  shortCode: string;
};

type MineView = "mine" | "creator";

export default function KhatimPageClient({
  event: initialEvent,
  shortCode,
}: Props) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [supabase] = useState(() => createClient());
  const { ensureSession, user } = useAuth();
  const t = useTranslations("Filters");
  const tPage = useTranslations("CirclePage");
  const [event, setEvent] = useState(initialEvent);
  const [isCreator, setIsCreator] = useState(initialEvent.can_manage);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [sessionInitialized, setSessionInitialized] = useState(false);
  const [isRealtimeDegraded, setIsRealtimeDegraded] = useState(false);
  const [, startFilterTransition] = useTransition();
  const [pendingFilter, setPendingFilter] = useState<GlobalFilter | null>(null);
  const [pendingMineView, setPendingMineView] = useState<MineView | null>(null);
  const [shouldNudgeMyJuz, setShouldNudgeMyJuz] = useState(false);
  const [showMyJuzNudge, setShowMyJuzNudge] = useState(false);
  const [isInstallPromptOpen, setIsInstallPromptOpen] = useState(false);
  const [isLoadingOlderKhatms, setIsLoadingOlderKhatms] = useState(false);
  const latestKhatmIdRef = useRef<string | null>(
    initialEvent.khatms[initialEvent.khatms.length - 1]?.id ?? null
  );
  const loadedKhatmCountRef = useRef<number>(
    initialEvent.khatms.length || SNAPSHOT_WINDOW_KHATM_LIMIT
  );
  const installPromptTimerRef = useRef<number | null>(null);

  const urlFilter = useMemo(
    () => normalizeGlobalFilter(searchParams.get("filter")),
    [searchParams]
  );
  const displayFilter = getDisplayFilter(urlFilter, pendingFilter);
  const filterSyncPending = isFilterSyncPending(urlFilter, pendingFilter);
  const urlMineView = useMemo(
    () => normalizeMineView(searchParams.get("mineView"), isCreator),
    [isCreator, searchParams]
  );
  const displayMineView = pendingMineView ?? urlMineView;
  const filterCounts = useMemo(() => getEventFilterCounts(event), [event]);
  const creatorManageRows = useMemo(() => getCreatorManageRows(event), [event]);

  // Realtime recovery: bump epoch to force subscription teardown/recreate
  const [subscriptionEpoch, setSubscriptionEpoch] = useState(0);

  useEffect(() => {
    latestKhatmIdRef.current = event.khatms[event.khatms.length - 1]?.id ?? null;
  }, [event.khatms]);

  useEffect(() => {
    loadedKhatmCountRef.current =
      event.khatms.length || SNAPSHOT_WINDOW_KHATM_LIMIT;
  }, [event.khatms.length]);

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
    if (pendingMineView === null) return;
    if (pendingMineView !== urlMineView) return;
    setPendingMineView(null);
  }, [pendingMineView, urlMineView]);

  useEffect(() => {
    if (!filterSyncPending) return;
    const timeoutId = window.setTimeout(() => {
      setPendingFilter(null);
    }, FILTER_SYNC_TIMEOUT_MS);
    return () => window.clearTimeout(timeoutId);
  }, [filterSyncPending]);

  useEffect(() => {
    if (displayFilter === "mine") return;
    if (pendingMineView === null) return;
    setPendingMineView(null);
  }, [displayFilter, pendingMineView]);

  useEffect(() => {
    if (displayFilter !== "mine") return;

    const rawMineView = searchParams.get("mineView");
    const normalizedMineView = normalizeMineView(rawMineView, isCreator);
    const canonicalMineView = normalizedMineView === "creator" ? "creator" : null;

    if (rawMineView === canonicalMineView) return;

    const href = withMineViewQuery(
      pathname,
      searchParams.toString(),
      normalizedMineView
    );
    startFilterTransition(() => {
      router.replace(href, { scroll: false });
    });
  }, [
    displayFilter,
    isCreator,
    pathname,
    router,
    searchParams,
    startFilterTransition,
  ]);

  useEffect(() => {
    return () => {
      if (installPromptTimerRef.current) {
        window.clearTimeout(installPromptTimerRef.current);
      }
    };
  }, []);

  const setActiveFilter = useCallback(
    (nextFilterValue: string) => {
      const nextFilter = normalizeGlobalFilter(nextFilterValue);
      if (nextFilter === displayFilter) return;
      setPendingFilter(nextFilter);
      if (nextFilter !== "mine") {
        setPendingMineView(null);
      }
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

  const setMineView = useCallback(
    (nextMineViewValue: string) => {
      if (!isCreator || displayFilter !== "mine") return;
      const nextMineView = normalizeMineView(nextMineViewValue, true) as MineView;
      if (nextMineView === displayMineView) return;
      setPendingMineView(nextMineView);
      const href = withMineViewQuery(
        pathname,
        searchParams.toString(),
        nextMineView
      );
      startFilterTransition(() => {
        router.replace(href, { scroll: false });
      });
    },
    [
      displayFilter,
      displayMineView,
      isCreator,
      pathname,
      router,
      searchParams,
      startFilterTransition,
    ]
  );

  const refreshEvent = useCallback(
    async ({
      mode = "replace",
      beforeKhatmNumber = null,
      khatmLimit = null,
    }: {
      mode?: "replace" | "prepend";
      beforeKhatmNumber?: number | null;
      khatmLimit?: number | null;
    } = {}) => {
      try {
        const resolvedKhatmLimit =
          khatmLimit ??
          Math.max(
            SNAPSHOT_WINDOW_KHATM_LIMIT,
            Math.min(
              loadedKhatmCountRef.current || SNAPSHOT_WINDOW_KHATM_LIMIT,
              SNAPSHOT_WINDOW_MAX_KHATM_LIMIT
            )
          );

        const params = new URLSearchParams({
          shortCode,
          khatmLimit: String(resolvedKhatmLimit),
        });
        if (beforeKhatmNumber !== null) {
          params.set("beforeKhatmNumber", String(beforeKhatmNumber));
        }

        const res = await fetch(`/api/event?${params.toString()}`, {
          cache: "no-store",
        });
        if (!res.ok) {
          console.warn("[QuranCircle] Failed to refresh event snapshot:", {
            shortCode,
            status: res.status,
            statusText: res.statusText,
          });
          return false;
        }
        const data = (await res.json()) as
          | EventSnapshot
          | {
              error?: {
                code?: string;
                message?: string;
              };
            };

        if (data && typeof data === "object" && !("error" in data)) {
          const nextEvent = data as EventSnapshot;
          setEvent((current) => {
            if (mode !== "prepend") {
              return nextEvent;
            }

            const mergedById = new Map(
              current.khatms.map((khatm) => [khatm.id, khatm] as const)
            );
            for (const khatm of nextEvent.khatms) {
              if (!mergedById.has(khatm.id)) {
                mergedById.set(khatm.id, khatm);
              }
            }
            const mergedKhatms = Array.from(mergedById.values()).sort(
              (a, b) => a.khatm_number - b.khatm_number
            );

            return {
              ...current,
              ...nextEvent,
              khatms: mergedKhatms,
              loaded_khatms: mergedKhatms.length,
            };
          });
          setIsCreator(Boolean(nextEvent.can_manage));
          return true;
        }

        console.warn("[QuranCircle] Event snapshot payload was invalid:", {
          shortCode,
          error:
            data && typeof data === "object" && "error" in data
              ? data.error
              : null,
        });
        return false;
      } catch (err) {
        console.warn("[QuranCircle] Failed to refresh event:", err);
        return false;
      }
    },
    [shortCode]
  );

  const loadOlderKhatms = useCallback(async () => {
    if (!event.has_more_khatms || !event.next_before_khatm_number) return;

    setIsLoadingOlderKhatms(true);
    try {
      const loaded = await refreshEvent({
        mode: "prepend",
        beforeKhatmNumber: event.next_before_khatm_number,
        khatmLimit: SNAPSHOT_WINDOW_KHATM_LIMIT,
      });

      if (!loaded) {
        toast.error(tPage("failedToLoadOlder"));
      }
    } finally {
      setIsLoadingOlderKhatms(false);
    }
  }, [event.has_more_khatms, event.next_before_khatm_number, refreshEvent, tPage]);

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
      toast.error(tPage("sessionError"));
      return false;
    }
    return true;
  }, [ensureSession, tPage]);

  const handleCreatorMarkRead = useCallback(
    async (juzId: string) => {
      try {
        if (!(await ensureMutationSession())) return;
        const result = await markJuzAsRead(shortCode, juzId);
        if (result.error) {
          toast.error(result.error);
          return;
        }
        toast.success(tPage("juzMarkedRead"));
        await refreshEvent();
      } catch (error) {
        console.error("[QuranCircle] Failed to mark juz as read:", error);
        toast.error(tPage("markReadFailed"));
      }
    },
    [ensureMutationSession, refreshEvent, shortCode, tPage]
  );

  const handleCreatorUnmarkRead = useCallback(
    async (juzId: string) => {
      try {
        if (!(await ensureMutationSession())) return;
        const result = await unmarkJuzAsRead(shortCode, juzId);
        if (result.error) {
          toast.error(result.error);
          return;
        }
        toast.success(tPage("juzMarkedUnread"));
        await refreshEvent();
      } catch (error) {
        console.error("[QuranCircle] Failed to unmark juz as read:", error);
        toast.error(tPage("unmarkReadFailed"));
      }
    },
    [ensureMutationSession, refreshEvent, shortCode, tPage]
  );

  const handleCreatorUnclaim = useCallback(
    async (juzId: string) => {
      try {
        if (!(await ensureMutationSession())) return;
        const result = await unclaimJuz(shortCode, juzId);
        if (result.error) {
          toast.error(result.error);
          return;
        }
        toast.success(tPage("juzUnclaimed"));
        await refreshEvent();
      } catch (error) {
        console.error("[QuranCircle] Failed to unclaim juz:", error);
        toast.error(tPage("unclaimFailed"));
      }
    },
    [ensureMutationSession, refreshEvent, shortCode, tPage]
  );

  const handleClaimSuccess = useCallback(
    ({ claimedCount, newKhatmCreated }: ClaimSuccessPayload) => {
      const queueInstallPrompt = () => {
        if (typeof window === "undefined" || !isInstallPromptEnabled()) return;
        if (hasSeenClaimInstallPrompt()) return;

        markClaimInstallPromptSeen();
        if (installPromptTimerRef.current) {
          window.clearTimeout(installPromptTimerRef.current);
        }
        installPromptTimerRef.current = window.setTimeout(() => {
          setIsInstallPromptOpen(true);
        }, CLAIM_SUCCESS_INSTALL_PROMPT_DELAY_MS);
      };

      const successMessage = newKhatmCreated
        ? tPage("juzClaimedNewKhatm")
        : claimedCount === 1
          ? tPage("juzClaimedSingle")
          : tPage("juzClaimedMultiple", { count: claimedCount });
      const shouldGuideToMyJuz = shouldNudgeMyJuz && displayFilter !== "mine";
      if (shouldGuideToMyJuz) {
        setShowMyJuzNudge(true);
      }

      if (newKhatmCreated && displayFilter === "available") {
        const baselineKhatmId = latestKhatmIdRef.current;
        toast.success(successMessage, {
          action: {
            label: tPage("jumpToNewKhatm"),
            onClick: () => jumpToLatestKhatm(baselineKhatmId),
          },
        });
        queueInstallPrompt();
        return;
      }

      if (shouldGuideToMyJuz) {
        toast.success(tPage("juzClaimedManage"), {
          action: {
            label: tPage("goToMyJuz"),
            onClick: () => setActiveFilter("mine"),
          },
        });
        queueInstallPrompt();
        return;
      }

      toast.success(successMessage);
      queueInstallPrompt();
    },
    [displayFilter, jumpToLatestKhatm, setActiveFilter, shouldNudgeMyJuz, tPage]
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
      let sessionUser = null;
      try {
        sessionUser = await ensureSession();
      } catch (error) {
        console.warn("[QuranCircle] Session bootstrap failed:", error);
      }
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

      if (!event.is_public) {
        let membershipResult: { error?: string } = {};
        try {
          membershipResult = await ensureEventMembershipForShortCode(shortCode);
        } catch (error) {
          membershipResult = { error: "membership_request_failed" };
          console.warn("[QuranCircle] Event membership bootstrap failed:", error);
        }
        if (cancelled) return;

        if (membershipResult.error) {
          setSessionInitialized(false);
          if (attempt >= SESSION_BOOTSTRAP_MAX_RETRIES) {
            console.warn(
              "[QuranCircle] Failed to ensure private event membership:",
              membershipResult.error
            );
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
      }

      setSessionInitialized(true);
      await refreshEvent();
    };

    void bootstrapSession(0);

    return () => {
      cancelled = true;
      if (retryTimer) clearTimeout(retryTimer);
    };
  }, [ensureSession, event.is_public, refreshEvent, shortCode, user?.id]);

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
                if (!event.is_public && membershipResult.error) {
                  console.warn(
                    "[QuranCircle] Failed to ensure event membership before realtime rejoin:",
                    membershipResult.error
                  );
                  return;
                }
                if (membershipResult.error) {
                  console.warn(
                    "[QuranCircle] Membership refresh warning before realtime rejoin:",
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
    await shareCircleInvite(
      {
        name: event.name,
        isPublic: event.is_public,
        url,
      },
      {
        title: event.name,
        onCopySuccess: () => {
          toast.success(tPage("inviteCopied"));
        },
        onCopyError: () => {
          toast.error(tPage("inviteCopyFailed"));
        },
      }
    );
  };

  const handleArchiveToggle = async () => {
    try {
      const action = event.is_archived ? unarchiveEvent : archiveEvent;
      const result = await action(shortCode);
      const archiveError = (result as { error?: string }).error;
      if (archiveError) {
        toast.error(archiveError);
        return;
      }
      setEvent((current) => ({ ...current, is_archived: !current.is_archived }));
      toast.success(event.is_archived ? tPage("khatimUnarchived") : tPage("khatimArchived"));
    } catch (error) {
      console.error("[QuranCircle] Failed to toggle archive state:", error);
      toast.error(tPage("archiveUpdateFailed"));
    }
  };

  const handleDelete = async () => {
    setIsDeleting(true);
    try {
      const result = await deleteEvent(shortCode);
      const deleteError = (result as { error?: string }).error;
      if (deleteError) {
        toast.error(deleteError);
        return;
      }
      toast.success(tPage("khatimDeleted"));
      router.push("/");
    } catch (error) {
      console.error("[QuranCircle] Failed to delete khatim:", error);
      toast.error(tPage("deleteFailed"));
    } finally {
      setIsDeleting(false);
    }
  };

  const showMineViewTabs = isCreator && displayFilter === "mine";
  const showCreatorQueue = showMineViewTabs && displayMineView === "creator";

  return (
    <>
      <div className="space-y-8 sm:space-y-10">
      <section className="quran-card-primary p-6 sm:p-8">
        <div className="mb-6 flex flex-wrap items-center gap-3">
          <span className="quran-badge">
            {event.is_public ? (
              <>
                <Globe2 className="mr-2 h-3.5 w-3.5" />
                {tPage("publicCircle")}
              </>
            ) : (
              <>
                <Link2 className="mr-2 h-3.5 w-3.5" />
                {tPage("linkOnlyCircle")}
              </>
            )}
          </span>
          <span className="quran-badge">
            {event.is_archived ? (
              <>
                <Archive className="mr-2 h-3.5 w-3.5" />
                {tPage("archived")}
              </>
            ) : (
              <>
                <ShieldCheck className="mr-2 h-3.5 w-3.5" />
                {tPage("openForClaims")}
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
              {tPage("share")}
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
                        {tPage("unarchiveKhatim")}
                      </>
                    ) : (
                      <>
                        <Archive className="mr-2 h-4 w-4" />
                        {tPage("archiveKhatim")}
                      </>
                    )}
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    className="text-red-600 focus:text-red-600"
                    onClick={() => setIsDeleteDialogOpen(true)}
                  >
                    <Trash2 className="mr-2 h-4 w-4" />
                    {tPage("deleteKhatim")}
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
            <span>{tPage("circleArchivedReadOnly")}</span>
          </div>
          {isCreator && (
            <Button
              variant="outline"
              size="sm"
              className="shrink-0 rounded-full border-amber-300 text-amber-800 hover:bg-amber-100"
              onClick={handleArchiveToggle}
            >
              <ArchiveRestore className="mr-2 h-4 w-4" />
              {tPage("unarchive")}
            </Button>
          )}
        </div>
      )}

      <section className="quran-card p-4 sm:p-5">
        <Tabs value={displayFilter}>
          <TabsList className="w-full sm:w-auto">
            <TabsTrigger value="all" onClick={() => setActiveFilter("all")}>
              {t("all", { count: filterCounts.all })}
            </TabsTrigger>
            <TabsTrigger
              value="available"
              onClick={() => setActiveFilter("available")}
            >
              {t("available", { count: filterCounts.available })}
            </TabsTrigger>
            <TabsTrigger
              value="mine"
              onClick={() => setActiveFilter("mine")}
              className={cn(showMyJuzNudge && "animate-pulse ring-2 ring-emerald-300")}
            >
              <span className="flex items-center gap-2">
                <span>{t("myJuz", { count: filterCounts.mine })}</span>
                {showMyJuzNudge && (
                  <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-semibold text-emerald-700">
                    {t("new")}
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
            {t("updating")}
          </p>
        )}
      </section>

      {showMineViewTabs && (
        <section className="quran-card p-4 sm:p-5">
          <Tabs value={displayMineView} aria-label="My Juz views">
            <TabsList className="w-full sm:w-auto">
              <TabsTrigger value="mine" onClick={() => setMineView("mine")}>
                {t("myJuzTab")}
              </TabsTrigger>
              <TabsTrigger
                value="creator"
                onClick={() => setMineView("creator")}
              >
                {t("creatorQueue", { count: creatorManageRows.length })}
              </TabsTrigger>
            </TabsList>
          </Tabs>
        </section>
      )}

      {showCreatorQueue && creatorManageRows.length > 0 && (
        <CreatorQueuePanel
          rows={creatorManageRows}
          onMarkRead={handleCreatorMarkRead}
          onUndoRead={handleCreatorUnmarkRead}
          onUnclaim={handleCreatorUnclaim}
        />
      )}

      {showCreatorQueue && creatorManageRows.length === 0 && (
        <section className="quran-card px-6 py-10 text-center sm:px-7">
          <h2 className="font-heading text-2xl text-quran-deep sm:text-3xl">
            {tPage("creatorQueueTitle")}
          </h2>
          <p className="mt-2 text-sm text-quran-muted">
            {tPage("creatorQueueEmpty")}
          </p>
        </section>
      )}

      {!showCreatorQueue && (
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
                  onRefresh={async () => {
                    await refreshEvent();
                  }}
                  activeFilter={displayFilter}
                  isCompleted={isFullyClaimed && hasNewerKhatm}
                  onClaimSuccess={handleClaimSuccess}
                />
              </div>
              );
          })}
          {event.has_more_khatms && (
            <div className="flex flex-col items-center gap-3 pt-2">
              <Button
                variant="outline"
                className="rounded-full border-quran-border bg-white/80"
                onClick={() => void loadOlderKhatms()}
                disabled={isLoadingOlderKhatms}
              >
                {isLoadingOlderKhatms ? tPage("loadingOlderCycles") : tPage("loadOlderCycles")}
              </Button>
              <p className="text-xs text-quran-muted">
                {tPage("showingKhatms", { loaded: event.khatms.length, total: event.total_khatms })}
              </p>
            </div>
          )}
        </div>
      )}

        <DeleteEventDialog
          isOpen={isDeleteDialogOpen}
          onClose={() => setIsDeleteDialogOpen(false)}
          onConfirm={handleDelete}
          eventName={event.name}
          isDeleting={isDeleting}
        />
      </div>
      <InstallAppSheet
        surface="claim-success"
        open={isInstallPromptOpen}
        onOpenChange={setIsInstallPromptOpen}
        showDoneAction
      />
    </>
  );
}
