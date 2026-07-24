import type { ComponentType, ReactNode } from "react";
import { cn } from "@/lib/utils";

type AppPageHeroProps = {
  eyebrow: string;
  title: string;
  description: string;
  icon?: ComponentType<{ className?: string }>;
  children?: ReactNode;
  compact?: boolean;
};

export default function AppPageHero({
  eyebrow,
  title,
  description,
  icon: Icon,
  children,
  compact = false,
}: AppPageHeroProps) {
  return (
    <section className={cn("app-page-hero", compact && "app-page-hero-compact")}>
      <div className="app-page-hero-copy">
        <div className="app-page-eyebrow">
          {Icon ? <Icon className="h-4 w-4" /> : null}
          <span>{eyebrow}</span>
        </div>
        <h1 className="app-page-title">{title}</h1>
        <p className="app-page-description">{description}</p>
      </div>
      {children ? <div className="app-page-hero-aside">{children}</div> : null}
    </section>
  );
}
