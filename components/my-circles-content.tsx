"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import CreateKhatimDialog from "@/components/create-khatim-dialog";
import AppPageHero from "@/components/app-page-hero";
import { useAuth } from "@/hooks/use-auth";
import { getMyCircles } from "@/lib/actions/events";
import { cn } from "@/lib/utils";
import {
  BookOpenText,
  Globe2,
  Layers3,
  Plus,
  Users2,
} from "lucide-react";

const IDENTITY_MERGED_EVENT = "quran-circle:identity-merged";

type MyCircle = Awaited<ReturnType<typeof getMyCircles>>[number];
type CircleTab = "active" | "archived";

function formatDate(value: string | null) {
  if (!value) return null;
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return null;
  return parsed.toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

function CircleCard({ circle, archived = false }: { circle: MyCircle; archived?: boolean }) {
  const progress = Math.round((circle.claimed / circle.total) * 100);
  const archivedLabel = archived ? formatDate(circle.archived_at) : null;

  return (
    <Link
      href={`/s/${circle.short_code}`}
      className={cn(
        "quran-card-interactive group block min-h-56 p-6",
        archived && "opacity-70 hover:opacity-90"
      )}
    >
      <div className="mb-3 flex items-start justify-between gap-3">
        <h3 className="font-heading text-2xl leading-tight text-quran-deep group-hover:text-quran-green">
          {circle.name}
        </h3>
        <span className="rounded-full border border-quran-border bg-white/70 px-2.5 py-1 text-xs font-semibold text-quran-muted">
          {progress}%
        </span>
      </div>

      <div className="mb-3 flex flex-wrap items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.1em]">
        <span
          className={cn(
            "rounded-full border px-2.5 py-1",
            circle.relation === "creator"
              ? "border-quran-green/30 bg-quran-green/10 text-quran-green"
              : "border-sky-200 bg-sky-50 text-sky-700"
          )}
        >
          {circle.relation === "creator" ? "Creator" : "Participant"}
        </span>
        <span className="rounded-full border border-quran-border bg-white/70 px-2.5 py-1 text-quran-muted">
          {circle.is_public ? "Public" : "Link-only"}
        </span>
        {archived && (
          <span className="rounded-full border border-amber-200 bg-amber-50 px-2.5 py-1 text-amber-700">
            {archivedLabel ? `Archived ${archivedLabel}` : "Archived"}
          </span>
        )}
      </div>

      <Progress
        value={progress}
        aria-label={`${circle.name}: ${circle.claimed}/${circle.total} Juz claimed`}
        className="h-2 bg-quran-border/50"
      />
      <div className="mt-3 flex flex-wrap items-center justify-between gap-2 text-sm text-quran-muted">
        <span>
          {circle.claimed}/{circle.total} Juz claimed
        </span>
        <span>
          You: {circle.my_claimed} claimed · {circle.my_read} read
        </span>
      </div>
    </Link>
  );
}

export default function MyCirclesContent() {
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [circles, setCircles] = useState<MyCircle[]>([]);
  const [isLoadingCircles, setIsLoadingCircles] = useState(true);
  const [activeTab, setActiveTab] = useState<CircleTab>("active");
  const { ensureSession, user, isAuthenticatedUser, isAnonymous } = useAuth();

  useEffect(() => {
    let isMounted = true;

    const loadCircles = async () => {
      setIsLoadingCircles(true);
      try {
        const sessionUser = await ensureSession();
        if (!isMounted) return;

        if (!sessionUser) {
          setCircles([]);
          return;
        }

        const nextCircles = await getMyCircles();
        if (isMounted) {
          setCircles(nextCircles);
        }
      } catch (error) {
        console.error("[MyCircles] Failed to load circles:", error);
        if (isMounted) {
          setCircles([]);
        }
      } finally {
        if (isMounted) {
          setIsLoadingCircles(false);
        }
      }
    };

    void loadCircles();
    return () => {
      isMounted = false;
    };
  }, [ensureSession, user?.id]);

  useEffect(() => {
    let isMounted = true;

    const refreshOnMerge = async () => {
      try {
        const nextCircles = await getMyCircles();
        if (isMounted) {
          setCircles(nextCircles);
        }
      } catch (error) {
        console.error("[MyCircles] Failed to refresh circles after merge:", error);
      }
    };

    window.addEventListener(IDENTITY_MERGED_EVENT, refreshOnMerge);
    return () => {
      isMounted = false;
      window.removeEventListener(IDENTITY_MERGED_EVENT, refreshOnMerge);
    };
  }, []);

  const activeCircles = useMemo(
    () => circles.filter((circle) => !circle.is_archived),
    [circles]
  );
  const archivedCircles = useMemo(
    () => circles.filter((circle) => circle.is_archived),
    [circles]
  );

  const visibleCircles = activeTab === "active" ? activeCircles : archivedCircles;

  return (
    <>
      <AppPageHero
        eyebrow="Your reading history"
        title="My Circles"
        description="Return to circles you created or joined, review your claimed Juz, and keep every shared recitation moving."
        icon={Layers3}
      >
        <div className="space-y-3">
          <div className="app-hero-stat-grid">
            <div className="app-hero-stat">
              <strong>{activeCircles.length}</strong>
              <span>Active circles</span>
            </div>
            <div className="app-hero-stat">
              <strong>{archivedCircles.length}</strong>
              <span>Archived</span>
            </div>
          </div>
          <Button
            className="w-full rounded-full"
            onClick={() => setIsCreateOpen(true)}
          >
            <Plus className="mr-2 h-4 w-4" />
            Create a Circle
          </Button>
        </div>
      </AppPageHero>

      <section className="mt-8">
        <div className="app-toolbar">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.18em] text-quran-gold">
              Circle library
            </p>
            <p className="mt-1 text-sm text-quran-muted">
              Switch between current readings and completed history.
            </p>
          </div>
          <div
            role="group"
            aria-label="Circle status filters"
            className="app-segmented-control"
          >
            <Button
              type="button"
              variant="ghost"
              size="sm"
              aria-pressed={activeTab === "active"}
              onClick={() => setActiveTab("active")}
              className={cn(
                "h-full flex-1 rounded-lg px-4 text-foreground/60 shadow-none hover:bg-transparent hover:text-foreground sm:flex-none",
                activeTab === "active" &&
                  "bg-background text-foreground shadow-sm hover:bg-background"
              )}
            >
              Active ({activeCircles.length})
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              aria-pressed={activeTab === "archived"}
              onClick={() => setActiveTab("archived")}
              className={cn(
                "h-full flex-1 rounded-lg px-4 text-foreground/60 shadow-none hover:bg-transparent hover:text-foreground sm:flex-none",
                activeTab === "archived" &&
                  "bg-background text-foreground shadow-sm hover:bg-background"
              )}
            >
              Archived ({archivedCircles.length})
            </Button>
          </div>
        </div>

        <div className="mt-5">
          {isLoadingCircles ? (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {[...Array(3)].map((_, index) => (
                <div key={index} className="quran-card p-5">
                  <Skeleton className="mb-3 h-8 w-3/4 bg-quran-border/20" />
                  <Skeleton className="mb-2 h-4 w-1/2 bg-quran-border/20" />
                  <Skeleton className="h-2 w-full bg-quran-border/20" />
                </div>
              ))}
            </div>
          ) : visibleCircles.length > 0 ? (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {visibleCircles.map((circle) => (
                <CircleCard
                  key={circle.id}
                  circle={circle}
                  archived={activeTab === "archived"}
                />
              ))}
            </div>
          ) : (
            <div className="app-empty-state flex flex-col items-center justify-center">
              <div className="relative mb-5 flex h-16 w-16 items-center justify-center rounded-[1.2rem] border border-quran-border/60 bg-white/75 text-quran-green shadow-sm">
                <BookOpenText className="h-7 w-7" />
              </div>
              {isAuthenticatedUser ? (
                <>
                  <h2 className="relative font-heading text-3xl text-quran-deep">
                    {activeTab === "active" ? "No active circles yet" : "No archived circles"}
                  </h2>
                  <p className="relative mt-2 max-w-md text-sm leading-6 text-quran-muted">
                    {activeTab === "active"
                      ? "Create a new circle or claim a Juz to start tracking your progress here."
                      : "Archived circles will appear here when you archive circles you created or contributed to."}
                  </p>
                  {activeTab === "active" && (
                    <Button className="mt-6 rounded-full" onClick={() => setIsCreateOpen(true)}>
                      <Plus className="mr-2 h-4 w-4" />
                      Create a Circle
                    </Button>
                  )}
                </>
              ) : isAnonymous ? (
                <>
                  <h2 className="relative font-heading text-3xl text-quran-deep">
                    No circles in this session yet
                  </h2>
                  <p className="relative mt-2 max-w-md text-sm leading-6 text-quran-muted">
                    Claim a Juz in any circle to start building your personal circles history.
                  </p>
                  <div className="mt-6 flex flex-wrap justify-center gap-2">
                    <Button asChild className="rounded-full">
                      <Link href="/browse">
                        <Globe2 className="mr-2 h-4 w-4" />
                        Browse Circles
                      </Link>
                    </Button>
                    <Button asChild variant="outline" className="rounded-full border-quran-border bg-white/80">
                      <Link href="/">Go Home</Link>
                    </Button>
                  </div>
                </>
              ) : (
                <>
                  <h2 className="relative font-heading text-3xl text-quran-deep">No circles found</h2>
                  <p className="relative mt-2 max-w-md text-sm leading-6 text-quran-muted">
                    Join a circle and claim a Juz to see your activity appear here.
                  </p>
                  <Button asChild className="mt-6 rounded-full">
                    <Link href="/browse">
                      <Users2 className="mr-2 h-4 w-4" />
                      Explore Circles
                    </Link>
                  </Button>
                </>
              )}
            </div>
          )}
        </div>

        {activeTab === "active" && archivedCircles.length > 0 && !isLoadingCircles && (
          <p className="mt-6 text-sm text-quran-muted">
            {archivedCircles.length} archived {archivedCircles.length === 1 ? "circle" : "circles"} in your history. Switch to the Archived tab to review them.
          </p>
        )}
      </section>

      <CreateKhatimDialog
        isOpen={isCreateOpen}
        onClose={() => setIsCreateOpen(false)}
      />
    </>
  );
}
