import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import UserDashboard from "@/components/home-content";
import LandingHero from "@/components/landing/landing-hero";
import LandingMetrics from "@/components/landing/landing-metrics";
import ComparisonSection from "@/components/landing/comparison-section";
import HowItWorks from "@/components/landing/how-it-works";
import VerseCallout from "@/components/landing/verse-callout";
import OrganizerResource from "@/components/landing/organizer-resource";
import ResourceLibrary from "@/components/landing/resource-library";
import PublicCircleCta from "@/components/landing/public-circle-cta";
import { getCommunityStats } from "@/lib/actions/stats";
import { toAbsoluteUrl } from "@/lib/site-url";
import type { LocalePageProps } from "@/i18n/routing";
import {
  getLanguageAlternates,
  getLocalizedPath,
} from "@/i18n/locale-config";
import { BRAND_LOGO_PATH } from "@/lib/brand";

export async function generateMetadata({
  params,
}: LocalePageProps): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "HomeMetadata" });
  const canonical = getLocalizedPath(locale);

  return {
    metadataBase: new URL(toAbsoluteUrl("/")),
    title: t("title"),
    description: t("description"),
    keywords: [
      t("keywordTracker"),
      t("keywordGroupReading"),
      t("keywordJuz"),
      t("keywordCollective"),
      t("keywordCircle"),
    ],
    alternates: {
      canonical,
      languages: getLanguageAlternates(),
    },
    openGraph: {
      title: t("openGraphTitle"),
      description: t("openGraphDescription"),
      url: canonical,
    },
  };
}

export default async function HomePage({ params }: LocalePageProps) {
  const { locale } = await params;
  setRequestLocale(locale);

  const [stats, tMarketing] = await Promise.all([
    getCommunityStats(),
    getTranslations("MarketingHome"),
  ]);
  const localizedHomeUrl = toAbsoluteUrl(getLocalizedPath(locale));

  const structuredData = [
    {
      "@context": "https://schema.org",
      "@type": "Organization",
      name: "QuranCircle",
      url: toAbsoluteUrl("/"),
      logo: toAbsoluteUrl(BRAND_LOGO_PATH),
    },
    {
      "@context": "https://schema.org",
      "@type": "WebSite",
      name: "QuranCircle",
      url: localizedHomeUrl,
      description: tMarketing("structuredWebsiteDescription"),
    },
    {
      "@context": "https://schema.org",
      "@type": "WebApplication",
      name: "QuranCircle",
      applicationCategory: "LifestyleApplication",
      operatingSystem: "Any",
      url: localizedHomeUrl,
      description: tMarketing("structuredAppDescription"),
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

      <LandingHero />

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
            illustrationAlt={tMarketing("guideIllustrationAlt")}
          />
          <ResourceLibrary
            copy={{
              eyebrow: tMarketing("resourcesEyebrow"),
              title: tMarketing("resourcesTitle"),
              description: tMarketing("resourcesDescription"),
              readResource: tMarketing("readResource"),
              coordinationTitle: tMarketing("coordinationResourceTitle"),
              coordinationDescription: tMarketing(
                "coordinationResourceDescription",
              ),
              whatsappTitle: tMarketing("whatsappResourceTitle"),
              whatsappDescription: tMarketing(
                "whatsappResourceDescription",
              ),
              ramadanTitle: tMarketing("ramadanResourceTitle"),
              ramadanDescription: tMarketing(
                "ramadanResourceDescription",
              ),
            }}
          />
          <PublicCircleCta />
        </div>
      </div>
    </main>
  );
}
