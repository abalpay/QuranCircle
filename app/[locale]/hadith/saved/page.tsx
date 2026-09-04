import { getTranslations } from "next-intl/server";
import { SavedEntries } from "@/components/hadith/reader-controls";
import { requireHadithEnabled } from "@/lib/hadith/guard";
export default async function SavedPage() {
  requireHadithEnabled();
  const t = await getTranslations("Hadith");
  return <div className="hadith-utility-page"><header className="hadith-intro"><p className="hadith-eyebrow">{t("library")}</p><h1>{t("saved")}</h1><p>{t("savedIntro")}</p></header><SavedEntries /></div>;
}
