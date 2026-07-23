import type { Metadata } from "next";
import { Button } from "@/components/ui/button";
import {
  Share2,
  CheckCircle2,
  Compass,
  HandHeart,
  BookOpenCheck,
  X,
  ArrowRight,
} from "lucide-react";
import UserDashboard from "@/components/home-content";
import FeaturedCircles from "@/components/featured-circles";
import HeroActions from "@/components/hero-actions";
import HeroProductPreview from "@/components/hero-product-preview";
import HomeInstallPrompt from "@/components/home-install-prompt";
import { getCommunityStats } from "@/lib/actions/stats";
import { getPublicEvents } from "@/lib/actions/events";
import { getTranslations } from "next-intl/server";
import AnalyticsLink from "@/components/analytics-link";
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

const steps = [
  {
    title: "Set Your Circle",
    description:
      "Name your Khatm, choose link-only or public, and share in seconds.",
    icon: Share2,
  },
  {
    title: "Claim A Juz",
    description:
      "Participants choose their portion by name with no account friction.",
    icon: HandHeart,
  },
  {
    title: "Track Completion",
    description: "Progress is updated live so everyone can see what remains.",
    icon: CheckCircle2,
  },
];

export default async function HomePage() {
  const [stats, publicEvents, tMarketing] = await Promise.all([
    getCommunityStats(),
    getPublicEvents(),
    getTranslations("MarketingHome"),
  ]);

  const featuredEvents = publicEvents.slice(0, 3);
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

  return (
    <main className="page-shell home-page-shell grow">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(structuredData).replace(/</g, "\\u003c"),
        }}
      />
      {/* ── Hero Section ── */}
      <section className="hero-sanctuary">
        <HomeInstallPrompt />

        <div className="hero-sanctuary-grid">
          <div className="hero-sanctuary-copy">
            <p className="hero-sanctuary-bismillah">
              بِسْمِ ٱللَّهِ ٱلرَّحْمَـٰنِ ٱلرَّحِيمِ
            </p>

            <span className="hero-sanctuary-eyebrow">
              {tMarketing("eyebrow")}
            </span>

            <h1 className="hero-sanctuary-title">
              Complete the Qur&apos;an,
              <span>together.</span>
            </h1>

            <p className="hero-sanctuary-description">
              QuranCircle helps families, masjids, and groups coordinate
              meaningful recitation. Create a circle, let people claim their
              portion, and finish your collective Khatm with clarity.
            </p>

            <div className="w-full max-w-md sm:max-w-none">
              <HeroActions theme="dark" />
            </div>

            <ul className="hero-sanctuary-trust">
              {[
                tMarketing("trustLink"),
                tMarketing("trustJuz"),
                tMarketing("trustProgress"),
                tMarketing("trustAccess"),
              ].map((item) => (
                <li key={item}>
                  <CheckCircle2 className="h-3.5 w-3.5" />
                  {item}
                </li>
              ))}
            </ul>
          </div>

          <div className="hero-sanctuary-art">
            <HeroProductPreview />
          </div>
        </div>
      </section>

      {/* ── Community Stats Bar ── */}
      <div className="stats-bar">
        <div className="grid grid-cols-3 gap-4">
          <div className="stats-bar-item">
            <span className="stats-value">{stats.totalCircles}</span>
            <span className="stats-label">Circles</span>
          </div>
          <div className="stats-bar-item border-x border-quran-border/30 px-4">
            <span className="stats-value">{stats.totalJuzClaimed}</span>
            <span className="stats-label">Juz Claimed</span>
          </div>
          <div className="stats-bar-item">
            <span className="stats-value">{stats.activeKhatms}</span>
            <span className="stats-label">Khatms</span>
          </div>
        </div>
      </div>

      {/* ── User Dashboard (only if logged in) ── */}
      <UserDashboard />

      {/* ── Category Positioning ── */}
      <section
        className="section-panel landing-panel landing-panel-comparison mt-24"
        aria-labelledby="group-khatm-title"
      >
        <div className="max-w-3xl">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-quran-gold">
            {tMarketing("problemEyebrow")}
          </p>
          <h2
            id="group-khatm-title"
            className="font-heading mt-1 text-3xl text-quran-deep sm:text-4xl"
          >
            {tMarketing("problemTitle")}
          </h2>
          <p className="mt-3 text-base leading-7 text-quran-muted sm:text-lg">
            {tMarketing("problemDescription")}
          </p>
        </div>

        <div className="relative mt-8 grid gap-5 md:grid-cols-2">
          <div className="comparison-card comparison-card-muted p-5 sm:p-6">
            <h3 className="font-heading text-2xl text-quran-deep">
              {tMarketing("oldWayTitle")}
            </h3>
            <ul className="mt-4 space-y-3 text-sm leading-6 text-quran-muted sm:text-base">
              {["oldWayOne", "oldWayTwo", "oldWayThree"].map((key) => (
                <li key={key} className="flex items-start gap-3">
                  <X className="mt-1 h-4 w-4 shrink-0 text-quran-gold" />
                  {tMarketing(key)}
                </li>
              ))}
            </ul>
          </div>
          <div className="comparison-card comparison-card-primary p-5 sm:p-6">
            <h3 className="font-heading text-2xl text-quran-deep">
              {tMarketing("quranCircleWayTitle")}
            </h3>
            <ul className="mt-4 space-y-3 text-sm leading-6 text-quran-muted sm:text-base">
              {[
                "quranCircleWayOne",
                "quranCircleWayTwo",
                "quranCircleWayThree",
              ].map((key) => (
                <li key={key} className="flex items-start gap-3">
                  <CheckCircle2 className="mt-1 h-4 w-4 shrink-0 text-quran-green" />
                  {tMarketing(key)}
                </li>
              ))}
            </ul>
          </div>
          <span
            aria-hidden
            className="absolute left-1/2 top-1/2 z-10 hidden h-10 w-10 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full border border-quran-border bg-quran-card text-quran-green shadow-[0_10px_28px_-16px_hsl(var(--quran-deep)/0.7)] md:flex"
          >
            <ArrowRight className="h-4 w-4" />
          </span>
        </div>

        <p className="mt-6 max-w-4xl text-sm leading-7 text-quran-muted sm:text-base">
          {tMarketing("categoryExplanation")}
        </p>

        <Button
          asChild
          variant="link"
          className="mt-6 h-auto p-0 font-semibold text-quran-green"
        >
          <AnalyticsLink
            href="/khatm-coordination"
            analyticsAction="read_guide"
            analyticsSource="home_guide"
          >
            {tMarketing("guideLink")}
            <BookOpenCheck className="h-4 w-4" />
          </AnalyticsLink>
        </Button>
      </section>

      {/* ── How It Works — Editorial Process Ledger ── */}
      <section className="section-panel landing-panel landing-panel-steps mt-24">
        <div className="process-heading">
          <div>
            <p className="process-kicker">A clear path</p>
            <h2 className="font-heading text-3xl text-quran-deep sm:text-4xl">
              How It Works
            </h2>
          </div>
          <p className="max-w-lg text-quran-muted">
            Simple, focused, and designed for spiritual collaboration.
          </p>
        </div>

        <div className="process-ledger">
          {steps.map((step, index) => (
            <article
              key={step.title}
              className="process-row animate-fade-rise"
              style={{
                animationDelay: `${index * 110 + 240}ms`,
                animationFillMode: "both",
              }}
            >
              <span aria-hidden className="process-number">
                0{index + 1}
              </span>
              <div className="process-icon">
                <step.icon className="h-5 w-5" />
              </div>
              <div>
                <h3 className="font-heading text-2xl text-quran-deep">
                  {step.title}
                </h3>
              </div>
              <p className="text-base leading-relaxed text-quran-muted">
                {step.description}
              </p>
            </article>
          ))}
        </div>
      </section>

      {/* ── Organizer Guide ── */}
      <section className="section-panel landing-panel landing-panel-resource mt-12">
        <div className="flex flex-col items-start justify-between gap-5 sm:flex-row sm:items-end">
          <div>
            <span className="quran-badge mb-4">
              <BookOpenCheck className="mr-2 h-3.5 w-3.5" />
              {tMarketing("guideEyebrow")}
            </span>
            <h2 className="font-heading text-3xl text-quran-deep sm:text-4xl">
              {tMarketing("guideTitle")}
            </h2>
            <p className="mt-3 max-w-2xl text-quran-muted">
              {tMarketing("guideDescription")}
            </p>
          </div>
          <Button
            asChild
            variant="outline"
            className="rounded-full border-quran-border bg-white/60 px-6 hover:bg-white/90"
          >
            <AnalyticsLink
              href="/khatm-coordination"
              analyticsAction="read_guide"
              analyticsSource="home_guide"
            >
              <BookOpenCheck className="mr-2 h-4 w-4" />
              {tMarketing("guideButton")}
            </AnalyticsLink>
          </Button>
        </div>
      </section>

      {/* ── Featured Public Circles ── */}
      {featuredEvents.length > 0 && (
        <section className="mt-24">
          <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
            <div>
              <h2 className="font-heading text-3xl text-quran-deep sm:text-4xl">
                Active Circles
              </h2>
              <p className="mt-2 text-quran-muted">
                Join an ongoing Khatm and contribute today.
              </p>
            </div>
            <Button
              asChild
              variant="outline"
              className="rounded-full border-quran-border bg-white/60 px-6 hover:bg-white/90"
            >
              <AnalyticsLink
                href="/browse"
                analyticsAction="browse_circles"
                analyticsSource="home_browse"
              >
                <Compass className="mr-2 h-4 w-4" />
                View All
              </AnalyticsLink>
            </Button>
          </div>

          <FeaturedCircles events={featuredEvents} />
        </section>
      )}

      {/* ── CTA Section ── */}
      <section className="cta-section">
        <div className="relative z-10 mx-auto max-w-2xl">
          <p className="mb-6 inline-flex items-center gap-2.5 rounded-full border border-white/15 bg-white/[0.07] px-4 py-1.5 text-[0.7rem] font-semibold uppercase tracking-[0.2em] text-primary-foreground/70 backdrop-blur-sm">
            <span className="inline-block h-1.5 w-1.5 rounded-full bg-[hsl(var(--quran-gold))]" />
            Open to Everyone
          </p>

          <h3 className="font-heading text-3xl sm:text-4xl md:text-5xl lg:text-[3.5rem]">
            Join a public circle today
          </h3>

          <div className="cta-gold-divider" />

          <p className="mx-auto mt-5 max-w-lg text-base leading-relaxed text-primary-foreground/70 sm:text-lg">
            Pick a Juz, join fellow readers, and help complete the Quran
            together.
          </p>

          <div className="mt-10">
            <Button
              asChild
              size="lg"
              className="group h-14 w-full rounded-full border-2 border-white bg-white px-10 text-base font-semibold text-quran-green shadow-[0_16px_40px_-16px_hsl(0_0%_0%/0.3)] transition-all hover:bg-white hover:text-quran-green hover:scale-105 hover:shadow-[0_20px_50px_-16px_hsl(0_0%_0%/0.4)] active:scale-95 sm:w-auto"
            >
              <AnalyticsLink
                href="/browse"
                analyticsAction="browse_circles"
                analyticsSource="home_browse"
              >
                <Compass className="mr-2 h-5 w-5 transition-transform group-hover:rotate-45" />
                Browse Public Circles
              </AnalyticsLink>
            </Button>
          </div>
        </div>
      </section>
    </main>
  );
}
