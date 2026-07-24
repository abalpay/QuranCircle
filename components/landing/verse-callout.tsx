import Image from "next/image";
import { GeometricRosette } from "@/components/landing/decorative-art";
import { getTranslations } from "next-intl/server";

export default async function VerseCallout() {
  const t = await getTranslations("VerseCallout");
  return (
    <aside className="landing-verse" aria-label={t("ariaLabel")}>
      <div className="landing-verse-illustration">
        <Image
          src="/illustrations/quran-verse.png"
          alt={t("imageAlt")}
          width={720}
          height={720}
          sizes="(max-width: 767px) 150px, 190px"
        />
      </div>

      <blockquote>
        <span className="landing-quote-mark" aria-hidden="true">
          “
        </span>
        <p>
          {t("translation")}
        </p>
        <cite>{t("citation")}</cite>
      </blockquote>

      <GeometricRosette className="landing-verse-rosette" />
    </aside>
  );
}
