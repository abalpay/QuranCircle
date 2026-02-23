import Link from "next/link";
import { Progress } from "@/components/ui/progress";
import { Users2 } from "lucide-react";

type FeaturedEvent = {
  id: string;
  name: string;
  description?: string | null;
  short_code: string;
  claimed: number;
  total: number;
};

type Props = {
  events: FeaturedEvent[];
};

export default function FeaturedCircles({ events }: Props) {
  if (events.length === 0) return null;

  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {events.map((ev) => (
        <Link
          key={ev.id}
          href={`/s/${ev.short_code}`}
          className="quran-card-interactive group flex h-full flex-col bg-white/60 p-5"
        >
          <div className="mb-3 flex items-start justify-between gap-2">
            <h3 className="min-h-[3.25rem] font-heading text-xl leading-tight text-quran-deep transition-colors group-hover:text-quran-green sm:text-2xl">
              {ev.name}
            </h3>
            <span className="inline-flex shrink-0 items-center gap-1 rounded-full bg-quran-green/10 px-2.5 py-1 text-xs font-semibold text-quran-green">
              <Users2 className="h-3 w-3" />
              Join
            </span>
          </div>

          <p
            className={`mb-4 min-h-10 line-clamp-2 text-sm ${
              ev.description ? "text-quran-muted" : "opacity-0"
            }`}
            aria-hidden={!ev.description}
          >
            {ev.description ?? "No description provided."}
          </p>

          <div className="mt-auto">
            <Progress
              value={(ev.claimed / ev.total) * 100}
              className="h-2 bg-quran-border/50"
            />
            <p className="mt-3 text-xs text-quran-muted">
              {ev.claimed}/{ev.total} Juz claimed
            </p>
          </div>
        </Link>
      ))}
    </div>
  );
}
