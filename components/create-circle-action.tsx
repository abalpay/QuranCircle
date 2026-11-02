"use client";

import type { ComponentProps } from "react";
import { useState } from "react";
import dynamic from "next/dynamic";
import { Button } from "@/components/ui/button";
import {
  trackProductEvent,
  type ConversionSource,
} from "@/lib/analytics";

const CreateKhatimDialog = dynamic(
  () => import("@/components/create-khatim-dialog"),
  { ssr: false }
);

type CreateCircleActionProps = ComponentProps<typeof Button> & {
  source: ConversionSource;
};

export default function CreateCircleAction({
  source,
  onClick,
  children,
  ...buttonProps
}: CreateCircleActionProps) {
  const [isCreateOpen, setIsCreateOpen] = useState(false);

  const handleCreate: NonNullable<ComponentProps<typeof Button>["onClick"]> = (
    event
  ) => {
    trackProductEvent("CTA Clicked", {
      action: "create_circle",
      source,
    });
    onClick?.(event);
    if (event.defaultPrevented) return;

    setIsCreateOpen(true);
  };

  return (
    <>
      <Button {...buttonProps} onClick={handleCreate}>
        {children}
      </Button>
      {isCreateOpen ? (
        <CreateKhatimDialog
          isOpen={isCreateOpen}
          onClose={() => setIsCreateOpen(false)}
          source={source}
        />
      ) : null}
    </>
  );
}
