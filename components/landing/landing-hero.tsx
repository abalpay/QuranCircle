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

type LandingHeroProps = {
  eyebrow: string;
  benefits: {
    link: string;
    progress: string;
    juz: string;
    access: string;
  };
};

const benefitIcons = [Link2, ChartNoAxesCombined, BookOpen, UserRoundCheck];

export default function LandingHero({
  eyebrow,
  benefits,
}: LandingHeroProps) {
  const benefitItems = [
    benefits.link,
    benefits.progress,
    benefits.juz,
    benefits.access,
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
            {eyebrow}
          </p>

          <h1
            id="landing-hero-title"
            className="landing-hero-title"
            aria-label="Complete a group Quran Khatm, together."
          >
            Complete a group
            <br />
            Qur’an Khatm,
            <br />
            <span>together.</span>
          </h1>

          <p className="landing-hero-description">
            QuranCircle is a free group Quran Khatm tracker for families,
            masjids, and communities. Create one shared circle, let readers
            claim an available Juz without an account, and follow all 30
            portions through completion.
          </p>

          <HeroActions theme="dark" />

          <ul className="landing-hero-benefits" aria-label="QuranCircle benefits">
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
