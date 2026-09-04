"use client";
import { useTranslations } from "next-intl";
export default function HadithError({ retry }: { error: Error & { digest?: string }; retry: () => void }) {
  const t = useTranslations("Hadith");
  return <section><h1>{t("error")}</h1><button type="button" onClick={retry}>{t("retry")}</button></section>;
}
