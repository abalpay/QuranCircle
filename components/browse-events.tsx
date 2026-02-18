"use client";

import { useState, useMemo } from "react";
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

type Event = {
  id: string;
  name: string;
  description?: string | null;
  short_code: string;
  claimed: number;
  total: number;
  created_at?: string;
};

type Props = {
  initialEvents: Event[];
};

export default function BrowseEvents({ initialEvents }: Props) {
  const [searchQuery, setSearchQuery] = useState("");
  const [sortBy, setSortBy] = useState<"newest" | "oldest" | "progress">("newest");

  const filteredEvents = useMemo(() => {
    let result = [...initialEvents];

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
  }, [initialEvents, searchQuery, sortBy]);

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search circles..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9 rounded-full border-quran-border bg-white/80"
          />
        </div>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" className="rounded-full border-quran-border bg-white/80 gap-2">
              <ArrowUpDown className="h-4 w-4" />
              Sort by: {sortBy === "newest" ? "Newest" : sortBy === "oldest" ? "Oldest" : "Progress"}
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="rounded-xl border-quran-border bg-quran-card">
            <DropdownMenuItem onClick={() => setSortBy("newest")}>Newest First</DropdownMenuItem>
            <DropdownMenuItem onClick={() => setSortBy("oldest")}>Oldest First</DropdownMenuItem>
            <DropdownMenuItem onClick={() => setSortBy("progress")}>Most Progress</DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {filteredEvents.length === 0 ? (
        <div className="quran-card p-12 text-center">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-quran-green/10 text-quran-green">
            <Compass className="h-7 w-7" />
          </div>
          <h3 className="font-heading text-xl text-quran-deep">No circles found</h3>
          <p className="mt-2 text-quran-muted">
            {searchQuery ? "Try adjusting your search terms." : "Be the first to create a public circle."}
          </p>
          {!searchQuery && (
            <Button asChild className="mt-6 rounded-full px-6">
              <Link href="/">Create A Circle</Link>
            </Button>
          )}
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {filteredEvents.map((ev) => (
            <Link
              key={ev.id}
              href={`/s/${ev.short_code}`}
              className="quran-card-interactive group block h-full p-5 bg-white/60"
            >
              <div className="mb-3 flex items-start justify-between gap-2">
                <h2 className="font-heading text-2xl leading-tight text-quran-deep group-hover:text-quran-green transition-colors">
                  {ev.name}
                </h2>
                <span className="rounded-full border border-quran-border bg-white/70 px-2.5 py-1 text-xs font-semibold text-quran-muted">
                  {Math.round((ev.claimed / ev.total) * 100)}%
                </span>
              </div>

              {ev.description && (
                <p className="mb-4 line-clamp-2 text-sm text-quran-muted">
                  {ev.description}
                </p>
              )}

              <div className="mt-auto">
                <Progress
                  value={(ev.claimed / ev.total) * 100}
                  className="h-2 bg-quran-border/50"
                />
                <div className="mt-3 flex items-center justify-between text-xs text-quran-muted">
                  <span>{ev.claimed}/{ev.total} Juz claimed</span>
                  <span className="inline-flex items-center gap-1 rounded-full bg-quran-green/5 px-2 py-0.5 text-quran-green">
                    <Users2 className="h-3 w-3" />
                    Open
                  </span>
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
