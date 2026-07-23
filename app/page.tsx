import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import UserDashboard from "@/components/home-content";
import LandingHero from "@/components/landing/landing-hero";
import LandingMetrics from "@/components/landing/landing-metrics";
import ComparisonSection from "@/components/landing/comparison-section";
import HowItWorks from "@/components/landing/how-it-works";
import VerseCallout from "@/components/landing/verse-callout";
import OrganizerResource from "@/components/landing/organizer-resource";
import PublicCircleCta from "@/components/landing/public-circle-cta";
import { getCommunityStats } from "@/lib/actions/stats";
import { toAbsoluteUrl } from "@/lib/site-url";

export const metadata: Metadata = {
  title: "Free Group Quran Khatm Tracker | Shared Juz Progress",
  description:
    "Organize a group Quran Khatm with one share link. Let readers claim Juz, track all 30 portions live, and coordinate families, masjids, and communities for free.",
  keywords: [
    "Quran Khatm tracker",
    "group Quran reading",
    "Juz coordinator",
    "collective Quran Khatm",
    "Quran circle",
  ],
  alternates: {
    canonical: "/",
  },
  openGraph: {
    title: "Free Group Quran Khatm Tracker - QuranCircle",
    description:
      "Create one link, let readers claim Juz, and track your group's complete Quran Khatm live.",
    url: "/",
  },
};

export default async function HomePage() {
  const [stats, tMarketing] = await Promise.all([
    getCommunityStats(),
    getTranslations("MarketingHome"),
  ]);

  const structuredData = [
    {
      "@context": "https://schema.org",
      "@type": "Organization",
      name: "QuranCircle",
      url: toAbsoluteUrl("/"),
      logo: toAbsoluteUrl("/quran-icon.png"),
    },
    {
      "@context": "https://schema.org",
      "@type": "WebSite",
      name: "QuranCircle",
      url: toAbsoluteUrl("/"),
      description:
        "A free group Quran Khatm tracker for coordinating all 30 Juz.",
    },
    {
      "@context": "https://schema.org",
      "@type": "WebApplication",
      name: "QuranCircle",
      applicationCategory: "LifestyleApplication",
      operatingSystem: "Any",
      url: toAbsoluteUrl("/"),
      description:
        "Create and share group Quran Khatm circles, let readers claim Juz, and track completion live.",
      offers: {
        "@type": "Offer",
        price: "0",
        priceCurrency: "USD",
      },
    },
  ];

  const comparisonCopy = {
    eyebrow: tMarketing("problemEyebrow"),
    title: tMarketing("problemTitle"),
    description: tMarketing("problemDescription"),
    oldWayTitle: tMarketing("oldWayTitle"),
    oldWayPoints: [
      tMarketing("oldWayOne"),
      tMarketing("oldWayTwo"),
      tMarketing("oldWayThree"),
    ],
    quranCircleWayTitle: tMarketing("quranCircleWayTitle"),
    quranCircleWayPoints: [
      tMarketing("quranCircleWayOne"),
      tMarketing("quranCircleWayTwo"),
      tMarketing("quranCircleWayThree"),
    ],
    explanation: tMarketing("categoryExplanation"),
    guideLink: tMarketing("guideLink"),
  };

  return (
    <main className="home-page-shell grow">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(structuredData).replace(/</g, "\\u003c"),
        }}
      />

      <LandingHero
        eyebrow={tMarketing("eyebrow")}
        benefits={{
          link: tMarketing("trustLink"),
          progress: tMarketing("trustProgress"),
          juz: tMarketing("trustJuz"),
          access: tMarketing("trustAccess"),
        }}
      />

      <div className="landing-light-canvas">
        <LandingMetrics stats={stats} />
        <div className="landing-dashboard-wrap">
          <UserDashboard />
        </div>

        <div className="landing-content">
          <ComparisonSection copy={comparisonCopy} />
          <HowItWorks />
          <VerseCallout />
          <OrganizerResource
            eyebrow={tMarketing("guideEyebrow")}
            title={tMarketing("guideTitle")}
            description={tMarketing("guideDescription")}
            button={tMarketing("guideButton")}
          />
          <PublicCircleCta />
        </div>
      </div>
    </main>
  );
}
