"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import CreateKhatimDialog from "@/components/create-khatim-dialog";
import { useAuth } from "@/hooks/use-auth";
import { getMyCircles } from "@/lib/actions/events";
import { cn } from "@/lib/utils";
import {
  Archive,
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
  return parsed.toLocaleDateString("en-US", {
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
        "quran-card group block p-5 transition-all hover:-translate-y-1",
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

      <Progress value={progress} className="h-2 bg-quran-border/50" />
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
      const nextCircles = await getMyCircles();
      if (isMounted) {
        setCircles(nextCircles);
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
      <section className="section-panel animate-fade-rise border-t-2 border-t-quran-gold/20 [animation-delay:120ms]" style={{ animationFillMode: "both" }}>
        <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
          <div>
            <h1 className="font-heading text-3xl text-quran-deep sm:text-4xl">
              My Circles
            </h1>
            <p className="mt-1 text-sm text-quran-muted sm:text-base">
              Circles you created or contributed to with claimed and read Juz activity.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <span className="quran-badge">
              <Layers3 className="mr-2 h-3.5 w-3.5" />
              {activeCircles.length} Active
            </span>
            <span className="quran-badge">
              <Archive className="mr-2 h-3.5 w-3.5" />
              {archivedCircles.length} Archived
            </span>
            <Button className="rounded-full" onClick={() => setIsCreateOpen(true)}>
              <Plus className="mr-2 h-4 w-4" />
              Create
            </Button>
          </div>
        </div>

        <Tabs
          value={activeTab}
          onValueChange={(value) => setActiveTab(value as CircleTab)}
        >
          <TabsList className="w-full sm:w-auto">
            <TabsTrigger value="active">Active ({activeCircles.length})</TabsTrigger>
            <TabsTrigger value="archived">Archived ({archivedCircles.length})</TabsTrigger>
          </TabsList>
        </Tabs>

        <div className="mt-6">
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
            <div className="quran-card flex flex-col items-center justify-center p-10 text-center">
              <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-quran-green/10 text-quran-green">
                <BookOpenText className="h-7 w-7" />
              </div>
              {isAuthenticatedUser ? (
                <>
                  <h2 className="font-heading text-xl text-quran-deep">
                    {activeTab === "active" ? "No active circles yet" : "No archived circles"}
                  </h2>
                  <p className="mt-2 max-w-sm text-sm text-quran-muted">
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
                  <h2 className="font-heading text-xl text-quran-deep">
                    No circles in this session yet
                  </h2>
                  <p className="mt-2 max-w-sm text-sm text-quran-muted">
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
                  <h2 className="font-heading text-xl text-quran-deep">No circles found</h2>
                  <p className="mt-2 max-w-sm text-sm text-quran-muted">
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
