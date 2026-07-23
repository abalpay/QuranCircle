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
  const isHomePage = pathname === "/";
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
    <header
      className={
        isHomePage
          ? "sticky top-0 z-50 border-b border-white/[0.09] bg-[hsl(168_69%_10%/0.97)] backdrop-blur-xl"
          : "sticky top-0 z-50 border-b border-quran-border/65 bg-quran-bg/92 backdrop-blur-xl"
      }
    >
      <div
        className={`mx-auto flex w-full items-center ${
          isHomePage
            ? "max-w-[88rem] gap-4 px-5 py-3.5 sm:px-8 lg:px-10"
            : "max-w-[80rem] gap-3 px-5 py-3 sm:px-8 lg:px-10"
        }`}
      >
        <Link
          href="/"
          className={`group inline-flex items-center ${
            isHomePage ? "gap-3.5" : "gap-3"
          }`}
        >
          <span
            className={
              isHomePage
                ? "flex h-[3.05rem] w-[3.05rem] items-center justify-center rounded-full border border-[hsl(var(--quran-gold)/0.55)] bg-[hsl(150_30%_96%/0.045)] shadow-[inset_0_1px_0_hsl(150_30%_96%/0.08)] transition-transform duration-200 group-hover:scale-[1.03]"
                : "flex h-10 w-10 items-center justify-center rounded-xl border border-quran-border bg-white/70 shadow-sm transition-transform duration-200 group-hover:scale-[1.03]"
            }
          >
            <Image
              src="/quran-icon.png"
              alt="Quran Icon"
              width={isHomePage ? 28 : 23}
              height={isHomePage ? 28 : 23}
            />
          </span>
          <span className="leading-none">
            <span
              className={`block font-heading ${
                isHomePage
                  ? "text-[1.75rem] text-[hsl(150_30%_96%)]"
                  : "text-2xl text-quran-green"
              }`}
            >
              QuranCircle
            </span>
            <span
              className={`block font-semibold uppercase tracking-[0.24em] ${
                isHomePage
                  ? "text-[10.5px] text-[hsl(var(--quran-gold)/0.82)]"
                  : "text-[10px] text-quran-muted"
              }`}
            >
              {t("readTogether")}
            </span>
          </span>
        </Link>

        <Button
          asChild
          variant="ghost"
          size="sm"
          className={`
            hidden rounded-full border md:inline-flex
            ${pathname === "/my-circles"
              ? "ml-6 min-h-10 border-quran-green/35 bg-quran-green/10 px-4 text-[0.9rem] text-quran-green"
              : isHomePage
                ? "ml-6 min-h-10 border-transparent px-4 text-[0.92rem] text-[hsl(158_18%_84%)] hover:border-white/10 hover:bg-white/[0.06] hover:text-white"
                : "ml-4 border-transparent text-quran-muted hover:border-quran-border hover:bg-white/70"}
          `}
        >
          <Link href="/my-circles">
            <Layers3 className="mr-2 h-4 w-4" />
            {t("myCircles")}
          </Link>
        </Button>

        <div
          className={`ml-auto flex items-center ${
            isHomePage ? "gap-3" : "gap-2"
          }`}
        >
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                size="sm"
                className={
                  isHomePage
                    ? "hidden min-h-10 rounded-full border border-transparent px-3 text-[0.92rem] text-[hsl(158_18%_86%)] hover:border-white/10 hover:bg-white/[0.06] hover:text-white md:flex"
                    : "hidden rounded-full border border-transparent text-quran-muted hover:border-quran-border hover:bg-white/70 md:flex"
                }
              >
                <Globe2 className="mr-1 h-4 w-4" />
                <span className={isHomePage ? "text-[0.92rem]" : "text-sm"}>
                  {locale === "tr" ? t("turkish") : t("english")}
                </span>
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
                  className={
                    isHomePage
                      ? "hidden min-h-10 rounded-full border border-white/12 bg-white/[0.06] px-4 text-[0.92rem] text-[hsl(150_30%_94%)] hover:bg-white/[0.1] hover:text-white md:flex"
                      : "hidden rounded-full border border-quran-border/80 bg-white/70 px-3 text-quran-deep hover:bg-white md:flex"
                  }
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
              className={
                isHomePage
                  ? "hidden min-h-10 rounded-full border border-white/20 bg-white/[0.055] px-6 text-[0.92rem] text-[hsl(150_30%_96%)] shadow-none hover:bg-white/[0.11] md:flex"
                  : "hidden rounded-full px-5 text-primary-foreground shadow-[0_12px_24px_-16px_var(--color-quran-deep)] md:flex"
              }
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
