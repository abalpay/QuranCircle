"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { Home, Layers3, Compass, UserCircle, LogOut, Settings, Globe2 } from "lucide-react";
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
import { useTranslations, useLocale } from "next-intl";

export default function MobileNavigation() {
  const pathname = usePathname();
  const router = useRouter();
  const locale = useLocale();
  const t = useTranslations("MobileNav");
  const { user, isAuthenticatedUser, signOut } = useAuth();
  const { openAuthModal } = useAuthModal();
  const [isProfileOpen, setIsProfileOpen] = useState(false);

  const handleLanguageSwitch = () => {
    const newLocale = locale === "en" ? "tr" : "en";
    document.cookie = `NEXT_LOCALE=${newLocale}; path=/; max-age=31536000`;
    router.refresh();
  };

  const displayName =
    (isAuthenticatedUser && (user?.user_metadata?.username as string)) ||
    (isAuthenticatedUser && user?.email?.split("@")[0]) ||
    "User";

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
        aria-label="Mobile navigation"
        className="mobile-bottom-nav md:hidden"
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
              isProfileOpen ? "is-active" : ""
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
          className="rounded-t-2xl border-quran-border bg-quran-card"
        >
          <SheetHeader>
            <SheetTitle className="text-quran-deep">
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
            <button
              onClick={handleLanguageSwitch}
              className="flex w-full items-center justify-center gap-2 rounded-xl bg-white/70 border border-quran-border px-4 py-3 text-sm font-medium text-quran-deep transition-colors active:bg-white"
            >
              <Globe2 className="h-4 w-4" />
              {t("language")}: {locale === "en" ? t("english") : t("turkish")}
            </button>
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
