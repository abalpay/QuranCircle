"use client";

import { Link, usePathname } from "@/i18n/navigation";
import { Home, Layers3, Compass, UserCircle, LogOut, Settings } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { useAuthModal } from "@/hooks/use-auth-modal";
import { useState } from "react";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";
import { useTranslations } from "next-intl";
import LanguageSelect from "@/components/language-select";

export default function MobileNavigation() {
  const pathname = usePathname();
  const t = useTranslations("MobileNav");
  const { user, isAuthenticatedUser, signOut } = useAuth();
  const { openAuthModal } = useAuthModal();
  const [isProfileOpen, setIsProfileOpen] = useState(false);

  const displayName =
    (isAuthenticatedUser && (user?.user_metadata?.username as string)) ||
    (isAuthenticatedUser && user?.email?.split("@")[0]) ||
    t("user");

  const handleProfileTap = () => {
    if (isAuthenticatedUser) {
      setIsProfileOpen(true);
    } else {
      openAuthModal("login");
    }
  };

  return (
    <>
      <nav
        aria-label={t("mobileNavigation")}
        className="mobile-bottom-nav lg:hidden"
        data-mobile-navigation
      >
        <div className="mobile-bottom-nav-surface">
          <Link
            href="/"
            aria-current={pathname === "/" ? "page" : undefined}
            className={`mobile-bottom-nav-item ${
              pathname === "/" ? "is-active" : ""
            }`}
          >
            <Home aria-hidden="true" />
            <span>{t("home")}</span>
          </Link>
          <Link
            href="/my-circles"
            aria-current={pathname === "/my-circles" ? "page" : undefined}
            className={`mobile-bottom-nav-item ${
              pathname === "/my-circles" ? "is-active" : ""
            }`}
          >
            <Layers3 aria-hidden="true" />
            <span>{t("myCircles")}</span>
          </Link>
          <Link
            href="/browse"
            aria-current={pathname === "/browse" ? "page" : undefined}
            className={`mobile-bottom-nav-item ${
              pathname === "/browse" ? "is-active" : ""
            }`}
          >
            <Compass aria-hidden="true" />
            <span>{t("browse")}</span>
          </Link>
          <button
            type="button"
            onClick={handleProfileTap}
            className={`mobile-bottom-nav-item ${
              isProfileOpen || pathname === "/account" ? "is-active" : ""
            }`}
          >
            <UserCircle aria-hidden="true" />
            <span>
              {isAuthenticatedUser ? displayName : t("signIn")}
            </span>
          </button>
        </div>
      </nav>

      <Sheet open={isProfileOpen} onOpenChange={setIsProfileOpen}>
        <SheetContent
          side="bottom"
          showCloseButton={false}
          className="rounded-t-[1.75rem] border-quran-border bg-quran-card pb-[max(1rem,env(safe-area-inset-bottom))] shadow-[0_-24px_64px_-34px_hsl(var(--quran-deep)/0.65)]"
        >
          <SheetHeader className="px-5 pt-6">
            <div className="mb-2 h-1 w-12 self-center rounded-full bg-quran-border" aria-hidden />
            <SheetTitle className="font-heading text-3xl text-quran-deep">
              {t("salam")}, {displayName}
            </SheetTitle>
            {isAuthenticatedUser && user?.email && (
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
              {t("accountSettings")}
            </Link>
            <LanguageSelect />
            <button
              onClick={() => {
                setIsProfileOpen(false);
                setTimeout(() => signOut(), 300);
              }}
              className="flex w-full items-center justify-center gap-2 rounded-xl bg-red-50 px-4 py-3 text-sm font-medium text-red-600 transition-colors active:bg-red-100"
            >
              <LogOut className="h-4 w-4" />
              {t("logOut")}
            </button>
          </div>
        </SheetContent>
      </Sheet>
    </>
  );
}
