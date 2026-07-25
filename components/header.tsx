"use client";

import { useAuth } from "@/hooks/use-auth";
import { useAuthModal } from "@/hooks/use-auth-modal";
import { Button } from "@/components/ui/button";
import { Link, usePathname, useRouter } from "@/i18n/navigation";
import {
  BookOpenCheck,
  Compass,
  UserCircle,
  ChevronDown,
  Globe2,
  Home,
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
import { useTranslations, useLocale } from "next-intl";
import type { AppLocale } from "@/i18n/routing";
import { localeOptions } from "@/i18n/locale-config";
import BrandMark from "@/components/brand-mark";

export default function Header() {
  const pathname = usePathname();
  const router = useRouter();
  const locale = useLocale();
  const t = useTranslations("Header");
  const { user, isAuthenticatedUser, signOut } = useAuth();
  const { openAuthModal } = useAuthModal();

  const setLocale = (newLocale: AppLocale) => {
    router.replace(`${pathname}${window.location.search}`, {
      locale: newLocale,
    });
  };

  const displayName =
    (isAuthenticatedUser && (user?.user_metadata?.username as string)) ||
    (isAuthenticatedUser && user?.email?.split("@")[0]) ||
    t("user");

  const primaryNavigation = [
    { href: "/", label: t("home"), icon: Home },
    { href: "/browse", label: t("browse"), icon: Compass },
    { href: "/my-circles", label: t("myCircles"), icon: Layers3 },
    { href: "/khatm-coordination", label: t("guide"), icon: BookOpenCheck },
  ];

  return (
    <header className="app-header sticky top-0 z-50">
      <div className="mx-auto flex w-full max-w-[88rem] items-center gap-4 px-5 py-3 sm:px-8 lg:px-10">
        <Link
          href="/"
          className="group inline-flex shrink-0 items-center gap-3"
        >
          <BrandMark
            variant="on-dark"
            className="h-11 w-11 shrink-0 transition-transform duration-200 group-hover:scale-[1.035]"
          />
          <span className="leading-none">
            <span className="block font-heading text-[1.55rem] text-[hsl(150_30%_96%)] sm:text-[1.65rem]">
              QuranCircle
            </span>
            <span className="block text-[9.5px] font-semibold uppercase tracking-[0.24em] text-[hsl(var(--quran-gold)/0.82)] sm:text-[10px]">
              {t("readTogether")}
            </span>
          </span>
        </Link>

        <nav
          aria-label={t("primaryNavigation")}
          className="ms-4 hidden items-center gap-1 lg:flex"
        >
          {primaryNavigation.map(({ href, label, icon: Icon }) => {
            const isActive =
              pathname === href ||
              (href !== "/" && pathname.startsWith(`${href}/`));

            return (
              <Link
                key={href}
                href={href}
                aria-current={isActive ? "page" : undefined}
                className={`app-header-nav-link ${isActive ? "is-active" : ""}`}
              >
                <Icon className="h-4 w-4" />
                {label}
              </Link>
            );
          })}
        </nav>

        <div className="ms-auto flex items-center gap-2">
          {isAuthenticatedUser ? (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="ghost"
                  size="sm"
                  className="hidden rounded-full border border-white/12 bg-white/[0.06] px-4 text-[hsl(150_30%_94%)] hover:bg-white/[0.1] hover:text-white lg:flex"
                >
                  <UserCircle className="me-2 h-4 w-4 text-[hsl(var(--quran-light-green))]" />
                  <span className="text-sm">{t("salam")}, {displayName}</span>
                  <ChevronDown className="ms-1 h-3 w-3" />
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
                    <Layers3 className="me-2 h-4 w-4" />
                    {t("myCircles")}
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuItem asChild>
                  <Link href="/account">
                    <Settings className="me-2 h-4 w-4" />
                    {t("accountSettings")}
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuLabel>{t("language")}</DropdownMenuLabel>
                {localeOptions.map((option) => (
                  <DropdownMenuItem
                    key={option.locale}
                    onClick={() => setLocale(option.locale)}
                    disabled={locale === option.locale}
                  >
                    <Globe2 className="me-2 h-4 w-4" />
                    <span
                      lang={option.locale}
                      dir={option.locale === "ar" ? "rtl" : "ltr"}
                    >
                      {option.label}
                    </span>
                  </DropdownMenuItem>
                ))}
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  onClick={() => signOut()}
                  className="text-red-600 focus:bg-red-50 focus:text-red-700"
                >
                  <LogOut className="me-2 h-4 w-4" />
                  {t("logOut")}
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          ) : (
            <Button
              variant="default"
              size="sm"
              className="hidden rounded-full border border-white/20 bg-white/[0.055] px-6 text-[hsl(150_30%_96%)] shadow-none hover:bg-white/[0.11] lg:flex"
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
