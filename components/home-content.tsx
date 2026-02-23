"use client";

import { useEffect, useMemo, useState } from "react";
import dynamic from "next/dynamic";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { useAuth } from "@/hooks/use-auth";
import { getMyCircles } from "@/lib/actions/events";
import { BookOpenText, Layers3, ArrowRight } from "lucide-react";

const CreateKhatimDialog = dynamic(
  () => import("@/components/create-khatim-dialog"),
  { ssr: false }
);

const IDENTITY_MERGED_EVENT = "quran-circle:identity-merged";

type MyCircle = Awaited<ReturnType<typeof getMyCircles>>[number];

export default function UserDashboard() {
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [circles, setCircles] = useState<MyCircle[]>([]);
  const [isLoadingCircles, setIsLoadingCircles] = useState(true);
  const { user, isAuthenticatedUser, sessionReady } = useAuth();

  useEffect(() => {
    let isMounted = true;

    const loadCircles = async () => {
      if (!sessionReady) return;
      setIsLoadingCircles(true);
      try {
        if (!user?.id) {
          if (!isMounted) return;
          setCircles([]);
          return;
        }

        const nextCircles = await getMyCircles();
        if (isMounted) {
          setCircles(nextCircles);
        }
      } catch (error) {
        console.error("[UserDashboard] Failed to load circles:", error);
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
  }, [sessionReady, user?.id]);

  useEffect(() => {
    let isMounted = true;

    const handleIdentityMerged = async () => {
      try {
        const nextCircles = await getMyCircles();
        if (isMounted) {
          setCircles(nextCircles);
        }
      } catch (error) {
        console.error("[UserDashboard] Failed to refresh circles after merge:", error);
      }
    };

    window.addEventListener(IDENTITY_MERGED_EVENT, handleIdentityMerged);
    return () => {
      isMounted = false;
      window.removeEventListener(IDENTITY_MERGED_EVENT, handleIdentityMerged);
    };
  }, []);

  const activeCircles = useMemo(
    () => circles.filter((circle) => !circle.is_archived),
    [circles]
  );
  const archivedCount = useMemo(
    () => circles.filter((circle) => circle.is_archived).length,
    [circles]
  );

  const previewCircles = activeCircles.slice(0, 3);
  const shouldRenderSection = isAuthenticatedUser || circles.length > 0;

  if (!shouldRenderSection) return null;

  return (
    <>
      <section
        className="section-panel mt-16 animate-fade-rise border-t-2 border-t-quran-gold/20 [animation-delay:200ms]"
        style={{ animationFillMode: "both" }}
      >
        <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
          <div>
            <h2 className="font-heading text-3xl text-quran-deep">My Circles</h2>
            <p className="mt-1 text-sm text-quran-muted">
              Your active circles at a glance. Open the full page for complete history.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <span className="quran-badge">
              <Layers3 className="mr-2 h-3.5 w-3.5" />
              {activeCircles.length} Active
            </span>
            <Button asChild variant="outline" className="rounded-full border-quran-border bg-white/80">
              <Link href="/my-circles">
                View all
                <ArrowRight className="ml-2 h-4 w-4" />
              </Link>
            </Button>
          </div>
        </div>

        {isLoadingCircles ? (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {[...Array(3)].map((_, index) => (
              <div key={index} className="quran-card p-5">
                <Skeleton className="mb-3 h-8 w-3/4 bg-quran-border/20" />
                <Skeleton className="h-2 w-full bg-quran-border/20" />
                <Skeleton className="mt-3 h-4 w-1/2 bg-quran-border/20" />
              </div>
            ))}
          </div>
        ) : previewCircles.length > 0 ? (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {previewCircles.map((circle) => (
              <Link
                key={circle.id}
                href={`/s/${circle.short_code}`}
                className="quran-card group block p-5 transition-all hover:-translate-y-1"
              >
                <div className="mb-3 flex items-start justify-between gap-3">
                  <h3 className="font-heading text-2xl leading-tight text-quran-deep group-hover:text-quran-green">
                    {circle.name}
                  </h3>
                  <span className="rounded-full border border-quran-border bg-white/70 px-2.5 py-1 text-xs font-semibold text-quran-muted">
                    {Math.round((circle.claimed / circle.total) * 100)}%
                  </span>
                </div>
                <Progress
                  value={(circle.claimed / circle.total) * 100}
                  className="h-2 bg-quran-border/50"
                />
                <p className="mt-3 text-sm text-quran-muted">
                  {circle.claimed}/{circle.total} Juz claimed
                </p>
              </Link>
            ))}
          </div>
        ) : (
          <div className="quran-card flex flex-col items-center justify-center p-10 text-center">
            <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-quran-green/10 text-quran-green">
              <BookOpenText className="h-7 w-7" />
            </div>
            <h3 className="font-heading text-xl text-quran-deep">No active circles</h3>
            <p className="mt-2 max-w-sm text-sm text-quran-muted">
              {isAuthenticatedUser
                ? "Create a circle or join one to track your progress here."
                : "Your activity in this session is archived only. Visit My Circles to review your history."}
            </p>
            <div className="mt-6 flex flex-wrap justify-center gap-2">
              {isAuthenticatedUser && (
                <Button className="rounded-full px-6" onClick={() => setIsCreateOpen(true)}>
                  Create a Circle
                </Button>
              )}
              <Button asChild variant="outline" className="rounded-full border-quran-border bg-white/80">
                <Link href="/my-circles">Open My Circles</Link>
              </Button>
            </div>
          </div>
        )}

        {!isLoadingCircles && archivedCount > 0 && (
          <p className="mt-6 text-sm text-quran-muted">
            {archivedCount} archived {archivedCount === 1 ? "circle" : "circles"} in your history.
          </p>
        )}
      </section>

      {isCreateOpen ? (
        <CreateKhatimDialog
          isOpen={isCreateOpen}
          onClose={() => setIsCreateOpen(false)}
        />
      ) : null}
    </>
  );
}
