"use client";

import { Globe2 } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { usePathname, useRouter } from "@/i18n/navigation";
import { localeOptions } from "@/i18n/locale-config";
import type { AppLocale } from "@/i18n/routing";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";

type LanguageSelectProps = {
  className?: string;
  onLocaleChange?: () => void;
};

export default function LanguageSelect({
  className,
  onLocaleChange,
}: LanguageSelectProps) {
  const locale = useLocale() as AppLocale;
  const pathname = usePathname();
  const router = useRouter();
  const t = useTranslations("LanguageSelect");

  const setLocale = (newLocale: AppLocale) => {
    if (newLocale === locale) return;

    router.replace(`${pathname}${window.location.search}`, {
      locale: newLocale,
    });
    onLocaleChange?.();
  };

  return (
    <Select value={locale} onValueChange={(value) => setLocale(value as AppLocale)}>
      <SelectTrigger
        aria-label={t("label")}
        className={cn(
          "min-h-11 w-full rounded-xl border-quran-border bg-white/70",
          className,
        )}
      >
        <span className="flex min-w-0 items-center gap-2">
          <Globe2 className="size-4 shrink-0" aria-hidden="true" />
          <span className="text-quran-muted">{t("label")}:</span>
          <SelectValue />
        </span>
      </SelectTrigger>
      <SelectContent position="popper" align="start">
        {localeOptions.map((option) => (
          <SelectItem key={option.locale} value={option.locale}>
            <span lang={option.locale} dir={option.locale === "ar" ? "rtl" : "ltr"}>
              {option.label}
            </span>
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
