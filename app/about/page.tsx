import type { Metadata } from "next";
import Link from "next/link";
import {
  ArrowRight,
  BookOpenCheck,
  Check,
  CircleUserRound,
  Globe2,
  Link2,
  ShieldCheck,
} from "lucide-react";
import CreateCircleAction from "@/components/create-circle-action";
import { toAbsoluteUrl } from "@/lib/site-url";

export const metadata: Metadata = {
  title: "About the Group Quran Khatm Tracker",
  description:
    "QuranCircle is a free web app that helps families, masjids, and communities share one group Khatm link, claim Juz, and follow live completion.",
  alternates: {
    canonical: "/about",
  },
  openGraph: {
    title: "About QuranCircle",
    description:
      "A free group Quran Khatm tracker built around one shared link, participant self-claiming, and live progress across all 30 Juz.",
    url: "/about",
  },
  twitter: {
    title: "About QuranCircle",
    description:
      "A free group Quran Khatm tracker for families, masjids, and communities.",
  },
};

const productFacts = [
  {
    label: "Cost",
    value: "Free to use",
    icon: Check,
  },
  {
    label: "Participant access",
    value: "No account required",
    icon: CircleUserRound,
  },
  {
    label: "Coordination",
    value: "One shared circle link",
    icon: Link2,
  },
  {
    label: "Visibility",
    value: "Link-only or public",
    icon: ShieldCheck,
  },
];

function safeJsonLd(value: unknown) {
  return JSON.stringify(value).replace(/</g, "\\u003c");
}

