import type { AppLocale } from "./routing";
import { routing } from "./routing";

export const localeConfig = {
  en: {
    direction: "ltr",
    label: "English",
    openGraphLocale: "en_US",
  },
  tr: {
    direction: "ltr",
    label: "Türkçe",
    openGraphLocale: "tr_TR",
  },
  ar: {
    direction: "rtl",
    label: "العربية",
    openGraphLocale: "ar_AR",
  },
} as const satisfies Record<
  AppLocale,
  {
    direction: "ltr" | "rtl";
    label: string;
    openGraphLocale: string;
  }
>;

export const localeOptions = routing.locales.map((locale) => ({
  locale,
  label: localeConfig[locale].label,
}));

export function getLocaleDirection(locale: AppLocale) {
  return localeConfig[locale].direction;
}

export function getOpenGraphLocale(locale: AppLocale) {
  return localeConfig[locale].openGraphLocale;
}

export function getLocalizedPath(locale: AppLocale, pathname = "/") {
  const normalizedPath =
    pathname === "/" ? "" : pathname.startsWith("/") ? pathname : `/${pathname}`;

  if (locale === routing.defaultLocale) {
    return normalizedPath || "/";
  }

  return `/${locale}${normalizedPath}`;
}

export function getLanguageAlternates(pathname = "/") {
  return Object.fromEntries(
    routing.locales.map((locale) => [
      locale,
      getLocalizedPath(locale, pathname),
    ]),
  ) as Record<AppLocale, string>;
}
