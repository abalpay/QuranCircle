import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import {
  ArrowRight,
  BookOpenCheck,
  CalendarCheck2,
  CheckCircle2,
  Clock3,
  HandHeart,
  Link2,
  MessageCircleMore,
  MoonStar,
  UsersRound,
} from "lucide-react";
import CreateCircleAction from "@/components/create-circle-action";
import { toAbsoluteUrl } from "@/lib/site-url";
import type { LocalePageProps } from "@/i18n/routing";

export async function generateMetadata({
  params,
}: LocalePageProps): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "RamadanGuide" });
  const canonical =
    locale === "tr" ? "/tr/ramadan-group-khatm" : "/ramadan-group-khatm";

  return {
    title: t("metadata.title"),
    description: t("metadata.description"),
    keywords: t("metadata.keywords").split(","),
    alternates: {
      canonical,
      languages: {
        en: "/ramadan-group-khatm",
        tr: "/tr/ramadan-group-khatm",
      },
    },
    openGraph: {
      type: "article",
      title: t("metadata.openGraphTitle"),
      description: t("metadata.openGraphDescription"),
      url: canonical,
      images: [
        {
          url: toAbsoluteUrl("/opengraph-image"),
          width: 1200,
          height: 630,
          alt: t("metadata.imageAlt"),
        },
      ],
    },
    twitter: {
      card: "summary_large_image",
      title: t("metadata.twitterTitle"),
      description: t("metadata.twitterDescription"),
      images: [toAbsoluteUrl("/opengraph-image")],
    },
  };
}

function safeJsonLd(value: unknown) {
  return JSON.stringify(value).replace(/</g, "\\u003c");
}

