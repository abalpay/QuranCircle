"use client";

import { useAuth } from "@/hooks/use-auth";
import { useAuthModal } from "@/hooks/use-auth-modal";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  UserCircle,
  ChevronDown,
  Globe2,
  LogOut,
  Settings,
  Layers3,
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import Image from "next/image";
import { toast } from "sonner";
import { useTranslations, useLocale } from "next-intl";

export default function Header() {
  const pathname = usePathname();
  const router = useRouter();
  const locale = useLocale();
  const t = useTranslations("Header");
  const { user, isAuthenticatedUser, signOut } = useAuth();
  const { openAuthModal } = useAuthModal();

  const setLocale = (newLocale: string) => {
    document.cookie = `NEXT_LOCALE=${newLocale}; path=/; max-age=31536000; SameSite=Lax`;
    router.refresh();
  };

  const displayName =
    (isAuthenticatedUser && (user?.user_metadata?.username as string)) ||
    (isAuthenticatedUser && user?.email?.split("@")[0]) ||
    "User";

  return (
    <header className="sticky top-0 z-50 border-b border-quran-border/65 bg-quran-bg/92 backdrop-blur-xl">
      <div className="mx-auto flex w-full max-w-6xl items-center gap-3 px-4 py-3 sm:px-6 lg:px-8">
        <Link href="/" className="group inline-flex items-center gap-3">
          <span className="flex h-10 w-10 items-center justify-center rounded-xl border border-quran-border bg-white/70 shadow-sm transition-transform duration-200 group-hover:scale-[1.03]">
            <Image src="/quran-icon.png" alt="Quran Icon" width={23} height={23} />
          </span>
          <span className="leading-none">
            <span className="block font-heading text-2xl text-quran-green">
              QuranCircle
            </span>
            <span className="block text-[10px] font-semibold uppercase tracking-[0.24em] text-quran-muted">
              {t("readTogether")}
            </span>
          </span>
        </Link>

        <Button
          asChild
          variant="ghost"
          size="sm"
          className={`
            ml-4 hidden rounded-full border md:inline-flex
            ${pathname === "/my-circles"
              ? "border-quran-green/35 bg-quran-green/10 text-quran-green"
              : "border-transparent text-quran-muted hover:border-quran-border hover:bg-white/70"}
          `}
        >
          <Link href="/my-circles">
            <Layers3 className="mr-2 h-4 w-4" />
            {t("myCircles")}
          </Link>
        </Button>

        <div className="ml-auto flex items-center gap-2">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                size="sm"
                className="hidden rounded-full border border-transparent text-quran-muted hover:border-quran-border hover:bg-white/70 md:flex"
              >
                <Globe2 className="mr-1 h-4 w-4" />
                <span className="text-sm">{locale === "tr" ? t("turkish") : t("english")}</span>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent
              align="end"
              className="border-quran-border bg-quran-card"
            >
              <DropdownMenuItem onClick={() => setLocale("en")} disabled={locale === "en"}>
                {t("english")}
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setLocale("tr")} disabled={locale === "tr"}>
                {t("turkish")}
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() =>
                  toast.info(t("comingSoon"), {
                    description: `${t("arabic")} ${t("languageSupportSoon")}`,
                  })
                }
              >
                {t("arabic")}
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() =>
                  toast.info(t("comingSoon"), {
                    description: `${t("urdu")} ${t("languageSupportSoon")}`,
                  })
                }
              >
                {t("urdu")}
              </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>

          {isAuthenticatedUser ? (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="ghost"
                  size="sm"
                  className="hidden rounded-full border border-quran-border/80 bg-white/70 px-3 text-quran-deep hover:bg-white md:flex"
                >
                  <UserCircle className="mr-2 h-4 w-4 text-quran-green" />
                  <span className="text-sm">{t("salam")}, {displayName}</span>
                  <ChevronDown className="ml-1 h-3 w-3" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent
                align="end"
                className="border-quran-border bg-quran-card"
              >
                <DropdownMenuLabel>{t("myAccount")}</DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem asChild>
                  <Link href="/my-circles">
                    <Layers3 className="mr-2 h-4 w-4" />
                    {t("myCircles")}
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuItem asChild>
                  <Link href="/account">
                    <Settings className="mr-2 h-4 w-4" />
                    {t("accountSettings")}
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={() => signOut()}
                  className="text-red-600 focus:bg-red-50 focus:text-red-700"
                >
                  <LogOut className="mr-2 h-4 w-4" />
                  {t("logOut")}
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          ) : (
            <Button
              variant="default"
              size="sm"
              className="hidden rounded-full px-5 text-primary-foreground shadow-[0_12px_24px_-16px_var(--color-quran-deep)] md:flex"
              onClick={() => openAuthModal("login")}
            >
              {t("signIn")}
            </Button>
          )}
        </div>
      </div>
    </header>
  );
}
