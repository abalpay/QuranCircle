import type { HadithLocale } from "@/lib/hadith/types";

/** Presentation only: every source character (including line endings) stays in textContent. */
export function SourcePassage({ text, locale, kind = "prose" }: {
  text: string;
  locale: HadithLocale;
  kind?: "prose" | "benefits";
}) {
  const blocks: string[] = [];
  for (const part of text.match(/[^\r\n]*(?:\r\n|\r|\n|$)/g) ?? []) {
    if (!part) continue;
    if (!part.trim() && blocks.length) blocks[blocks.length - 1] += part;
    else blocks.push(part);
  }
  const className = locale === "ar" ? "hadith-arabic" : "hadith-translation";
  if (kind === "benefits") {
    return <ul data-source-passage className={`hadith-benefits ${className}`} lang={locale} dir={locale === "ar" ? "rtl" : "ltr"}>
      {blocks.map((block, index) => <li key={index} lang={locale}>{block}</li>)}
    </ul>;
  }
  return <div data-source-passage className={className} lang={locale} dir={locale === "ar" ? "rtl" : "ltr"}>
    {blocks.map((block, index) => <span className="hadith-paragraph" key={index} lang={locale}>{block}</span>)}
  </div>;
}
