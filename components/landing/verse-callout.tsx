import { getTranslations } from "next-intl/server";

export default async function VerseCallout() {
  const t = await getTranslations("VerseCallout");
  return (
    <aside className="landing-verse" aria-label={t("ariaLabel")}>
      <blockquote>
        <p>
          {t("translation")}
        </p>
        <cite>{t("citation")}</cite>
      </blockquote>
    </aside>
  );
}
