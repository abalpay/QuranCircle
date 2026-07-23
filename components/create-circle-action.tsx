"use client";

import type { ComponentProps } from "react";
import { useState } from "react";
import dynamic from "next/dynamic";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/use-auth";
import { useAuthModal } from "@/hooks/use-auth-modal";
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
  const { isAuthenticatedUser } = useAuth();
  const { openAuthModal } = useAuthModal();

  const handleCreate: NonNullable<ComponentProps<typeof Button>["onClick"]> = (
    event
  ) => {
    trackProductEvent("CTA Clicked", {
      action: "create_circle",
      source,
    });
    onClick?.(event);
    if (event.defaultPrevented) return;

    if (isAuthenticatedUser) {
      setIsCreateOpen(true);
      return;
    }

    trackProductEvent("Auth Started", { action: "login", source });
    openAuthModal("login", () => setIsCreateOpen(true));
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