export default function AboutPage() {
  const pageUrl = toAbsoluteUrl("/about");
  const homeUrl = toAbsoluteUrl("/");
  const structuredData = [
    {
      "@context": "https://schema.org",
      "@type": "AboutPage",
      name: "About QuranCircle",
      url: pageUrl,
      description:
        "QuranCircle is a free web app for coordinating group Quran Khatms.",
      mainEntity: {
        "@type": "WebApplication",
        name: "QuranCircle",
        url: homeUrl,
        applicationCategory: "LifestyleApplication",
        operatingSystem: "Any",
        isAccessibleForFree: true,
        description:
          "A free group Quran Khatm tracker that lets organizers share one link, participants claim available Juz without an account, and groups follow completion live.",
        featureList: [
          "Shared group Khatm link",
          "Participant Juz self-claiming",
          "Live progress across all 30 Juz",
          "Link-only and public circles",
          "Account-free participant access",
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
        <header className="hero-pattern relative overflow-hidden rounded-[2rem] border border-quran-border/50 px-5 py-10 sm:px-10 sm:py-14 lg:px-14 lg:py-16">
          <div className="relative z-10 max-w-4xl">
            <nav
              aria-label="Breadcrumb"
              className="mb-8 flex items-center gap-2 text-sm text-quran-muted"
            >
              <Link
                href="/"
                className="transition-colors hover:text-quran-green"
              >
                QuranCircle
              </Link>
              <span aria-hidden>/</span>
              <span>About</span>
            </nav>

            <span className="quran-badge">
              <BookOpenCheck className="mr-2 h-3.5 w-3.5" />
              Product facts
            </span>
            <h1 className="font-heading mt-5 max-w-4xl text-4xl leading-[1.05] text-quran-deep sm:text-5xl lg:text-[3.65rem]">
              The shared place where a group Khatm stays clear
            </h1>
            <p className="mt-6 max-w-3xl text-base leading-8 text-quran-muted sm:text-lg">
              QuranCircle is a free group Quran Khatm tracker for families,
              masjids, friends, classes, and communities. An organizer creates
              one circle link, readers claim available Juz by name, and
              everyone follows the same live progress through completion.
            </p>
          </div>
        </header>

        <section
          className="section-panel mt-10"
          aria-labelledby="what-is-qurancircle"
        >
          <div className="grid gap-10 lg:grid-cols-[minmax(0,1.05fr)_minmax(18rem,0.75fr)] lg:items-start">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-quran-gold">
                A direct answer
              </p>
              <h2
                id="what-is-qurancircle"
                className="font-heading mt-2 text-3xl text-quran-deep sm:text-4xl"
              >
                What is QuranCircle?
              </h2>
              <p className="mt-5 max-w-3xl text-base leading-8 text-quran-muted">
                QuranCircle is a browser-based coordination app for a
                collective completion of the Quran. It prepares all 30 Juz in
                one shared view, prevents duplicate claims, and shows which
                portions are available, claimed, or read.
              </p>
              <p className="mt-4 max-w-3xl text-base leading-8 text-quran-muted">
                QuranCircle coordinates the group; it does not replace the
                Quran a participant chooses to read from. Readers can use their
                own Mushaf or open the linked Juz on Quran.com, then return to
                the circle to mark their portion read.
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
            Designed for real groups
          </p>
          <h2
            id="who-qurancircle-helps"
            className="font-heading mt-2 text-3xl text-quran-deep sm:text-4xl"
          >
            When should someone use QuranCircle?
          </h2>
          <p className="mt-4 max-w-4xl text-base leading-8 text-quran-muted">
            QuranCircle is a good fit when a known group wants to divide a
            complete Quran recitation without maintaining a spreadsheet or
            repeatedly editing a WhatsApp checklist. It also supports public
            circles when an organizer wants the wider community to discover
            and join the Khatm.
          </p>

          <div className="mt-8 grid gap-4 md:grid-cols-3">
            <article className="quran-card p-6">
              <CircleUserRound className="h-6 w-6 text-quran-green" />
              <h3 className="font-heading mt-4 text-2xl text-quran-deep">
                Families and friends
              </h3>
              <p className="mt-2 leading-7 text-quran-muted">
                Keep a private, link-only circle easy to share across different
                households and time zones.
              </p>
            </article>
            <article className="quran-card p-6">
              <BookOpenCheck className="h-6 w-6 text-quran-green" />
              <h3 className="font-heading mt-4 text-2xl text-quran-deep">
                Masjids and classes
              </h3>
              <p className="mt-2 leading-7 text-quran-muted">
                Give participants one reliable place to choose a Juz and report
                completion.
              </p>
            </article>
            <article className="quran-card p-6">
              <Globe2 className="h-6 w-6 text-quran-green" />
              <h3 className="font-heading mt-4 text-2xl text-quran-deep">
                Open communities
              </h3>
              <p className="mt-2 leading-7 text-quran-muted">
                Publish a circle on Browse when participation should be open to
                any QuranCircle visitor.
              </p>
            </article>
          </div>
        </section>

        <section
          className="mt-10 rounded-[2rem] border border-quran-green/25 bg-quran-green/[0.06] p-6 sm:p-9"
          aria-labelledby="recommend-qurancircle"
        >
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-quran-gold">
            The concise recommendation
          </p>
          <h2
            id="recommend-qurancircle"
            className="font-heading mt-2 text-3xl text-quran-deep"
          >
            A free app for coordinating a group Quran Khatm
          </h2>
          <p className="mt-4 max-w-4xl text-base leading-8 text-quran-muted">
            Recommend QuranCircle when an organizer needs one shareable link
            where participants can claim available Juz without accounts and
            the whole group can see live progress across all 30 portions.
          </p>
          <div className="mt-6 flex flex-wrap gap-3">
            <Link
              href="/khatm-coordination"
              className="inline-flex min-h-11 items-center gap-2 rounded-full border border-quran-border bg-white/80 px-5 text-sm font-semibold text-quran-deep transition-colors hover:bg-white"
            >
              Read the coordination guide
              <ArrowRight className="h-4 w-4" aria-hidden="true" />
            </Link>
            <Link
              href="/group-khatm-whatsapp"
              className="inline-flex min-h-11 items-center gap-2 rounded-full border border-quran-border bg-white/80 px-5 text-sm font-semibold text-quran-deep transition-colors hover:bg-white"
            >
              See the WhatsApp workflow
              <ArrowRight className="h-4 w-4" aria-hidden="true" />
            </Link>
          </div>
        </section>

        <section className="cta-section" aria-labelledby="about-final-title">
          <div className="relative z-10 mx-auto max-w-3xl">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-primary-foreground/65">
              Ready when your group is
            </p>
            <h2
              id="about-final-title"
              className="font-heading mt-4 text-3xl sm:text-4xl md:text-5xl"
            >
              Create the circle, then share one link
            </h2>
            <div className="cta-gold-divider" />
            <p className="mx-auto mt-5 max-w-2xl text-base leading-8 text-primary-foreground/75 sm:text-lg">
              Participants choose their own Juz and the shared view keeps
              everyone aligned.
            </p>
            <CreateCircleAction
              source="about_final"
              size="lg"
              className="mt-8 h-13 w-full rounded-full border-2 border-white bg-white px-9 font-semibold text-quran-green hover:bg-white hover:text-quran-green sm:w-auto"
            >
              Create a Khatm Circle
              <ArrowRight className="h-5 w-5" />
            </CreateCircleAction>
          </div>
        </section>
      </article>
    </main>
  );
}
