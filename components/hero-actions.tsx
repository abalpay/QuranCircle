"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Plus, Compass } from "lucide-react";
import Link from "next/link";
import CreateKhatimDialog from "@/components/create-khatim-dialog";
import { useAuth } from "@/hooks/use-auth";
import { useAuthModal } from "@/hooks/use-auth-modal";

export default function HeroActions() {
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const { user } = useAuth();
  const { openAuthModal } = useAuthModal();

  const handleCreate = () => {
    if (user) {
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
          Start A Khatm Circle
        </Button>
        <Button
          asChild
          size="lg"
          variant="outline"
          className="h-12 w-full rounded-full border-quran-border bg-white/60 px-8 text-base font-medium text-quran-deep backdrop-blur-sm hover:bg-white/90 sm:w-auto"
        >
          <Link href="/browse">
            <Compass className="mr-2 h-5 w-5" />
            Explore Public Circles
          </Link>
        </Button>
      </div>

      <CreateKhatimDialog
        isOpen={isCreateOpen}
        onClose={() => setIsCreateOpen(false)}
      />
    </>
  );
}
