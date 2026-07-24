import {
  BookOpen,
  ChartNoAxesCombined,
  Link2,
  UserRoundCheck,
} from "lucide-react";
import HeroActions from "@/components/hero-actions";
import HeroProductPreview from "@/components/hero-product-preview";
import HomeInstallPrompt from "@/components/home-install-prompt";
import { GeometricRosette } from "@/components/landing/decorative-art";
import { getTranslations } from "next-intl/server";

const benefitIcons = [Link2, ChartNoAxesCombined, BookOpen, UserRoundCheck];

export default async function LandingHero() {
  const t = await getTranslations("MarketingHome");
  const benefitItems = [
    t("trustLink"),
    t("trustProgress"),
    t("trustJuz"),
    t("trustAccess"),
  ];

  return (
    <section className="landing-hero" aria-labelledby="landing-hero-title">
      <HomeInstallPrompt />
      <div className="landing-hero-grain" aria-hidden="true" />
      <GeometricRosette className="landing-hero-rosette landing-hero-rosette-left" />
      <GeometricRosette className="landing-hero-rosette landing-hero-rosette-right" />

      <div className="landing-hero-inner">
        <div className="landing-hero-copy">
          <p className="landing-bismillah" lang="ar" dir="rtl">
            بِسْمِ ٱللَّهِ ٱلرَّحْمَـٰنِ ٱلرَّحِيمِ
          </p>

          <p className="landing-eyebrow landing-eyebrow-dark">
            <span aria-hidden="true">✦</span>
            {t("eyebrow")}
          </p>

          <h1
            id="landing-hero-title"
            className="landing-hero-title"
            aria-label={t("heroAriaLabel")}
          >
            {t("heroLineOne")}
            <br />
            {t("heroLineTwo")}
            <br />
            <span>{t("heroLineThree")}</span>
          </h1>

          <p className="landing-hero-description">
            {t("heroDescription")}
          </p>

          <HeroActions theme="dark" />

          <ul
            className="landing-hero-benefits"
            aria-label={t("benefitsLabel")}
          >
            {benefitItems.map((item, index) => {
              const BenefitIcon = benefitIcons[index];
              return (
                <li key={item}>
                  <BenefitIcon aria-hidden="true" />
                  <span>{item}</span>
                </li>
              );
            })}
          </ul>
        </div>

        <div className="landing-hero-preview">
          <div className="landing-preview-glow" aria-hidden="true" />
          <HeroProductPreview />
        </div>
      </div>
    </section>
  );
}
