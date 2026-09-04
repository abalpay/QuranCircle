import type { HadithLocale } from "./types";

export const HADITH_LOCALES: HadithLocale[] = ["en", "tr", "ar"];
export function assertLocale(locale: string): asserts locale is HadithLocale {
  if (!HADITH_LOCALES.includes(locale as HadithLocale)) throw new Error(`Unsupported hadith locale: ${locale}`);
}
export function assertHadithId(id: string): void {
  if (typeof id !== "string" || !/^[0-9]+$/.test(id)) throw new Error("Invalid decimal hadith ID");
}
export function assertOfficialUrl(value: string): void {
  const url = new URL(value);
  if (url.origin !== "https://hadeethenc.com" || url.username || url.password) throw new Error("Expected official HTTPS HadeethEnc URL");
}
/** Locale prefixes are applied by the existing locale-aware navigation layer. */
export function hadithPath(id: string): string {
  assertHadithId(id);
  return `/hadith/${id}`;
}
