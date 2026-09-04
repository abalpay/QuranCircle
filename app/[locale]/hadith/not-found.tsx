import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
export default async function NotFound() {
  const t = await getTranslations("Hadith");
  return <section className="hadith-shell"><h1>{t("notFound")}</h1><Link className="hadith-link" href="/hadith">{t("back")}</Link></section>;
}