export default async function RamadanGroupKhatmPage({
  params,
}: LocalePageProps) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("RamadanGuide");
  const timeline = [
    { label: t("plan.step1.label"), title: t("plan.step1.title"), text: t("plan.step1.text"), icon: CalendarCheck2 },
    { label: t("plan.step2.label"), title: t("plan.step2.title"), text: t("plan.step2.text"), icon: Link2 },
    { label: t("plan.step3.label"), title: t("plan.step3.title"), text: t("plan.step3.text"), icon: UsersRound },
    { label: t("plan.step4.label"), title: t("plan.step4.title"), text: t("plan.step4.text"), icon: Clock3 },
    { label: t("plan.step5.label"), title: t("plan.step5.title"), text: t("plan.step5.text"), icon: CheckCircle2 },
  ];
  const faqItems = [
    { question: t("faq.items.item1.question"), answer: t("faq.items.item1.answer") },
    { question: t("faq.items.item2.question"), answer: t("faq.items.item2.answer") },
    { question: t("faq.items.item3.question"), answer: t("faq.items.item3.answer") },
    { question: t("faq.items.item4.question"), answer: t("faq.items.item4.answer") },
    { question: t("faq.items.item5.question"), answer: t("faq.items.item5.answer") },
  ];
  const pagePath =
    locale === "tr" ? "/tr/ramadan-group-khatm" : "/ramadan-group-khatm";

  const pageUrl = toAbsoluteUrl(pagePath);
  const structuredData = [
    {
      "@context": "https://schema.org",
      "@type": "Article",
      headline: t("metadata.openGraphTitle"),
      description: t("structuredDescription"),
      datePublished: "2026-07-24",
      dateModified: "2026-07-24",
      mainEntityOfPage: pageUrl,
      image: toAbsoluteUrl("/opengraph-image"),
      author: {
        "@type": "Organization",
        name: "QuranCircle",
        url: toAbsoluteUrl(locale === "tr" ? "/tr" : "/"),
      },
      publisher: {
        "@type": "Organization",
        name: "QuranCircle",
        url: toAbsoluteUrl(locale === "tr" ? "/tr" : "/"),
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
          item: toAbsoluteUrl(locale === "tr" ? "/tr" : "/"),
        },
        {
          "@type": "ListItem",
          position: 2,
          name: t("breadcrumb.current"),
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
          <div className="relative z-10 grid items-center gap-10 lg:grid-cols-[minmax(0,1fr)_17rem]">
            <div>
              <nav
                aria-label={t("breadcrumb.ariaLabel")}
                className="mb-8 flex flex-wrap items-center gap-2 text-sm text-quran-muted"
              >
                <Link
                  href="/"
                  className="transition-colors hover:text-quran-green"
                >
                  QuranCircle
                </Link>
                <span aria-hidden>/</span>
                <Link
                  href="/khatm-coordination"
                  className="transition-colors hover:text-quran-green"
                >
                  {t("breadcrumb.guide")}
                </Link>
                <span aria-hidden>/</span>
                <span>{t("breadcrumb.current")}</span>
              </nav>

              <span className="quran-badge">
                <MoonStar className="mr-2 h-3.5 w-3.5" />
                {t("badge")}
              </span>
              <h1 className="font-heading mt-5 max-w-4xl text-4xl leading-[1.05] text-quran-deep sm:text-5xl lg:text-[3.65rem]">
                {t("title")}
              </h1>
              <p className="mt-6 max-w-3xl text-base leading-8 text-quran-muted sm:text-lg">
                {t("intro")}
              </p>
              <div className="mt-8 flex flex-col gap-3 sm:flex-row">
                <CreateCircleAction
                  source="ramadan_hero"
                  size="lg"
                  className="h-12 rounded-full px-7 text-primary-foreground"
                >
                  {t("createCircle")}
                  <ArrowRight className="h-5 w-5" />
                </CreateCircleAction>
                <Link
                  href="#plan"
                  className="inline-flex h-12 items-center justify-center gap-2 rounded-full border border-quran-border bg-white/75 px-7 text-sm font-semibold text-quran-deep transition-colors hover:bg-white"
                >
                  {t("seePlan")}
                </Link>
              </div>
            </div>

            <div
              aria-hidden
              className="relative hidden min-h-72 items-center justify-center lg:flex"
            >
              <div className="absolute h-60 w-60 rounded-full border border-quran-gold/15" />
              <div className="absolute h-48 w-48 rounded-full border border-quran-green/15" />
              <MoonStar className="relative h-28 w-28 text-quran-gold/75 drop-shadow-[0_16px_18px_hsl(var(--quran-gold)/0.14)]" />
              <span className="absolute bottom-5 rounded-full border border-quran-border bg-white/80 px-4 py-2 text-[0.65rem] font-bold uppercase tracking-[0.18em] text-quran-green">
                {t("preview")}
              </span>
            </div>
          </div>
        </header>

        <aside className="mt-8 rounded-3xl border border-quran-green/25 bg-quran-green/[0.06] p-6 sm:p-8">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-quran-gold">
            {t("short.eyebrow")}
          </p>
          <h2 className="font-heading mt-2 text-2xl text-quran-deep">
            {t("short.title")}
          </h2>
          <p className="mt-3 max-w-4xl leading-8 text-quran-muted">
            {t("short.description")}
          </p>
        </aside>

        <section
          className="section-panel mt-10"
          aria-labelledby="ramadan-principle-title"
        >
          <div className="grid gap-8 lg:grid-cols-[minmax(0,0.8fr)_minmax(20rem,1fr)] lg:items-center">
            <div className="relative overflow-hidden rounded-[2rem] border border-quran-gold/30 bg-quran-gold/[0.07] p-7">
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-quran-gold">
                {t("principle.distinction")}
              </p>
              <p className="font-heading mt-4 text-6xl leading-none text-quran-deep sm:text-7xl">
                30
              </p>
              <p className="mt-2 text-sm font-bold uppercase tracking-[0.18em] text-quran-green">
                {t("principle.juzNotReaders")}
              </p>
              <div className="mt-6 grid grid-cols-6 gap-2" aria-hidden="true">
                {Array.from({ length: 30 }, (_, index) => (
                  <span
                    key={index}
                    className={`aspect-square rounded-md border ${
                      index < 18
                        ? "border-quran-green/30 bg-quran-green/15"
                        : "border-quran-border bg-white/60"
                    }`}
                  />
                ))}
              </div>
            </div>
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-quran-gold">
                {t("principle.eyebrow")}
              </p>
              <h2
                id="ramadan-principle-title"
                className="font-heading mt-2 text-3xl text-quran-deep sm:text-4xl"
              >
                {t("principle.title")}
              </h2>
              <p className="mt-4 leading-8 text-quran-muted">
                {t("principle.descriptionOne")}
              </p>
              <p className="mt-4 leading-8 text-quran-muted">
                {t("principle.descriptionTwo")}
              </p>
            </div>
          </div>
        </section>

        <section
          id="plan"
          className="section-panel mt-10 scroll-mt-32"
          aria-labelledby="ramadan-plan-title"
        >
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-quran-gold">
            {t("plan.eyebrow")}
          </p>
          <h2
            id="ramadan-plan-title"
            className="font-heading mt-2 text-3xl text-quran-deep sm:text-4xl"
          >
            {t("plan.title")}
          </h2>
          <ol className="mt-8 divide-y divide-quran-border/60 border-y border-quran-border/60">
            {timeline.map(({ label, title, text, icon: Icon }, index) => (
              <li
                key={title}
                className="grid gap-4 py-6 sm:grid-cols-[2.5rem_3rem_minmax(0,1fr)] sm:items-start"
              >
                <span className="font-heading text-sm tracking-[0.16em] text-quran-gold">
                  0{index + 1}
                </span>
                <span className="flex h-10 w-10 items-center justify-center rounded-2xl bg-quran-green/10 text-quran-green">
                  <Icon className="h-4.5 w-4.5" aria-hidden="true" />
                </span>
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.14em] text-quran-gold">
                    {label}
                  </p>
                  <h3 className="font-heading mt-1 text-2xl text-quran-deep">
                    {title}
                  </h3>
                  <p className="mt-2 max-w-3xl leading-7 text-quran-muted">
                    {text}
                  </p>
                </div>
              </li>
            ))}
          </ol>
        </section>

        <section
          className="section-panel mt-10"
          aria-labelledby="ramadan-group-sizes-title"
        >
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-quran-gold">
            {t("groupSizes.eyebrow")}
          </p>
          <h2
            id="ramadan-group-sizes-title"
            className="font-heading mt-2 text-3xl text-quran-deep sm:text-4xl"
          >
            {t("groupSizes.title")}
          </h2>
          <div className="mt-8 grid gap-4 md:grid-cols-3">
            <article className="quran-card p-6">
              <HandHeart className="h-6 w-6 text-quran-green" />
              <h3 className="font-heading mt-4 text-2xl text-quran-deep">
                {t("groupSizes.familyTitle")}
              </h3>
              <p className="mt-2 leading-7 text-quran-muted">
                {t("groupSizes.familyDescription")}
              </p>
            </article>
            <article className="quran-card p-6">
              <UsersRound className="h-6 w-6 text-quran-green" />
              <h3 className="font-heading mt-4 text-2xl text-quran-deep">
                {t("groupSizes.friendsTitle")}
              </h3>
              <p className="mt-2 leading-7 text-quran-muted">
                {t("groupSizes.friendsDescription")}
              </p>
            </article>
            <article className="quran-card p-6">
              <BookOpenCheck className="h-6 w-6 text-quran-green" />
              <h3 className="font-heading mt-4 text-2xl text-quran-deep">
                {t("groupSizes.masjidTitle")}
              </h3>
              <p className="mt-2 leading-7 text-quran-muted">
                {t("groupSizes.masjidDescription")}
              </p>
            </article>
          </div>
        </section>

        <section
          className="mt-10 overflow-hidden rounded-[2rem] border border-quran-green/25 bg-quran-green/[0.055] p-6 sm:p-9"
          aria-labelledby="ramadan-invitation-title"
        >
          <div className="grid gap-8 lg:grid-cols-[minmax(0,0.7fr)_minmax(0,1.3fr)]">
            <div>
              <MessageCircleMore className="h-7 w-7 text-quran-green" />
              <p className="mt-4 text-xs font-semibold uppercase tracking-[0.18em] text-quran-gold">
                {t("invitation.eyebrow")}
              </p>
              <h2
                id="ramadan-invitation-title"
                className="font-heading mt-2 text-3xl text-quran-deep"
              >
                {t("invitation.title")}
              </h2>
              <p className="mt-3 leading-7 text-quran-muted">
                {t("invitation.description")}
              </p>
            </div>
            <blockquote className="rounded-3xl border border-quran-border/70 bg-white/75 p-6 text-sm leading-7 text-quran-muted">
              <p>
                {t("invitation.messageOne")}
              </p>
              <p className="mt-4">
                {t("invitation.messageTwo")}
              </p>
            </blockquote>
          </div>
        </section>

        <section className="mt-14" aria-labelledby="ramadan-faq-title">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-quran-gold">
            {t("faq.eyebrow")}
          </p>
          <h2
            id="ramadan-faq-title"
            className="font-heading mt-2 text-3xl text-quran-deep sm:text-4xl"
          >
            {t("faq.title")}
          </h2>
          <div className="mt-6 divide-y divide-quran-border/60 rounded-3xl border border-quran-border bg-white/55 px-5 sm:px-8">
            {faqItems.map((item) => (
              <details key={item.question} className="group py-5">
                <summary className="flex cursor-pointer list-none items-center justify-between gap-4 font-semibold text-quran-deep marker:hidden">
                  {item.question}
                  <span
                    className="text-xl font-normal text-quran-gold transition-transform group-open:rotate-45"
                    aria-hidden="true"
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

        <section
          className="mt-10 grid gap-4 md:grid-cols-2"
          aria-label={t("related.ariaLabel")}
        >
          <Link
            href="/khatm-coordination"
            className="quran-card-interactive group p-6"
          >
            <span className="text-xs font-semibold uppercase tracking-[0.16em] text-quran-gold">
              {t("related.completeGuide")}
            </span>
            <h2 className="font-heading mt-2 text-2xl text-quran-deep group-hover:text-quran-green">
              {t("related.guideTitle")}
            </h2>
            <p className="mt-2 leading-7 text-quran-muted">
              {t("related.guideDescription")}
            </p>
          </Link>
          <Link
            href="/group-khatm-whatsapp"
            className="quran-card-interactive group p-6"
          >
            <span className="text-xs font-semibold uppercase tracking-[0.16em] text-quran-gold">
              {t("related.whatsappWorkflow")}
            </span>
            <h2 className="font-heading mt-2 text-2xl text-quran-deep group-hover:text-quran-green">
              {t("related.whatsappTitle")}
            </h2>
            <p className="mt-2 leading-7 text-quran-muted">
              {t("related.whatsappDescription")}
            </p>
          </Link>
        </section>

        <section className="cta-section" aria-labelledby="ramadan-final-title">
          <div className="relative z-10 mx-auto max-w-3xl">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-primary-foreground/65">
              {t("final.eyebrow")}
            </p>
            <h2
              id="ramadan-final-title"
              className="font-heading mt-4 text-3xl sm:text-4xl md:text-5xl"
            >
              {t("final.title")}
            </h2>
            <div className="cta-gold-divider" />
            <p className="mx-auto mt-5 max-w-2xl text-base leading-8 text-primary-foreground/75 sm:text-lg">
              {t("final.description")}
            </p>
            <CreateCircleAction
              source="ramadan_final"
              size="lg"
              className="mt-8 h-13 w-full rounded-full border-2 border-white bg-white px-9 font-semibold text-quran-green hover:bg-white hover:text-quran-green sm:w-auto"
            >
              {t("createCircle")}
              <ArrowRight className="h-5 w-5" />
            </CreateCircleAction>
          </div>
        </section>
      </article>
    </main>
  );
}
