"use client";

import type { ComponentProps } from "react";
import Link from "next/link";
import {
  trackProductEvent,
  type ConversionSource,
} from "@/lib/analytics";

type AnalyticsLinkProps = ComponentProps<typeof Link> & {
  analyticsAction: "browse_circles" | "read_guide";
  analyticsSource: ConversionSource;
};

export default function AnalyticsLink({
  analyticsAction,
  analyticsSource,
  onClick,
  ...props
}: AnalyticsLinkProps) {
  return (
    <Link
      {...props}
      onClick={(event) => {
        trackProductEvent("CTA Clicked", {
          action: analyticsAction,
          source: analyticsSource,
        });
        onClick?.(event);
      }}
    />
  );
}
