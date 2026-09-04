import { getTranslations } from "next-intl/server";
import { SavedEntries } from "@/components/hadith/reader-controls";
import { requireHadithEnabled } from "@/lib/hadith/guard";
export default async function SavedPage() {
  requireHadithEnabled();
  const t = await getTranslations("Hadith");
  return <><h1>{t("saved")}</h1><SavedEntries /></>;
}
