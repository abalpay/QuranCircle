"use client";

import { BookOpen, CheckCircle2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { textScript } from "@/lib/text-script";
import { useTranslations } from "next-intl";

type Juz = {
  id: string;
  juz_number: number;
  status: string;
  claimed_by_name: string | null;
  is_mine?: boolean;
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
  const isMine = Boolean(juz.is_mine) && !isUnclaimed;
  const fullName = juz.claimed_by_name?.trim() || "";
  const firstName = fullName.split(/\s+/)[0] || "";

  const state = isRead
    ? t("stateDone")
    : isClaimed
      ? t("stateReading")
      : t("stateAvailable");

  // aria-pressed already says "selected"; the visible title spells it out.
  const label = canClaim
    ? t("selectJuz", { number: juz.juz_number })
    : fullName
        ? t(isMine ? "tileByMine" : "tileBy", {
            number: juz.juz_number,
            state,
            name: fullName,
          })
        : t("tile", { number: juz.juz_number, state });

  return (
    <div
      className={cn(
        "group relative flex min-h-[4.75rem] flex-col items-center justify-center overflow-hidden rounded-xl border px-1.5 py-2 transition-[transform,background-color,border-color,box-shadow] duration-200 motion-reduce:transition-none",
        isUnclaimed &&
          !isSelected && [
            "border-quran-border/60 bg-white/70",
            canClaim &&
              "cursor-pointer hover:-translate-y-0.5 hover:border-quran-green hover:bg-white hover:shadow-md hover:shadow-quran-green/8 motion-reduce:hover:translate-y-0",
            !canClaim && "opacity-70",
          ],
        isSelected &&
          "cursor-pointer -translate-y-0.5 border-quran-green bg-white shadow-md ring-2 ring-quran-green motion-reduce:translate-y-0",
        isClaimed && "border-amber-300/70 bg-amber-50",
        isRead && "border-emerald-600/60 bg-emerald-100",
        isMine && "ring-2 ring-quran-green"
      )}
      onClick={() => {
        if (canClaim) onClaim();
      }}
      onKeyDown={(e) => {
        if (canClaim && (e.key === "Enter" || e.key === " ")) {
          e.preventDefault();
          onClaim();
        }
      }}
      role={canClaim ? "button" : "img"}
      tabIndex={canClaim ? 0 : undefined}
      aria-pressed={canClaim ? isSelected : undefined}
      aria-label={label}
      title={isSelected ? t("selected", { number: juz.juz_number }) : label}
    >
      {/* Marks: "You" in words (never colour alone); state as an icon */}
      {isMine && (
        <span
          aria-hidden="true"
          className="absolute start-1 top-1 rounded bg-quran-green px-1 text-xs font-semibold leading-4 text-white"
        >
          {t("you")}
        </span>
      )}
      {isClaimed && (
        <BookOpen
          aria-hidden="true"
          className="absolute end-1.5 top-1.5 h-3.5 w-3.5 text-amber-800"
        />
      )}
      {isRead && (
        <CheckCircle2
          aria-hidden="true"
          className="absolute end-1 top-1 size-4 text-emerald-800"
        />
      )}

      <span
        aria-hidden="true"
        className={cn(
          "mt-3 font-heading text-2xl leading-none tabular-nums lining-nums transition-colors duration-200 motion-reduce:transition-none sm:text-3xl",
          isSelected && "text-quran-green",
          isUnclaimed &&
            !isSelected &&
            "text-quran-muted group-hover:text-quran-green",
          isClaimed && "text-amber-900",
          isRead && "text-emerald-800"
        )}
      >
        {juz.juz_number}
      </span>

      {(isClaimed || isRead) && firstName && (
        <span
          aria-hidden="true"
          dir="auto"
          data-script={textScript(firstName)}
          className="mt-1 block max-w-full truncate text-xs font-medium leading-4 text-quran-deep data-[script=arabic]:text-[13px]"
        >
          {firstName}
        </span>
      )}
    </div>
  );
}
