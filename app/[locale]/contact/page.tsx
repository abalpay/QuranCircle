import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { ArrowUpRight, Clock3, Github, MessageCircleMore } from "lucide-react";
import AppPageHero from "@/components/app-page-hero";
import type { LocalePageProps } from "@/i18n/routing";

export async function generateMetadata({
  params,
}: LocalePageProps): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "ContactPage" });
  const canonical = locale === "tr" ? "/tr/contact" : "/contact";
  return {
    title: t("title"),
    description: t("metadataDescription"),
    alternates: {
      canonical,
      languages: { en: "/contact", tr: "/tr/contact" },
    },
    openGraph: {
      title: t("metadataTitle"),
      description: t("metadataDescription"),
      url: canonical,
    },
    twitter: {
      title: t("metadataTitle"),
      description: t("metadataDescription"),
    },
  };
}

export default async function ContactPage({ params }: LocalePageProps) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("ContactPage");

  return (
    <main className="page-shell grow">
      <AppPageHero
        eyebrow={t("eyebrow")}
        title={t("title")}
        description={t("description")}
        icon={MessageCircleMore}
      >
        <div className="app-hero-ledger">
          <p className="text-[0.65rem] font-bold uppercase tracking-[0.2em] text-quran-gold">
            {t("bestPlace")}
          </p>
          <p className="mt-3 font-heading text-3xl text-quran-deep">
            {t("githubIssues")}
          </p>
          <p className="mt-2 text-sm leading-6 text-quran-muted">
            {t("githubDescription")}
          </p>
        </div>
      </AppPageHero>

      <section
        className="mt-8 grid gap-5 md:grid-cols-2"
        aria-label={t("optionsLabel")}
      >
        <article className="app-info-card">
          <div className="app-info-card-icon">
            <Github className="h-6 w-6" />
          </div>
          <h2 className="font-heading text-3xl text-quran-deep">
            {t("openIssue")}
          </h2>
          <p className="mt-3 leading-7 text-quran-muted">
            {t("openIssueDescription")}
          </p>
          <Link
            href="https://github.com/abalpay/QuranCircle/issues"
            className="mt-6 inline-flex min-h-11 items-center gap-2 rounded-full border border-quran-border bg-white/75 px-5 text-sm font-semibold text-quran-green transition-colors hover:border-quran-green/40 hover:bg-white"
            target="_blank"
            rel="noreferrer"
          >
            {t("openTracker")}
            <ArrowUpRight className="h-4 w-4" />
          </Link>
        </article>

        <article className="app-info-card">
          <div className="app-info-card-icon">
            <Clock3 className="h-6 w-6" />
          </div>
          <h2 className="font-heading text-3xl text-quran-deep">
            {t("whatToExpect")}
          </h2>
          <p className="mt-3 leading-7 text-quran-muted">
            {t("expectDescription")}
          </p>
          <div className="mt-6 border-t border-quran-border/55 pt-5 text-sm leading-6 text-quran-muted">
            {t("includeDetails")}
          </div>
        </article>
      </section>
    </main>
  );
}
