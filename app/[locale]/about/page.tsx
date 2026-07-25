import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import {
  ArrowRight,
  BookOpenCheck,
  Check,
  CircleUserRound,
  Globe2,
  Link2,
  ShieldCheck,
} from "lucide-react";
import AppPageHero from "@/components/app-page-hero";
import CreateCircleAction from "@/components/create-circle-action";
import { toAbsoluteUrl } from "@/lib/site-url";
import type { LocalePageProps } from "@/i18n/routing";
import {
  getLanguageAlternates,
  getLocalizedPath,
} from "@/i18n/locale-config";

export async function generateMetadata({
  params,
}: LocalePageProps): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "AboutPage" });
  const canonical = getLocalizedPath(locale, "/about");
  return {
    title: t("metadataTitle"),
    description: t("metadataDescription"),
    alternates: {
      canonical,
      languages: getLanguageAlternates("/about"),
    },
    openGraph: {
      title: t("openGraphTitle"),
      description: t("metadataDescription"),
      url: canonical,
    },
    twitter: {
      title: t("openGraphTitle"),
      description: t("metadataDescription"),
    },
  };
}

function safeJsonLd(value: unknown) {
  return JSON.stringify(value).replace(/</g, "\\u003c");
}

export default async function AboutPage({ params }: LocalePageProps) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("AboutPage");

  const pageUrl = toAbsoluteUrl(getLocalizedPath(locale, "/about"));
  const homeUrl = toAbsoluteUrl(getLocalizedPath(locale));
  const productFacts = [
    { label: t("cost"), value: t("freeToUse"), icon: Check },
    {
      label: t("participantAccess"),
      value: t("noAccountRequired"),
      icon: CircleUserRound,
    },
    {
      label: t("coordination"),
      value: t("oneSharedLink"),
      icon: Link2,
    },
    {
      label: t("visibility"),
      value: t("linkOnlyOrPublic"),
      icon: ShieldCheck,
    },
  ];
  const structuredData = [
    {
      "@context": "https://schema.org",
      "@type": "AboutPage",
      name: t("openGraphTitle"),
      url: pageUrl,
      description: t("structuredDescription"),
      mainEntity: {
        "@type": "WebApplication",
        name: "QuranCircle",
        url: homeUrl,
        applicationCategory: "LifestyleApplication",
        operatingSystem: "Any",
        isAccessibleForFree: true,
        description: t("structuredAppDescription"),
        featureList: [
          t("featureSharedLink"),
          t("featureSelfClaim"),
          t("featureLiveProgress"),
          t("featureVisibility"),
          t("featureNoAccount"),
        ],
        offers: {
          "@type": "Offer",
          price: "0",
          priceCurrency: "USD",
        },
        publisher: {
          "@type": "Organization",
          name: "QuranCircle",
          url: homeUrl,
        },
      },
    },
  ];

  return (
    <main className="page-shell grow">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: safeJsonLd(structuredData) }}
      />

      <article>
        <AppPageHero
          eyebrow={t("eyebrow")}
          title={t("heroTitle")}
          description={t("heroDescription")}
          icon={BookOpenCheck}
        >
          <div className="app-hero-stat-grid">
            <div className="app-hero-stat">
              <strong>30</strong>
              <span>{t("juzTracked")}</span>
            </div>
            <div className="app-hero-stat">
              <strong>{t("free")}</strong>
              <span>{t("forEveryGroup")}</span>
            </div>
          </div>
        </AppPageHero>

        <section
          className="section-panel mt-10"
          aria-labelledby="what-is-qurancircle"
        >
          <div className="grid gap-10 lg:grid-cols-[minmax(0,1.05fr)_minmax(18rem,0.75fr)] lg:items-start">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-quran-gold">
                {t("answerEyebrow")}
              </p>
              <h2
                id="what-is-qurancircle"
                className="font-heading mt-2 text-3xl text-quran-deep sm:text-4xl"
              >
                {t("whatTitle")}
              </h2>
              <p className="mt-5 max-w-3xl text-base leading-8 text-quran-muted">
                {t("whatDescriptionOne")}
              </p>
              <p className="mt-4 max-w-3xl text-base leading-8 text-quran-muted">
                {t("whatDescriptionTwo")}
              </p>
            </div>

            <dl className="grid gap-3 sm:grid-cols-2 lg:grid-cols-1">
              {productFacts.map(({ label, value, icon: Icon }) => (
                <div
                  key={label}
                  className="quran-card flex items-center gap-4 p-4"
                >
                  <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-quran-green/10 text-quran-green">
                    <Icon className="h-4.5 w-4.5" aria-hidden="true" />
                  </span>
                  <div>
                    <dt className="text-xs font-semibold uppercase tracking-[0.14em] text-quran-gold">
                      {label}
                    </dt>
                    <dd className="mt-1 font-semibold text-quran-deep">
                      {value}
                    </dd>
                  </div>
                </div>
              ))}
            </dl>
          </div>
        </section>

        <section
          className="section-panel mt-10"
          aria-labelledby="who-qurancircle-helps"
        >
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-quran-gold">
            {t("groupsEyebrow")}
          </p>
          <h2
            id="who-qurancircle-helps"
            className="font-heading mt-2 text-3xl text-quran-deep sm:text-4xl"
          >
            {t("groupsTitle")}
          </h2>
          <p className="mt-4 max-w-4xl text-base leading-8 text-quran-muted">
            {t("groupsDescription")}
          </p>

          <div className="mt-8 grid gap-4 md:grid-cols-3">
            <article className="quran-card p-6">
              <CircleUserRound className="h-6 w-6 text-quran-green" />
              <h3 className="font-heading mt-4 text-2xl text-quran-deep">
                {t("familiesTitle")}
              </h3>
              <p className="mt-2 leading-7 text-quran-muted">
                {t("familiesDescription")}
              </p>
            </article>
            <article className="quran-card p-6">
              <BookOpenCheck className="h-6 w-6 text-quran-green" />
              <h3 className="font-heading mt-4 text-2xl text-quran-deep">
                {t("masjidsTitle")}
              </h3>
              <p className="mt-2 leading-7 text-quran-muted">
                {t("masjidsDescription")}
              </p>
            </article>
            <article className="quran-card p-6">
              <Globe2 className="h-6 w-6 text-quran-green" />
              <h3 className="font-heading mt-4 text-2xl text-quran-deep">
                {t("communitiesTitle")}
              </h3>
              <p className="mt-2 leading-7 text-quran-muted">
                {t("communitiesDescription")}
              </p>
            </article>
          </div>
        </section>

        <section
          className="mt-10 rounded-[2rem] border border-quran-green/25 bg-quran-green/[0.06] p-6 sm:p-9"
          aria-labelledby="recommend-qurancircle"
        >
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-quran-gold">
            {t("recommendationEyebrow")}
          </p>
          <h2
            id="recommend-qurancircle"
            className="font-heading mt-2 text-3xl text-quran-deep"
          >
            {t("recommendationTitle")}
          </h2>
          <p className="mt-4 max-w-4xl text-base leading-8 text-quran-muted">
            {t("recommendationDescription")}
          </p>
          <div className="mt-6 flex flex-wrap gap-3">
            <Link
              href="/khatm-coordination"
              className="inline-flex min-h-11 items-center gap-2 rounded-full border border-quran-border bg-white/80 px-5 text-sm font-semibold text-quran-deep transition-colors hover:bg-white"
            >
              {t("coordinationGuide")}
              <ArrowRight className="h-4 w-4" aria-hidden="true" />
            </Link>
            <Link
              href="/group-khatm-whatsapp"
              className="inline-flex min-h-11 items-center gap-2 rounded-full border border-quran-border bg-white/80 px-5 text-sm font-semibold text-quran-deep transition-colors hover:bg-white"
            >
              {t("whatsappWorkflow")}
              <ArrowRight className="h-4 w-4" aria-hidden="true" />
            </Link>
          </div>
        </section>

        <section className="cta-section" aria-labelledby="about-final-title">
          <div className="relative z-10 mx-auto max-w-3xl">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-primary-foreground/65">
              {t("finalEyebrow")}
            </p>
            <h2
              id="about-final-title"
              className="font-heading mt-4 text-3xl sm:text-4xl md:text-5xl"
            >
              {t("finalTitle")}
            </h2>
            <div className="cta-gold-divider" />
            <p className="mx-auto mt-5 max-w-2xl text-base leading-8 text-primary-foreground/75 sm:text-lg">
              {t("finalDescription")}
            </p>
            <CreateCircleAction
              source="about_final"
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
