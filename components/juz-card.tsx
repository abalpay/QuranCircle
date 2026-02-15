"use client";

import { CheckCircle2, Lock, X, Check, Undo2 } from "lucide-react";
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
  onUnclaim: () => void;
  onMarkRead?: () => void;
  onUnmarkRead?: () => void;
  isLocked: boolean;
  isOwner: boolean;
};

export default function JuzCard({
  juz,
  onClaim,
  onUnclaim,
  onMarkRead,
  onUnmarkRead,
  isLocked,
  isOwner,
}: Props) {
  const isUnclaimed = juz.status === "unclaimed";
  const isClaimed = juz.status === "claimed";
  const isRead = juz.status === "read";
  const canClaim = isUnclaimed && !isLocked;
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
        isClaimed &&
          "border-t-amber-400 bg-linear-to-b from-amber-50/80 to-amber-50/30",
        isRead &&
          "border-t-emerald-500 bg-linear-to-b from-emerald-50/80 to-emerald-50/30"
      )}
      onClick={() => canClaim && onClaim()}
      onKeyDown={(e) => {
        if (canClaim && (e.key === "Enter" || e.key === " ")) {
          e.preventDefault();
          onClaim();
        }
      }}
      role={canClaim ? "button" : undefined}
      tabIndex={canClaim ? 0 : -1}
      title={
        canClaim
          ? `Tap to claim Juz ${juz.juz_number}`
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

      {/* Action buttons for owners */}
      {isClaimed && isOwner && (
        <div className="absolute right-0.5 top-0.5 flex gap-0.5 opacity-0 transition-opacity group-hover:opacity-100">
          {onMarkRead && (
            <button
              className="flex h-5 w-5 items-center justify-center rounded-full text-emerald-500 hover:bg-emerald-100"
              onClick={(e) => {
                e.stopPropagation();
                onMarkRead();
              }}
              title="Mark as read"
            >
              <Check className="h-3 w-3" />
            </button>
          )}
          <button
            className="flex h-5 w-5 items-center justify-center rounded-full text-amber-400 hover:bg-amber-100 hover:text-red-500"
            onClick={(e) => {
              e.stopPropagation();
              onUnclaim();
            }}
            title="Unclaim"
          >
            <X className="h-3 w-3" />
          </button>
        </div>
      )}

      {/* Action buttons for read state owners */}
      {isRead && isOwner && (
        <div className="absolute right-0.5 top-0.5 flex gap-0.5 opacity-0 transition-opacity group-hover:opacity-100">
          {onUnmarkRead && (
            <button
              className="flex h-5 w-5 items-center justify-center rounded-full text-amber-500 hover:bg-amber-100"
              onClick={(e) => {
                e.stopPropagation();
                onUnmarkRead();
              }}
              title="Mark as unread"
            >
              <Undo2 className="h-3 w-3" />
            </button>
          )}
          <button
            className="flex h-5 w-5 items-center justify-center rounded-full text-emerald-400 hover:bg-red-100 hover:text-red-500"
            onClick={(e) => {
              e.stopPropagation();
              onUnclaim();
            }}
            title="Unclaim"
          >
            <X className="h-3 w-3" />
          </button>
        </div>
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
