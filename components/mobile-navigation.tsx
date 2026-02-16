"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Home, PlusCircle, Compass, UserCircle, LogOut, Settings } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { useAuthModal } from "@/hooks/use-auth-modal";
import { useState } from "react";
import CreateKhatimDialog from "@/components/create-khatim-dialog";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";

export default function MobileNavigation() {
  const pathname = usePathname();
  const { user, signOut } = useAuth();
  const { openAuthModal } = useAuthModal();
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isProfileOpen, setIsProfileOpen] = useState(false);

  const displayName =
    (user?.user_metadata?.username as string) ||
    user?.email?.split("@")[0] ||
    "User";

  const handleCreate = () => {
    if (user) {
      setIsCreateOpen(true);
    } else {
      openAuthModal("login", () => setIsCreateOpen(true));
    }
  };

  const handleProfileTap = () => {
    if (user) {
      setIsProfileOpen(true);
    } else {
      openAuthModal("login");
    }
  };

  return (
    <>
      <nav
        className="fixed inset-x-0 bottom-0 z-40 px-4 md:hidden"
      >
        <div className="safe-area-bottom mx-auto grid h-16 max-w-md grid-cols-4 items-center rounded-2xl border border-quran-border/85 bg-quran-card/94 shadow-[0_18px_42px_-22px_var(--color-quran-deep)] backdrop-blur-xl">
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
            className="mx-1 flex flex-col items-center justify-center rounded-xl bg-quran-green py-2 text-white transition-transform active:scale-[0.96]"
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
          <button
            onClick={handleProfileTap}
            className={`mx-1 flex flex-col items-center justify-center rounded-xl py-2 transition-colors ${
              isProfileOpen
                ? "bg-quran-green/14 text-quran-green"
                : "text-quran-muted"
            }`}
          >
            <UserCircle className="h-5 w-5" />
            <span className="mt-1 max-w-[64px] truncate text-[11px] font-medium">
              {user ? displayName : "Sign In"}
            </span>
          </button>
        </div>
      </nav>

      <CreateKhatimDialog
        isOpen={isCreateOpen}
        onClose={() => setIsCreateOpen(false)}
      />

      <Sheet open={isProfileOpen} onOpenChange={setIsProfileOpen}>
        <SheetContent
          side="bottom"
          showCloseButton={false}
          className="rounded-t-2xl border-quran-border bg-quran-card"
        >
          <SheetHeader>
            <SheetTitle className="text-quran-deep">
              Salam, {displayName}
            </SheetTitle>
            {user?.email && (
              <SheetDescription className="text-quran-muted">
                {user.email}
              </SheetDescription>
            )}
          </SheetHeader>
          <div className="space-y-3 px-4 pb-6">
            <Link
              href="/account"
              onClick={() => setIsProfileOpen(false)}
              className="flex w-full items-center justify-center gap-2 rounded-xl bg-white/70 border border-quran-border px-4 py-3 text-sm font-medium text-quran-deep transition-colors active:bg-white"
            >
              <Settings className="h-4 w-4" />
              Account Settings
            </Link>
            <button
              onClick={() => {
                setIsProfileOpen(false);
                setTimeout(() => signOut(), 300);
              }}
              className="flex w-full items-center justify-center gap-2 rounded-xl bg-red-50 px-4 py-3 text-sm font-medium text-red-600 transition-colors active:bg-red-100"
            >
              <LogOut className="h-4 w-4" />
              Log out
            </button>
          </div>
        </SheetContent>
      </Sheet>
    </>
  );
}
