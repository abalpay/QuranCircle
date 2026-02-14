"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Home, PlusCircle, Compass } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { useAuthModal } from "@/hooks/use-auth-modal";
import { useState } from "react";
import CreateKhatimDialog from "@/components/create-khatim-dialog";

export default function MobileNavigation() {
  const pathname = usePathname();
  const { user } = useAuth();
  const { openAuthModal } = useAuthModal();
  const [isCreateOpen, setIsCreateOpen] = useState(false);

  const handleCreate = () => {
    if (user) {
      setIsCreateOpen(true);
    } else {
      openAuthModal("login");
    }
  };

  return (
    <>
      <nav
        className="fixed inset-x-0 bottom-0 z-40 px-4 md:hidden"
      >
        <div className="safe-area-bottom mx-auto grid h-16 max-w-md grid-cols-3 items-center rounded-2xl border border-quran-border/85 bg-quran-card/94 shadow-[0_18px_42px_-22px_var(--color-quran-deep)] backdrop-blur-xl">
          <Link
            href="/"
            className={`mx-1 flex flex-col items-center justify-center rounded-xl py-2 transition-colors ${
              pathname === "/"
                ? "bg-quran-green/14 text-quran-green"
                : "text-quran-muted"
            }`}
          >
            <Home className="h-5 w-5" />
            <span className="mt-1 text-[11px] font-medium">Home</span>
          </Link>
          <button
            onClick={handleCreate}
            className="mx-1 flex flex-col items-center justify-center rounded-xl py-2 text-quran-green transition-transform active:scale-[0.98]"
          >
            <PlusCircle className="h-5 w-5" />
            <span className="mt-1 text-[11px] font-semibold uppercase tracking-[0.14em]">
              Create
            </span>
          </button>
          <Link
            href="/browse"
            className={`mx-1 flex flex-col items-center justify-center rounded-xl py-2 transition-colors ${
              pathname === "/browse"
                ? "bg-quran-green/14 text-quran-green"
                : "text-quran-muted"
            }`}
          >
            <Compass className="h-5 w-5" />
            <span className="mt-1 text-[11px] font-medium">Browse</span>
          </Link>
        </div>
      </nav>

      <CreateKhatimDialog
        isOpen={isCreateOpen}
        onClose={() => setIsCreateOpen(false)}
      />
    </>
  );
}
