"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import CreateKhatimDialog from "@/components/create-khatim-dialog";
import { useAuth } from "@/hooks/use-auth";
import Link from "next/link";
import { Layers3, BookOpenText } from "lucide-react";
import { getUserEvents } from "@/lib/actions/events";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";

export default function UserDashboard() {
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const { user } = useAuth();
  type UserEvent = Awaited<ReturnType<typeof getUserEvents>>[number];
  const [userEvents, setUserEvents] = useState<UserEvent[]>([]);
  const [eventsLoading, setEventsLoading] = useState(false);

  useEffect(() => {
    let isMounted = true;

    const loadUserEvents = async () => {
      if (!user) {
        if (isMounted) {
          setUserEvents([]);
          setEventsLoading(false);
        }
        return;
      }

      setEventsLoading(true);
      try {
        const events = await getUserEvents();
        if (isMounted) {
          setUserEvents(events);
        }
      } finally {
        if (isMounted) {
          setEventsLoading(false);
        }
      }
    };

    loadUserEvents();
    return () => {
      isMounted = false;
    };
  }, [user]);

  if (!user) return null;

  return (
    <>
      <section className="section-panel mt-16 animate-fade-rise border-t-2 border-t-quran-gold/20 [animation-delay:200ms]" style={{ animationFillMode: "both" }}>
        <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
          <div>
            <h2 className="font-heading text-3xl text-quran-deep">
              Your Circles
            </h2>
            <p className="mt-1 text-sm text-quran-muted">
              Continue your active Khatm contributions.
            </p>
          </div>
          <span className="quran-badge">
            <Layers3 className="mr-2 h-3.5 w-3.5" />
            {userEvents.length} Active
          </span>
        </div>

        {eventsLoading ? (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="quran-card p-5">
                <div className="mb-3 flex items-start justify-between gap-3">
                  <Skeleton className="h-8 w-3/4 bg-quran-border/20" />
                  <Skeleton className="h-6 w-12 rounded-full bg-quran-border/20" />
                </div>
                <Skeleton className="h-2 w-full bg-quran-border/20" />
                <Skeleton className="mt-3 h-4 w-1/2 bg-quran-border/20" />
              </div>
            ))}
          </div>
        ) : userEvents.length > 0 ? (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {userEvents.map((ev: UserEvent) => (
              <Link
                key={ev.id}
                href={`/s/${ev.short_code}`}
                className="quran-card group block p-5 transition-all hover:-translate-y-1"
              >
                <div className="mb-3 flex items-start justify-between gap-3">
                  <h3 className="font-heading text-2xl leading-tight text-quran-deep group-hover:text-quran-green">
                    {ev.name}
                  </h3>
                  <span className="rounded-full border border-quran-border bg-white/70 px-2.5 py-1 text-xs font-semibold text-quran-muted">
                    {Math.round((ev.claimed / ev.total) * 100)}%
                  </span>
                </div>
                <Progress
                  value={(ev.claimed / ev.total) * 100}
                  className="h-2 bg-quran-border/50"
                />
                <p className="mt-3 text-sm text-quran-muted">
                  {ev.claimed}/{ev.total} Juz claimed
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
            <p className="mt-2 max-w-xs text-sm text-quran-muted">
              You haven&apos;t joined or created any circles yet. Start one to begin your journey.
            </p>
            <Button
              className="mt-6 rounded-full px-6"
              onClick={() => setIsCreateOpen(true)}
            >
              Create Your First Circle
            </Button>
          </div>
        )}
      </section>

      <CreateKhatimDialog
        isOpen={isCreateOpen}
        onClose={() => setIsCreateOpen(false)}
      />
    </>
  );
}
