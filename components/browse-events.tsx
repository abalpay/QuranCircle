"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Search, Users2, ArrowUpDown, Compass } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { toast } from "sonner";
import {
  getPublicEventsPage,
  type PublicEventsPage,
} from "@/lib/actions/events";
import { useTranslations } from "next-intl";

const BROWSE_PAGE_SIZE = 12;

type Props = {
  initialPage: PublicEventsPage;
};

export default function BrowseEvents({ initialPage }: Props) {
  const t = useTranslations("Browse");
  const [events, setEvents] = useState(initialPage.events);
  const [hasMore, setHasMore] = useState(initialPage.hasMore);
  const [nextCursor, setNextCursor] = useState(initialPage.nextCursor);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [sortBy, setSortBy] = useState<"newest" | "oldest" | "progress">("newest");

  const loadMoreEvents = async () => {
    if (!hasMore || !nextCursor || isLoadingMore) return;

    setIsLoadingMore(true);
    try {
      const nextPage = await getPublicEventsPage({
        cursor: nextCursor,
        limit: BROWSE_PAGE_SIZE,
      });
      setEvents((current) => {
        const merged = new Map(current.map((event) => [event.id, event] as const));
        for (const event of nextPage.events) {
          merged.set(event.id, event);
        }
        return Array.from(merged.values());
      });
      setHasMore(nextPage.hasMore);
      setNextCursor(nextPage.nextCursor);
    } catch (error) {
      console.error("[BrowseEvents] failed to load next page:", error);
      toast.error(t("unableToLoad"));
    } finally {
      setIsLoadingMore(false);
    }
  };

  const filteredEvents = useMemo(() => {
    let result = [...events];

    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      result = result.filter(
        (ev) =>
          ev.name.toLowerCase().includes(query) ||
          ev.description?.toLowerCase().includes(query)
      );
    }

    result.sort((a, b) => {
      if (sortBy === "newest") {
        return new Date(b.created_at || 0).getTime() - new Date(a.created_at || 0).getTime();
      }
      if (sortBy === "oldest") {
        return new Date(a.created_at || 0).getTime() - new Date(b.created_at || 0).getTime();
      }
      if (sortBy === "progress") {
        const progressA = a.claimed / a.total;
        const progressB = b.claimed / b.total;
        return progressB - progressA;
      }
      return 0;
    });

    return result;
  }, [events, searchQuery, sortBy]);

  return (
    <div className="space-y-6">
      <div className="app-toolbar">
        <form
          role="search"
          className="relative flex-1 max-w-md"
          onSubmit={(event) => event.preventDefault()}
        >
          <label htmlFor="circle-search" className="sr-only">
            {t("searchLabel")}
          </label>
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            id="circle-search"
            name="circle-search"
            type="search"
            autoComplete="off"
            enterKeyHint="search"
            placeholder={t("searchCircles")}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="rounded-full border-quran-border bg-white/85 pl-10"
          />
        </form>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" className="w-full gap-2 rounded-full border-quran-border bg-white/85 sm:w-auto">
              <ArrowUpDown className="h-4 w-4" />
              {t("sortBy")} {sortBy === "newest" ? t("newest") : sortBy === "oldest" ? t("oldest") : t("progress")}
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="rounded-xl border-quran-border bg-quran-card">
            <DropdownMenuItem onClick={() => setSortBy("newest")}>{t("newestFirst")}</DropdownMenuItem>
            <DropdownMenuItem onClick={() => setSortBy("oldest")}>{t("oldestFirst")}</DropdownMenuItem>
            <DropdownMenuItem onClick={() => setSortBy("progress")}>{t("mostProgress")}</DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {filteredEvents.length === 0 ? (
        <div className="app-empty-state">
          <div className="relative mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-[1.2rem] border border-quran-border/60 bg-white/75 text-quran-green shadow-sm">
            <Compass className="h-7 w-7" />
          </div>
          <h3 className="relative font-heading text-3xl text-quran-deep">{t("noCirclesFound")}</h3>
          <p className="relative mx-auto mt-2 max-w-md text-quran-muted">
            {searchQuery ? t("adjustSearch") : t("beTheFirst")}
          </p>
          {!searchQuery && (
            <Button asChild className="mt-6 rounded-full px-6">
              <Link href="/">{t("createACircle")}</Link>
            </Button>
          )}
        </div>
      ) : (
        <div className="space-y-6">
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {filteredEvents.map((ev) => (
              <Link
                key={ev.id}
                href={`/s/${ev.short_code}`}
                className="quran-card-interactive group flex h-full min-h-60 flex-col overflow-hidden p-6"
              >
                <div className="mb-3 flex items-start justify-between gap-2">
                  <h2 className="min-h-[3.5rem] font-heading text-2xl leading-tight text-quran-deep transition-colors group-hover:text-quran-green">
                    {ev.name}
                  </h2>
                  <span className="rounded-full border border-quran-border bg-white/70 px-2.5 py-1 text-xs font-semibold text-quran-muted">
                    {Math.round((ev.claimed / ev.total) * 100)}%
                  </span>
                </div>

                <p
                  className={`mb-4 min-h-10 line-clamp-2 text-sm ${
                    ev.description ? "text-quran-muted" : "opacity-0"
                  }`}
                  aria-hidden={!ev.description}
                >
                  {ev.description ?? t("noDescription")}
                </p>

                <div className="mt-auto">
                  <Progress
                    value={(ev.claimed / ev.total) * 100}
                    aria-label={`${ev.name}: ${ev.claimed}/${ev.total} ${t("juzClaimed")}`}
                    className="h-2 bg-quran-border/50"
                  />
                  <div className="mt-3 flex items-center justify-between text-xs text-quran-muted">
                    <span>{ev.claimed}/{ev.total} {t("juzClaimed")}</span>
                    <span className="inline-flex items-center gap-1 rounded-full bg-quran-green/5 px-2 py-0.5 text-quran-green">
                      <Users2 className="h-3 w-3" />
                      {t("open")}
                    </span>
                  </div>
                </div>
              </Link>
            ))}
          </div>

          {hasMore && (
            <div className="flex justify-center">
              <Button
                type="button"
                variant="outline"
                className="rounded-full border-quran-border bg-white/80"
                disabled={isLoadingMore}
                onClick={() => void loadMoreEvents()}
              >
                {isLoadingMore ? t("loading") : t("loadMore")}
              </Button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
