"use client";

import { CheckCircle2, Lock } from "lucide-react";
import { cn } from "@/lib/utils";

type Juz = {
  id: string;
  juz_number: number;
  status: string;
  claimed_by_name: string | null;
};

type Props = {
  juz: Juz;
  onClaim: () => void;
  onMarkRead?: () => void;
  isLocked: boolean;
  isOwner: boolean;
};

export default function JuzCard({
  juz,
  onClaim,
  onMarkRead,
  isLocked,
  isOwner,
}: Props) {
  const isUnclaimed = juz.status === "unclaimed";
  const isClaimed = juz.status === "claimed";
  const isRead = juz.status === "read";
  const canClaim = isUnclaimed && !isLocked;
  const canMarkRead = isClaimed && isOwner && !!onMarkRead;
  const isInteractive = canClaim || canMarkRead;
  const firstName = juz.claimed_by_name?.split(" ")[0] || "";

  return (
    <div
      className={cn(
        "group relative flex aspect-square flex-col items-center justify-center overflow-hidden rounded-xl border-t-[3px] transition-all duration-200",
        // Base border + background per state
        isUnclaimed && [
          "border-quran-border/50 bg-white/70",
          canClaim &&
            "cursor-pointer hover:-translate-y-0.5 hover:border-t-quran-green hover:bg-white hover:shadow-md hover:shadow-quran-green/8",
          isLocked && "opacity-60",
        ],
        isClaimed && [
          "border-t-amber-400 bg-linear-to-b from-amber-50/80 to-amber-50/30",
          canMarkRead &&
            "cursor-pointer hover:-translate-y-0.5 hover:border-t-emerald-400 hover:shadow-md hover:shadow-emerald-500/8",
        ],
        isRead &&
          "border-t-emerald-500 bg-linear-to-b from-emerald-50/80 to-emerald-50/30"
      )}
      onClick={() => {
        if (canClaim) onClaim();
        else if (canMarkRead) onMarkRead();
      }}
      onKeyDown={(e) => {
        if (isInteractive && (e.key === "Enter" || e.key === " ")) {
          e.preventDefault();
          if (canClaim) onClaim();
          else if (canMarkRead) onMarkRead();
        }
      }}
      role={isInteractive ? "button" : undefined}
      tabIndex={isInteractive ? 0 : -1}
      title={
        canClaim
          ? `Tap to claim Juz ${juz.juz_number}`
          : canMarkRead
            ? `Tap to mark Juz ${juz.juz_number} as read`
            : isClaimed
              ? `Juz ${juz.juz_number} — ${firstName}`
              : isRead
                ? `Juz ${juz.juz_number} — completed`
                : `Juz ${juz.juz_number}`
      }
    >
      {/* Locked icon */}
      {isLocked && isUnclaimed && (
        <Lock className="absolute right-1.5 top-1.5 h-3 w-3 text-quran-muted/40" />
      )}

      {/* Large centered number */}
      <span
        className={cn(
          "font-heading text-2xl leading-none transition-colors duration-200 sm:text-3xl",
          isUnclaimed &&
            "text-quran-muted/70 group-hover:text-quran-green",
          isClaimed && "text-amber-700",
          isRead && "text-emerald-700"
        )}
      >
        {juz.juz_number}
      </span>

      {/* Status detail below number */}
      {isClaimed && firstName && (
        <span className="mt-1 max-w-[90%] truncate text-[10px] font-medium text-amber-600/80">
          {firstName}
        </span>
      )}

      {isRead && (
        <CheckCircle2 className="mt-1 h-3.5 w-3.5 text-emerald-500" />
      )}
    </div>
  );
}
