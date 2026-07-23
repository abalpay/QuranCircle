"use client";

import { Button } from "@/components/ui/button";
import { Plus, Compass } from "lucide-react";
import { useTranslations } from "next-intl";
import CreateCircleAction from "@/components/create-circle-action";
import AnalyticsLink from "@/components/analytics-link";

type HeroActionsProps = {
  theme?: "light" | "dark";
};

export default function HeroActions({ theme = "light" }: HeroActionsProps) {
  const t = useTranslations("HeroActions");
  const isDark = theme === "dark";

  return (
    <div className="mt-8 flex w-full flex-col gap-3 sm:w-auto sm:flex-row">
      <CreateCircleAction
        source="home_hero"
        size="lg"
        className={
          isDark
            ? "h-12 w-full rounded-full bg-[hsl(150_30%_98%)] px-8 text-base font-semibold text-quran-deep shadow-[0_18px_40px_-24px_hsl(168_70%_5%)] transition-transform hover:bg-white hover:scale-[1.02] active:scale-[0.98] sm:w-auto"
            : "h-12 w-full rounded-full px-8 text-base font-medium text-primary-foreground shadow-[0_14px_26px_-18px_var(--color-quran-deep)] transition-transform hover:scale-[1.02] active:scale-[0.98] sm:w-auto"
        }
      >
        <Plus className="mr-2 h-5 w-5" />
        {t("startAKhatm")}
      </CreateCircleAction>
      <Button
        asChild
        size="lg"
        variant="outline"
        className={
          isDark
            ? "h-12 w-full rounded-full border-white/20 bg-white/[0.06] px-8 text-base font-medium text-[hsl(150_30%_96%)] shadow-none backdrop-blur-sm hover:bg-white/[0.12] hover:text-white sm:w-auto"
            : "h-12 w-full rounded-full border-quran-border bg-white/60 px-8 text-base font-medium text-quran-deep backdrop-blur-sm hover:bg-white/90 sm:w-auto"
        }
      >
        <AnalyticsLink
          href="/browse"
          analyticsAction="browse_circles"
          analyticsSource="home_browse"
        >
          <Compass className="mr-2 h-5 w-5" />
          {t("explorePublic")}
        </AnalyticsLink>
      </Button>
    </div>
  );
}
