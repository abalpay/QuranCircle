import * as React from "react";
import { cn } from "@/lib/utils";

type ProgressAccessibleName =
  | { "aria-label": string; "aria-labelledby"?: never }
  | { "aria-label"?: never; "aria-labelledby": string };

type ProgressProps = Omit<
  React.HTMLAttributes<HTMLDivElement>,
  "aria-label" | "aria-labelledby"
> &
  ProgressAccessibleName & {
    value?: number | null;
  };

function clampProgress(value: number) {
  if (!Number.isFinite(value)) return 0;
  return Math.min(100, Math.max(0, value));
}

function Progress({ className, value = 0, ...props }: ProgressProps) {
  const clampedValue = clampProgress(value ?? 0);

  return (
    <div
      data-slot="progress"
      role="progressbar"
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={Math.round(clampedValue)}
      className={cn(
        "bg-primary/20 relative h-2 w-full overflow-hidden rounded-full",
        className
      )}
      {...props}
    >
      <div
        data-slot="progress-indicator"
        aria-hidden="true"
        className="bg-primary h-full w-full flex-1 transition-transform motion-reduce:transition-none"
        style={{ transform: `translateX(-${100 - clampedValue}%)` }}
      />
    </div>
  );
}

export { Progress };
