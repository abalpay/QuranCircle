import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import {
  ArrowRight,
  CheckCircle2,
  ClipboardList,
  Link2,
  MessageCircleMore,
  RefreshCw,
  Send,
  UsersRound,
  X,
} from "lucide-react";
import CreateCircleAction from "@/components/create-circle-action";
import KhatmMessageTemplates from "@/components/khatm-message-templates";
import { toAbsoluteUrl } from "@/lib/site-url";
import type { LocalePageProps } from "@/i18n/routing";

export async function generateMetadata({
  params,
}: LocalePageProps): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "WhatsappGuide" });
  const canonical =
    locale === "tr"
      ? "/tr/group-khatm-whatsapp"
      : "/group-khatm-whatsapp";

  return {
    title: t("metadata.title"),
    description: t("metadata.description"),
    keywords: t("metadata.keywords").split(","),
    alternates: {
      canonical,
      languages: {
        en: "/group-khatm-whatsapp",
        tr: "/tr/group-khatm-whatsapp",
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

export default async function GroupKhatmWhatsappPage({
  params,
}: LocalePageProps) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("WhatsappGuide");
  const workflow = [
    { title: t("workflow.step1.title"), text: t("workflow.step1.text"), icon: UsersRound },
    { title: t("workflow.step2.title"), text: t("workflow.step2.text"), icon: Send },
    { title: t("workflow.step3.title"), text: t("workflow.step3.text"), icon: Link2 },
    { title: t("workflow.step4.title"), text: t("workflow.step4.text"), icon: RefreshCw },
    { title: t("workflow.step5.title"), text: t("workflow.step5.text"), icon: MessageCircleMore },
  ];
  const faqItems = [
    {
      question: t("faq.items.item1.question"),
      answer: t("faq.items.item1.answer"),
    },
    {
      question: t("faq.items.item2.question"),
      answer: t("faq.items.item2.answer"),
    },
    {
      question: t("faq.items.item3.question"),
      answer: t("faq.items.item3.answer"),
    },
    {
      question: t("faq.items.item4.question"),
      answer: t("faq.items.item4.answer"),
    },
  ];
  const pagePath =
    locale === "tr"
      ? "/tr/group-khatm-whatsapp"
      : "/group-khatm-whatsapp";

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
          <div className="relative z-10 grid items-center gap-10 lg:grid-cols-[minmax(0,1fr)_16rem]">
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
                <MessageCircleMore className="mr-2 h-3.5 w-3.5" />
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
                  source="whatsapp_hero"
                  size="lg"
                  className="h-12 rounded-full px-7 text-primary-foreground"
                >
                  {t("createSharedCircle")}
                  <ArrowRight className="h-5 w-5" />
                </CreateCircleAction>
                <Link
                  href="#messages"
                  className="inline-flex h-12 items-center justify-center gap-2 rounded-full border border-quran-border bg-white/75 px-7 text-sm font-semibold text-quran-deep transition-colors hover:bg-white"
                >
                  {t("copyTemplates")}
                </Link>
              </div>
            </div>

            <div
              aria-hidden
              className="relative hidden min-h-72 items-center justify-center lg:flex"
            >
              <div className="absolute h-56 w-40 -rotate-6 rounded-[2rem] border border-quran-green/20 bg-quran-green/[0.05]" />
              <div className="relative flex h-56 w-40 rotate-3 flex-col rounded-[2rem] border border-quran-border bg-white/85 p-4 shadow-[0_26px_48px_-30px_hsl(var(--quran-deep)/0.65)]">
                <div className="flex items-center gap-2 border-b border-quran-border/60 pb-3 text-quran-green">
                  <MessageCircleMore className="h-5 w-5" />
                  <span className="text-xs font-bold">
                    {t("preview.groupKhatm")}
                  </span>
                </div>
                <div className="mt-4 space-y-2">
                  <span className="block h-8 w-[82%] rounded-xl rounded-bl-sm bg-quran-green/10" />
                  <span className="ml-auto block h-10 w-[72%] rounded-xl rounded-br-sm bg-quran-gold/15" />
                  <span className="block h-6 w-[62%] rounded-xl rounded-bl-sm bg-quran-green/10" />
                </div>
                <span className="mt-auto flex h-9 items-center justify-center rounded-full bg-quran-green text-[0.62rem] font-bold text-white">
                  {t("preview.openSharedCircle")}
                </span>
              </div>
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
          aria-labelledby="whatsapp-comparison-title"
        >
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-quran-gold">
            {t("comparison.eyebrow")}
          </p>
          <h2
            id="whatsapp-comparison-title"
            className="font-heading mt-2 text-3xl text-quran-deep sm:text-4xl"
          >
            {t("comparison.title")}
          </h2>
          <div className="mt-8 grid gap-4 md:grid-cols-2">
            <article className="rounded-3xl border border-quran-border/70 bg-white/55 p-6">
              <MessageCircleMore className="h-6 w-6 text-quran-gold" />
              <h3 className="font-heading mt-4 text-2xl text-quran-deep">
                {t("comparison.whatsappTitle")}
              </h3>
              <ul className="mt-5 space-y-3 text-quran-muted">
                {[
                  t("comparison.whatsappItems.invitation"),
                  t("comparison.whatsappItems.questions"),
                  t("comparison.whatsappItems.reminder"),
                  t("comparison.whatsappItems.completion"),
                ].map((item) => (
                  <li key={item} className="flex gap-3">
                    <CheckCircle2 className="mt-1 h-4 w-4 shrink-0 text-quran-green" />
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </article>
            <article className="rounded-3xl border border-quran-green/25 bg-quran-green/[0.055] p-6">
              <ClipboardList className="h-6 w-6 text-quran-green" />
              <h3 className="font-heading mt-4 text-2xl text-quran-deep">
                {t("comparison.quranCircleTitle")}
              </h3>
              <ul className="mt-5 space-y-3 text-quran-muted">
                {[
                  t("comparison.quranCircleItems.liveList"),
                  t("comparison.quranCircleItems.selfClaim"),
                  t("comparison.quranCircleItems.preventDuplicates"),
                  t("comparison.quranCircleItems.status"),
                ].map((item) => (
                  <li key={item} className="flex gap-3">
                    <CheckCircle2 className="mt-1 h-4 w-4 shrink-0 text-quran-green" />
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </article>
          </div>
        </section>

        <section
          className="section-panel mt-10"
          aria-labelledby="whatsapp-workflow-title"
        >
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-quran-gold">
            {t("workflow.eyebrow")}
          </p>
          <h2
            id="whatsapp-workflow-title"
            className="font-heading mt-2 text-3xl text-quran-deep sm:text-4xl"
          >
            {t("workflow.title")}
          </h2>
          <ol className="mt-8 divide-y divide-quran-border/60 border-y border-quran-border/60">
            {workflow.map(({ title, text, icon: Icon }, index) => (
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
                  <h3 className="font-heading text-2xl text-quran-deep">
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

        <div id="messages" className="mt-14 scroll-mt-32">
          <KhatmMessageTemplates />
        </div>

        <section
          className="section-panel mt-14"
          aria-labelledby="avoid-whatsapp-problems-title"
        >
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-quran-gold">
            {t("failures.eyebrow")}
          </p>
          <h2
            id="avoid-whatsapp-problems-title"
            className="font-heading mt-2 text-3xl text-quran-deep sm:text-4xl"
          >
            {t("failures.title")}
          </h2>
          <div className="mt-7 grid gap-4 md:grid-cols-3">
            {[
              {
                title: t("failures.items.duplicates.title"),
                text: t("failures.items.duplicates.text"),
              },
              {
                title: t("failures.items.silentChanges.title"),
                text: t("failures.items.silentChanges.text"),
              },
              {
                title: t("failures.items.staleReposts.title"),
                text: t("failures.items.staleReposts.text"),
              },
            ].map((item) => (
              <article key={item.title} className="quran-card p-6">
                <X className="h-5 w-5 text-quran-gold" aria-hidden="true" />
                <h3 className="font-heading mt-4 text-2xl text-quran-deep">
                  {item.title}
                </h3>
                <p className="mt-2 leading-7 text-quran-muted">{item.text}</p>
              </article>
            ))}
          </div>
        </section>

        <section className="mt-14" aria-labelledby="whatsapp-faq-title">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-quran-gold">
            {t("faq.eyebrow")}
          </p>
          <h2
            id="whatsapp-faq-title"
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
              {t("related.planTitle")}
            </h2>
            <p className="mt-2 leading-7 text-quran-muted">
              {t("related.planDescription")}
            </p>
          </Link>
          <Link
            href="/ramadan-group-khatm"
            className="quran-card-interactive group p-6"
          >
            <span className="text-xs font-semibold uppercase tracking-[0.16em] text-quran-gold">
              {t("related.seasonalGuide")}
            </span>
            <h2 className="font-heading mt-2 text-2xl text-quran-deep group-hover:text-quran-green">
              {t("related.ramadanTitle")}
            </h2>
            <p className="mt-2 leading-7 text-quran-muted">
              {t("related.ramadanDescription")}
            </p>
          </Link>
        </section>

        <section className="cta-section" aria-labelledby="whatsapp-final-title">
          <div className="relative z-10 mx-auto max-w-3xl">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-primary-foreground/65">
              {t("final.eyebrow")}
            </p>
            <h2
              id="whatsapp-final-title"
              className="font-heading mt-4 text-3xl sm:text-4xl md:text-5xl"
            >
              {t("final.title")}
            </h2>
            <div className="cta-gold-divider" />
            <p className="mx-auto mt-5 max-w-2xl text-base leading-8 text-primary-foreground/75 sm:text-lg">
              {t("final.description")}
            </p>
            <CreateCircleAction
              source="whatsapp_final"
              size="lg"
              className="mt-8 h-13 w-full rounded-full border-2 border-white bg-white px-9 font-semibold text-quran-green hover:bg-white hover:text-quran-green sm:w-auto"
            >
              {t("final.createCircle")}
              <ArrowRight className="h-5 w-5" />
            </CreateCircleAction>
          </div>
        </section>
      </article>
    </main>
  );
}
