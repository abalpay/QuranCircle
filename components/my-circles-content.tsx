"use client";

import { useEffect, useMemo, useState } from "react";
import { Link } from "@/i18n/navigation";
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
import { useFormatter, useTranslations } from "next-intl";

const IDENTITY_MERGED_EVENT = "quran-circle:identity-merged";

type MyCircle = Awaited<ReturnType<typeof getMyCircles>>[number];
type CircleTab = "active" | "archived";

function CircleCard({ circle, archived = false }: { circle: MyCircle; archived?: boolean }) {
  const t = useTranslations("MyCircles");
  const format = useFormatter();
  const progress = Math.round((circle.claimed / circle.total) * 100);
  const archivedDate = circle.archived_at
    ? new Date(circle.archived_at)
    : null;
  const archivedLabel =
    archivedDate && !Number.isNaN(archivedDate.getTime())
      ? format.dateTime(archivedDate, {
          year: "numeric",
          month: "short",
          day: "numeric",
        })
      : null;

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
          {circle.relation === "creator" ? t("creator") : t("participant")}
        </span>
        <span className="rounded-full border border-quran-border bg-white/70 px-2.5 py-1 text-quran-muted">
          {circle.is_public ? t("public") : t("linkOnly")}
        </span>
        {archived && (
          <span className="rounded-full border border-amber-200 bg-amber-50 px-2.5 py-1 text-amber-700">
            {archivedLabel
              ? t("archivedOn", { date: archivedLabel })
              : t("archived")}
          </span>
        )}
      </div>

      <Progress
        value={progress}
        aria-label={t("progressLabel", {
          circleName: circle.name,
          claimed: circle.claimed,
          total: circle.total,
        })}
        className="h-2 bg-quran-border/50"
      />
      <div className="mt-3 flex flex-wrap items-center justify-between gap-2 text-sm text-quran-muted">
        <span>
          {t("claimedProgress", {
            claimed: circle.claimed,
            total: circle.total,
          })}
        </span>
        <span>
          {t("yourProgress", {
            claimed: circle.my_claimed,
            read: circle.my_read,
          })}
        </span>
      </div>
    </Link>
  );
}

export default function MyCirclesContent() {
  const t = useTranslations("MyCircles");
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
        eyebrow={t("eyebrow")}
        title={t("title")}
        description={t("description")}
        icon={Layers3}
      >
        <div className="space-y-3">
          <div className="app-hero-stat-grid">
            <div className="app-hero-stat">
              <strong>{activeCircles.length}</strong>
              <span>{t("activeCircles")}</span>
            </div>
            <div className="app-hero-stat">
              <strong>{archivedCircles.length}</strong>
              <span>{t("archived")}</span>
            </div>
          </div>
          <Button
            className="w-full rounded-full"
            onClick={() => setIsCreateOpen(true)}
          >
            <Plus className="mr-2 h-4 w-4" />
            {t("createCircle")}
          </Button>
        </div>
      </AppPageHero>

      <section className="mt-8">
        <div className="app-toolbar">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.18em] text-quran-gold">
              {t("library")}
            </p>
            <p className="mt-1 text-sm text-quran-muted">
              {t("libraryDescription")}
            </p>
          </div>
          <div
            role="group"
            aria-label={t("statusFilters")}
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
              {t("activeTab", { count: activeCircles.length })}
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
              {t("archivedTab", { count: archivedCircles.length })}
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
                    {activeTab === "active"
                      ? t("noActiveCircles")
                      : t("noArchivedCircles")}
                  </h2>
                  <p className="relative mt-2 max-w-md text-sm leading-6 text-quran-muted">
                    {activeTab === "active"
                      ? t("noActiveDescription")
                      : t("noArchivedDescription")}
                  </p>
                  {activeTab === "active" && (
                    <Button className="mt-6 rounded-full" onClick={() => setIsCreateOpen(true)}>
                      <Plus className="mr-2 h-4 w-4" />
                      {t("createCircle")}
                    </Button>
                  )}
                </>
              ) : isAnonymous ? (
                <>
                  <h2 className="relative font-heading text-3xl text-quran-deep">
                    {t("noSessionCircles")}
                  </h2>
                  <p className="relative mt-2 max-w-md text-sm leading-6 text-quran-muted">
                    {t("noSessionDescription")}
                  </p>
                  <div className="mt-6 flex flex-wrap justify-center gap-2">
                    <Button asChild className="rounded-full">
                      <Link href="/browse">
                        <Globe2 className="mr-2 h-4 w-4" />
                        {t("browseCircles")}
                      </Link>
                    </Button>
                    <Button asChild variant="outline" className="rounded-full border-quran-border bg-white/80">
                      <Link href="/">{t("goHome")}</Link>
                    </Button>
                  </div>
                </>
              ) : (
                <>
                  <h2 className="relative font-heading text-3xl text-quran-deep">
                    {t("noCirclesFound")}
                  </h2>
                  <p className="relative mt-2 max-w-md text-sm leading-6 text-quran-muted">
                    {t("noCirclesDescription")}
                  </p>
                  <Button asChild className="mt-6 rounded-full">
                    <Link href="/browse">
                      <Users2 className="mr-2 h-4 w-4" />
                      {t("exploreCircles")}
                    </Link>
                  </Button>
                </>
              )}
            </div>
          )}
        </div>

        {activeTab === "active" && archivedCircles.length > 0 && !isLoadingCircles && (
          <p className="mt-6 text-sm text-quran-muted">
            {t("archivedHistory", { count: archivedCircles.length })}
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
