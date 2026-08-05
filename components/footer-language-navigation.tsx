"use client";

import type { MouseEvent } from "react";
import { useLocale } from "next-intl";
import { Link, usePathname, useRouter } from "@/i18n/navigation";
import { localeOptions } from "@/i18n/locale-config";
import type { AppLocale } from "@/i18n/routing";
import { cn } from "@/lib/utils";

type FooterLanguageNavigationProps = {
  ariaLabel: string;
  className?: string;
};

export default function FooterLanguageNavigation({
  ariaLabel,
  className,
}: FooterLanguageNavigationProps) {
  const locale = useLocale() as AppLocale;
  const pathname = usePathname();
  const router = useRouter();

  const changeLocale = (
    event: MouseEvent<HTMLAnchorElement>,
    nextLocale: AppLocale,
  ) => {
    if (
      event.defaultPrevented ||
      event.button !== 0 ||
      event.metaKey ||
      event.ctrlKey ||
      event.shiftKey ||
      event.altKey
    ) {
      return;
    }

    event.preventDefault();
    if (nextLocale === locale) return;

    router.replace(`${pathname}${window.location.search}`, {
      locale: nextLocale,
    });
  };

  return (
    <nav aria-label={ariaLabel} className={className}>
      {localeOptions.map((option) => {
        const isCurrent = option.locale === locale;

        return (
          <Link
            key={option.locale}
            href={pathname}
            locale={option.locale}
            hrefLang={option.locale}
            aria-current={isCurrent ? "page" : undefined}
            onClick={(event) => changeLocale(event, option.locale)}
            className={cn(
              "inline-flex min-h-11 items-center rounded-full px-3 transition-colors hover:bg-white/[0.06] hover:text-white",
              isCurrent && "bg-white/[0.06] text-white",
            )}
          >
            <span
              lang={option.locale}
              dir={option.locale === "ar" ? "rtl" : "ltr"}
            >
              {option.label}
            </span>
          </Link>
        );
      })}
    </nav>
  );
}
