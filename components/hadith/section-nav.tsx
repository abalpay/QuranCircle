"use client";

import { useTranslations } from "next-intl";
import { Link, usePathname } from "@/i18n/navigation";

export function HadithSectionNav() {
  const t = useTranslations("Hadith");
  const pathname = usePathname();
  const current = pathname === "/hadith/topics/all" ? "all"
    : pathname === "/hadith/saved" ? "saved"
    : pathname === "/hadith/sources" ? "sources" : "topics";
  return <nav className="hadith-section-nav" aria-label={t("library")}>
    {([
      ["topics", "/hadith"], ["all", "/hadith/topics/all"],
      ["saved", "/hadith/saved"], ["sources", "/hadith/sources"],
    ] as const).map(([key, href]) => <Link key={key} href={href} aria-current={current === key ? "page" : undefined}>{t(key)}</Link>)}
  </nav>;
}
