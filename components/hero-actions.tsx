"use client";

import { useState } from "react";
import dynamic from "next/dynamic";
import { Button } from "@/components/ui/button";
import { Plus, Compass } from "lucide-react";
import Link from "next/link";
import { useAuth } from "@/hooks/use-auth";
import { useAuthModal } from "@/hooks/use-auth-modal";
import { useTranslations } from "next-intl";

const CreateKhatimDialog = dynamic(
  () => import("@/components/create-khatim-dialog"),
  { ssr: false }
);

export default function HeroActions() {
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const t = useTranslations("HeroActions");
  const { isAuthenticatedUser } = useAuth();
  const { openAuthModal } = useAuthModal();

  const handleCreate = () => {
    if (isAuthenticatedUser) {
      setIsCreateOpen(true);
    } else {
      openAuthModal("login", () => setIsCreateOpen(true));
    }
  };

  return (
    <>
      <div className="mt-8 flex w-full flex-col gap-3 sm:w-auto sm:flex-row">
        <Button
          size="lg"
          className="h-12 w-full rounded-full px-8 text-base font-medium text-primary-foreground shadow-[0_14px_26px_-18px_var(--color-quran-deep)] transition-transform hover:scale-[1.02] active:scale-[0.98] sm:w-auto"
          onClick={handleCreate}
        >
          <Plus className="mr-2 h-5 w-5" />
          {t("startAKhatm")}
        </Button>
        <Button
          asChild
          size="lg"
          variant="outline"
          className="h-12 w-full rounded-full border-quran-border bg-white/60 px-8 text-base font-medium text-quran-deep backdrop-blur-sm hover:bg-white/90 sm:w-auto"
        >
          <Link href="/browse">
            <Compass className="mr-2 h-5 w-5" />
            {t("explorePublic")}
          </Link>
        </Button>
      </div>

      {isCreateOpen ? (
        <CreateKhatimDialog
          isOpen={isCreateOpen}
          onClose={() => setIsCreateOpen(false)}
        />
      ) : null}
    </>
  );
}
