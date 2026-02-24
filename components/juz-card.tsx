"use client";

import { Check, CheckCircle2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { useTranslations } from "next-intl";

type Juz = {
  id: string;
  juz_number: number;
  status: string;
  claimed_by_name: string | null;
};

type Props = {
  juz: Juz;
  onClaim: () => void;
  isReadOnly: boolean;
  isSelected?: boolean;
};

export default function JuzCard({
  juz,
  onClaim,
  isReadOnly,
  isSelected = false,
}: Props) {
  const t = useTranslations("JuzCard");
  const isUnclaimed = juz.status === "unclaimed";
  const canClaim = isUnclaimed && !isReadOnly;
  const isClaimed = juz.status === "claimed";
  const isRead = juz.status === "read";
  const isInteractive = canClaim;
  const firstName = juz.claimed_by_name?.split(" ")[0] || "";

  return (
    <div
      className={cn(
        "group relative flex aspect-square flex-col items-center justify-center overflow-hidden rounded-xl border-t-[3px] transition-all duration-200",
        // Base border + background per state
        isUnclaimed && !isSelected && [
          "border-quran-border/50 bg-white/70",
          canClaim &&
            "cursor-pointer hover:-translate-y-0.5 hover:border-t-quran-green hover:bg-white hover:shadow-md hover:shadow-quran-green/8",
          isReadOnly && "opacity-60",
        ],
        isSelected && [
          "cursor-pointer ring-2 ring-quran-green border-t-quran-green bg-quran-green/10 shadow-md -translate-y-0.5",
        ],
        isClaimed && [
          "border-t-amber-400 bg-linear-to-b from-amber-50/80 to-amber-50/30",
        ],
        isRead &&
          "border-t-emerald-500 bg-linear-to-b from-emerald-50/80 to-emerald-50/30"
      )}
      onClick={() => {
        if (canClaim) onClaim();
      }}
      onKeyDown={(e) => {
        if (isInteractive && (e.key === "Enter" || e.key === " ")) {
          e.preventDefault();
          if (canClaim) onClaim();
        }
      }}
      role={isInteractive ? "button" : undefined}
      tabIndex={isInteractive ? 0 : -1}
      title={
        isSelected
          ? t("selected", { number: juz.juz_number })
          : canClaim
            ? t("selectJuz", { number: juz.juz_number })
            : isClaimed
              ? t("claimedBy", { number: juz.juz_number, name: firstName })
              : isRead
                ? t("completed", { number: juz.juz_number })
                : t("juzNumber", { number: juz.juz_number })
      }
    >
      {/* Selected checkmark */}
      {isSelected && (
        <span className="absolute right-1 top-1 flex h-4 w-4 items-center justify-center rounded-full bg-quran-green text-white">
          <Check className="h-2.5 w-2.5" strokeWidth={3} />
        </span>
      )}

      {/* Large centered number */}
      <span
        className={cn(
          "font-heading text-2xl leading-none transition-colors duration-200 sm:text-3xl",
          isSelected && "text-quran-green",
          isUnclaimed && !isSelected &&
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
