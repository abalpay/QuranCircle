import { getTranslations } from "next-intl/server";
import { SavedEntries } from "@/components/hadith/reader-controls";
export default async function SavedPage() {
  const t = await getTranslations("Hadith");
  return <><h1>{t("saved")}</h1><SavedEntries /></>;
}
