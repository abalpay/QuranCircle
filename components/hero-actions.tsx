"use client";

import { Button } from "@/components/ui/button";
import { Plus, Compass } from "lucide-react";
import { useTranslations } from "next-intl";
import CreateCircleAction from "@/components/create-circle-action";
import AnalyticsLink from "@/components/analytics-link";

export default function HeroActions() {
  const t = useTranslations("HeroActions");

  return (
    <div className="mt-8 flex w-full flex-col gap-3 sm:w-auto sm:flex-row">
      <CreateCircleAction
        source="home_hero"
        size="lg"
        className="h-12 w-full rounded-full px-8 text-base font-medium text-primary-foreground shadow-[0_14px_26px_-18px_var(--color-quran-deep)] transition-transform hover:scale-[1.02] active:scale-[0.98] sm:w-auto"
      >
        <Plus className="mr-2 h-5 w-5" />
        {t("startAKhatm")}
      </CreateCircleAction>
      <Button
        asChild
        size="lg"
        variant="outline"
        className="h-12 w-full rounded-full border-quran-border bg-white/60 px-8 text-base font-medium text-quran-deep backdrop-blur-sm hover:bg-white/90 sm:w-auto"
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
