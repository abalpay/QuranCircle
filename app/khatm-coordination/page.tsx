import type { Metadata } from "next";
import Link from "next/link";
import {
  ArrowRight,
  BookOpenCheck,
  CalendarClock,
  CheckCircle2,
  Globe2,
  HandHeart,
  Link2,
  MessageCircle,
  MousePointerClick,
  ShieldCheck,
} from "lucide-react";
import { getTranslations } from "next-intl/server";
import AnalyticsLink from "@/components/analytics-link";
import CreateCircleAction from "@/components/create-circle-action";
import KhatmMessageTemplates from "@/components/khatm-message-templates";
import KhatmProductPreview from "@/components/khatm-product-preview";
import { Button } from "@/components/ui/button";
import { toAbsoluteUrl } from "@/lib/site-url";

export const metadata: Metadata = {
  title: "Group Quran Khatm Guide & Shared Juz Tracker",
  description:
    "Organize a group Quran Khatm with one shared link. Let readers claim available Juz, follow live progress, and use copy-ready invitation and reminder messages.",
  keywords: [
    "how to organize a Quran khatm",
    "group Quran khatm",
    "shared Juz tracker",
    "Quran Khatm link",
    "Quran khatm WhatsApp message",
    "collective Quran reading",
  ],
  alternates: {
    canonical: "/khatm-coordination",
  },
  openGraph: {
    type: "article",
    title: "How to Organize a Group Quran Khatm",
    description:
      "Create one shared link, let readers claim available Juz, and coordinate completion with a practical six-step workflow.",
    url: "/khatm-coordination",
    images: [
      {
        url: "/opengraph-image",
        width: 1200,
        height: 630,
        alt: "QuranCircle group Khatm coordination guide",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "How to Organize a Group Quran Khatm",
    description:
      "A practical group Khatm guide with a shared Juz tracker and copy-ready messages.",
    images: ["/opengraph-image"],
  },
};

const stepIcons = [
  CalendarClock,
  ShieldCheck,
  MousePointerClick,
  Link2,
  MessageCircle,
  CheckCircle2,
];

const stepKeys = ["one", "two", "three", "four", "five", "six"] as const;
const faqKeys = ["one", "two", "three", "four", "five"] as const;

function safeJsonLd(value: unknown) {
  return JSON.stringify(value).replace(/</g, "\\u003c");
}

export default async function KhatmCoordinationPage() {
  const t = await getTranslations("KhatmGuide");
  const pageUrl = toAbsoluteUrl("/khatm-coordination");
  const faqItems = faqKeys.map((key) => ({
    question: t(`faq.${key}Question`),
    answer: t(`faq.${key}Answer`),
  }));

  const structuredData = [
    {
      "@context": "https://schema.org",
      "@type": "Article",
      headline: t("title"),
      description: t("intro"),
      datePublished: "2026-07-23",
      dateModified: "2026-07-23",
      mainEntityOfPage: pageUrl,
      image: toAbsoluteUrl("/opengraph-image"),
      author: {
        "@type": "Organization",
        name: "QuranCircle",
        url: toAbsoluteUrl("/"),
      },
      publisher: {
        "@type": "Organization",
        name: "QuranCircle",
        url: toAbsoluteUrl("/"),
        logo: {
          "@type": "ImageObject",
          url: toAbsoluteUrl("/quran-icon.png"),
          width: 512,
          height: 512,
        },
      },
    },
    {
      "@context": "https://schema.org",
      "@type": "BreadcrumbList",
      itemListElement: [
        {
          "@type": "ListItem",
          position: 1,
          name: "QuranCircle",
          item: toAbsoluteUrl("/"),
        },
        {
          "@type": "ListItem",
          position: 2,
          name: t("title"),
          item: pageUrl,
        },
      ],
    },
    {
      "@context": "https://schema.org",
      "@type": "FAQPage",
      mainEntity: faqItems.map((item) => ({
        "@type": "Question",
        name: item.question,
        acceptedAnswer: {
          "@type": "Answer",
          text: item.answer,
        },
      })),
    },
  ];

  return (
    <main className="page-shell grow">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: safeJsonLd(structuredData) }}
      />

      <article>
        <header className="hero-pattern relative overflow-hidden rounded-[2rem] border border-quran-border/50 px-5 py-10 sm:px-10 sm:py-14 lg:px-14 lg:py-16">
          <div className="relative z-10 grid items-center gap-12 lg:grid-cols-[minmax(0,1fr)_17rem] lg:text-left">
            <div className="text-center lg:text-left">
              <nav
                aria-label="Breadcrumb"
                className="mb-8 flex items-center justify-center gap-2 text-sm text-quran-muted lg:justify-start"
              >
                <Link
                  href="/"
                  className="transition-colors hover:text-quran-green"
                >
                  QuranCircle
                </Link>
                <span aria-hidden>/</span>
                <span>{t("contentsPlan")}</span>
              </nav>

              <span className="quran-badge">
                <BookOpenCheck className="mr-2 h-3.5 w-3.5" />
                {t("eyebrow")}
              </span>
              <h1 className="font-heading mt-5 max-w-4xl text-4xl leading-[1.05] text-quran-deep sm:text-5xl lg:text-[3.65rem]">
                {t("title")}
              </h1>
              <p className="mt-5 max-w-3xl text-base leading-8 text-quran-muted sm:text-lg">
                {t("intro")}
              </p>
              <p className="mt-4 text-xs font-semibold uppercase tracking-[0.14em] text-quran-gold">
                {t("updated")}
              </p>

              <div className="mt-8 flex flex-col justify-center gap-3 sm:flex-row lg:justify-start">
                <CreateCircleAction
                  source="guide_hero"
                  size="lg"
                  className="h-12 rounded-full px-7 text-primary-foreground"
                >
                  <HandHeart className="h-5 w-5" />
                  {t("startCircle")}
                </CreateCircleAction>
                <Button
                  asChild
                  size="lg"
                  variant="outline"
                  className="h-12 rounded-full border-quran-border bg-white/70 px-7"
                >
                  <AnalyticsLink
                    href="/browse"
                    analyticsAction="browse_circles"
                    analyticsSource="guide_hero"
                  >
                    <Globe2 className="h-5 w-5" />
                    {t("browseCircles")}
                  </AnalyticsLink>
                </Button>
              </div>
            </div>

            <div aria-hidden className="relative hidden justify-center lg:flex">
              <div className="absolute inset-3 rotate-6 rounded-[2rem] border border-quran-gold/25 bg-quran-gold/[0.04]" />
              <div className="relative w-full -rotate-2 rounded-[2rem] border border-quran-border/80 bg-quran-card/90 p-6 shadow-[0_28px_55px_-34px_hsl(var(--quran-deep)/0.7)] backdrop-blur-sm">
                <p className="text-[0.62rem] font-bold uppercase tracking-[0.24em] text-quran-gold">
                  {t("heroLedgerLabel")}
                </p>
                <div className="mt-4 flex items-end gap-2 border-b border-quran-border/70 pb-4">
                  <span className="font-heading text-8xl leading-[0.72] text-quran-deep">
                    30
                  </span>
                  <span className="pb-1 text-xs font-bold uppercase tracking-[0.2em] text-quran-green">
                    {t("heroLedgerUnit")}
                  </span>
                </div>
                <div className="mt-5 grid grid-cols-6 gap-2">
                  {Array.from({ length: 30 }, (_, index) => (
                    <span
                      key={index}
                      className={`aspect-square rounded-[0.3rem] border ${
                        index < 12
                          ? "border-emerald-400/60 bg-emerald-100"
                          : index < 18
                            ? "border-amber-300/70 bg-amber-100"
                            : "border-quran-border bg-white/75"
                      }`}
                    />
                  ))}
                </div>
                <p className="mt-5 text-xs font-medium leading-5 text-quran-muted">
                  {t("heroLedgerFooter")}
                </p>
              </div>
            </div>
          </div>
        </header>

        <nav
          aria-label={t("contentsLabel")}
          className="sticky top-[4.15rem] z-40 -mx-1 mt-5 flex items-center justify-start gap-x-5 overflow-x-auto rounded-2xl border border-quran-border/70 bg-quran-card/94 px-5 py-3.5 text-sm font-medium text-quran-deep shadow-[0_14px_35px_-28px_hsl(var(--quran-deep)/0.65)] backdrop-blur-xl [scrollbar-width:none] sm:mx-0 sm:justify-center [&::-webkit-scrollbar]:hidden"
        >
          <span className="shrink-0 text-xs font-bold uppercase tracking-[0.15em] text-quran-gold">
            {t("contentsLabel")}
          </span>
          <a
            href="#steps"
            className="shrink-0 hover:text-quran-green hover:underline"
          >
            {t("contentsPlan")}
          </a>
          <a
            href="#product-preview"
            className="shrink-0 hover:text-quran-green hover:underline"
          >
            {t("contentsPreview")}
          </a>
          <a
            href="#templates"
            className="shrink-0 hover:text-quran-green hover:underline"
          >
            {t("contentsTemplates")}
          </a>
          <a
            href="#faq"
            className="shrink-0 hover:text-quran-green hover:underline"
          >
            {t("contentsFaq")}
          </a>
        </nav>

        <aside className="mt-8 rounded-3xl border border-quran-green/25 bg-quran-green/[0.06] p-6 sm:p-8">
          <div className="flex items-start gap-4">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-quran-green text-primary-foreground">
              <BookOpenCheck className="h-4.5 w-4.5" />
            </span>
            <div>
              <h2 className="font-heading text-2xl text-quran-deep">
                {t("quickTitle")}
              </h2>
              <p className="mt-2 max-w-4xl leading-8 text-quran-muted">
                {t("quickAnswer")}
              </p>
            </div>
          </div>
        </aside>

        <section
          id="steps"
          aria-labelledby="steps-title"
          className="section-panel mt-10 scroll-mt-32"
        >
          <div className="max-w-3xl">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-quran-gold">
              {t("stepsEyebrow")}
            </p>
            <h2
              id="steps-title"
              className="font-heading mt-1 text-3xl text-quran-deep sm:text-4xl"
            >
              {t("stepsTitle")}
            </h2>
            <p className="mt-3 leading-7 text-quran-muted">
              {t("stepsDescription")}
            </p>
          </div>

          <ol className="mt-8 grid gap-4 md:grid-cols-2">
            {stepKeys.map((key, index) => {
              const Icon = stepIcons[index];
              return (
                <li key={key} className="quran-card p-5 sm:p-6">
                  <div className="flex items-start gap-4">
                    <span className="relative flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-quran-green/10 text-quran-green">
                      <Icon className="h-5 w-5" />
                      <span className="absolute -right-1 -top-1 flex h-5 w-5 items-center justify-center rounded-full bg-quran-gold text-[0.65rem] font-bold text-white">
                        {index + 1}
                      </span>
                    </span>
                    <div>
                      <h3 className="font-heading text-2xl text-quran-deep">
                        {t(`steps.${key}Title`)}
                      </h3>
                      <p className="mt-2 leading-7 text-quran-muted">
                        {t(`steps.${key}Text`)}
                      </p>
                    </div>
                  </div>
                </li>
              );
            })}
          </ol>
        </section>

        <div className="mt-14">
          <KhatmProductPreview />
        </div>

        <section
          className="section-panel mt-14"
          aria-labelledby="privacy-title"
        >
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-quran-gold">
            {t("privacyEyebrow")}
          </p>
          <h2
            id="privacy-title"
            className="font-heading mt-1 text-3xl text-quran-deep sm:text-4xl"
          >
            {t("privacyTitle")}
          </h2>
          <div className="mt-7 grid gap-4 md:grid-cols-2">
            <div className="quran-card p-6">
              <Link2 className="h-6 w-6 text-quran-green" />
              <h3 className="font-heading mt-4 text-2xl text-quran-deep">
                {t("linkOnlyTitle")}
              </h3>
              <p className="mt-2 leading-7 text-quran-muted">
                {t("linkOnlyText")}
              </p>
            </div>
            <div className="quran-card p-6">
              <Globe2 className="h-6 w-6 text-quran-green" />
              <h3 className="font-heading mt-4 text-2xl text-quran-deep">
                {t("publicTitle")}
              </h3>
              <p className="mt-2 leading-7 text-quran-muted">
                {t("publicText")}
              </p>
            </div>
          </div>
        </section>

        <div className="mt-14">
          <KhatmMessageTemplates />
        </div>

        <section
          id="faq"
          aria-labelledby="faq-title"
          className="mt-14 scroll-mt-32"
        >
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-quran-gold">
            {t("faqEyebrow")}
          </p>
          <h2
            id="faq-title"
            className="font-heading mt-1 text-3xl text-quran-deep sm:text-4xl"
          >
            {t("faqTitle")}
          </h2>
          <div className="mt-6 divide-y divide-quran-border/60 rounded-3xl border border-quran-border bg-white/55 px-5 sm:px-8">
            {faqItems.map((item) => (
              <details key={item.question} className="group py-5">
                <summary className="flex cursor-pointer list-none items-center justify-between gap-4 font-semibold text-quran-deep marker:hidden">
                  {item.question}
                  <span
                    className="text-xl font-normal text-quran-gold transition-transform group-open:rotate-45"
                    aria-hidden
                  >
                    +
                  </span>
                </summary>
                <p className="max-w-4xl pt-3 leading-7 text-quran-muted">
                  {item.answer}
                </p>
              </details>
            ))}
          </div>
        </section>

        <section className="cta-section" aria-labelledby="guide-final-title">
          <div className="relative z-10 mx-auto max-w-3xl">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-primary-foreground/65">
              {t("finalEyebrow")}
            </p>
            <h2
              id="guide-final-title"
              className="font-heading mt-4 text-3xl sm:text-4xl md:text-5xl"
            >
              {t("finalTitle")}
            </h2>
            <div className="cta-gold-divider" />
            <p className="mx-auto mt-5 max-w-2xl text-base leading-8 text-primary-foreground/75 sm:text-lg">
              {t("finalText")}
            </p>
            <CreateCircleAction
              source="guide_final"
              size="lg"
              className="mt-8 h-13 w-full rounded-full border-2 border-white bg-white px-9 font-semibold text-quran-green hover:bg-white hover:text-quran-green sm:w-auto"
            >
              {t("startCircle")}
              <ArrowRight className="h-5 w-5" />
            </CreateCircleAction>
          </div>
        </section>
      </article>
    </main>
  );
}
