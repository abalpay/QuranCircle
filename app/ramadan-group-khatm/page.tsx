import type { Metadata } from "next";
import Link from "next/link";
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

export const metadata: Metadata = {
  title: "Ramadan Group Quran Khatm Plan",
  description:
    "Plan a Ramadan group Quran Khatm with one shared link, flexible Juz claims, clear deadlines, live progress, and copy-ready organizer guidance.",
  keywords: [
    "Ramadan group Quran Khatm",
    "Ramadan Khatm plan",
    "Ramadan Juz tracker",
    "group Khatam Ramadan",
    "Quran completion group",
  ],
  alternates: {
    canonical: "/ramadan-group-khatm",
  },
  openGraph: {
    type: "article",
    title: "How to Plan a Ramadan Group Quran Khatm",
    description:
      "A flexible 30-Juz coordination plan for families, masjids, and communities.",
    url: "/ramadan-group-khatm",
    images: [
      {
        url: "/opengraph-image",
        width: 1200,
        height: 630,
        alt: "Ramadan group Quran Khatm planning guide",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Plan a Ramadan Group Quran Khatm",
    description:
      "One shared circle, flexible Juz claims, and a clear path to completion.",
    images: ["/opengraph-image"],
  },
};

const timeline = [
  {
    label: "Before inviting",
    title: "Choose the intention and completion window",
    text: "State what the group is completing, when claims should be made, and the exact date and time by which reading should finish.",
    icon: CalendarCheck2,
  },
  {
    label: "At launch",
    title: "Create one circle and share one link",
    text: "Use a link-only circle for a known group or a public circle when participation should be open to the wider community.",
    icon: Link2,
  },
  {
    label: "During claiming",
    title: "Let participation stay flexible",
    text: "Readers choose any available Juz. Someone may take one portion or several, so the plan works without assigning a fixed number of people.",
    icon: UsersRound,
  },
  {
    label: "Before the deadline",
    title: "Check the live view and remind gently",
    text: "Send the same link back to the group so everyone can see what remains and release a Juz early if plans change.",
    icon: Clock3,
  },
  {
    label: "At completion",
    title: "Confirm all 30 Juz are read",
    text: "Use the shared progress as the final check, thank the readers, and send the completion message to the group.",
    icon: CheckCircle2,
  },
];

const faqItems = [
  {
    question: "Do I need 30 people for a Ramadan group Khatm?",
    answer:
      "No. The Quran has 30 Juz, but a group Khatm does not require 30 readers. One participant can claim more than one available Juz, so the same shared circle works for a small family or a larger community.",
  },
  {
    question: "Should I assign every reader a Juz in advance?",
    answer:
      "You can, but self-claiming is usually easier to maintain. Readers choose an available Juz based on their capacity, and the live circle prevents two people from accidentally taking the same portion.",
  },
  {
    question: "Should a Ramadan family Khatm be public?",
    answer:
      "Usually not. A link-only QuranCircle circle stays off the public Browse page while remaining easy to send to family and friends. Choose public only when anyone should be able to discover and join.",
  },
  {
    question: "What if a reader falls behind?",
    answer:
      "Encourage the reader to unclaim the Juz early if they cannot finish. The portion becomes available again in the same live circle, allowing someone else to take it before the deadline.",
  },
  {
    question: "Can the group complete more than one Khatm?",
    answer:
      "Yes. A QuranCircle event can continue into additional Khatm cycles, allowing an ongoing group to keep the same shared circle rather than starting its coordination from scratch.",
  },
];

function safeJsonLd(value: unknown) {
  return JSON.stringify(value).replace(/</g, "\\u003c");
}

export default function RamadanGroupKhatmPage() {
  const pageUrl = toAbsoluteUrl("/ramadan-group-khatm");
  const structuredData = [
    {
      "@context": "https://schema.org",
      "@type": "Article",
      headline: "How to Plan a Ramadan Group Quran Khatm",
      description:
        "A flexible workflow for coordinating all 30 Juz through one shared QuranCircle link during Ramadan.",
      datePublished: "2026-07-24",
      dateModified: "2026-07-24",
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
          name: "Ramadan Group Khatm",
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
                aria-label="Breadcrumb"
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
                  Khatm guide
                </Link>
                <span aria-hidden>/</span>
                <span>Ramadan plan</span>
              </nav>

              <span className="quran-badge">
                <MoonStar className="mr-2 h-3.5 w-3.5" />
                Ramadan organizer resource
              </span>
              <h1 className="font-heading mt-5 max-w-4xl text-4xl leading-[1.05] text-quran-deep sm:text-5xl lg:text-[3.65rem]">
                How to plan a Ramadan group Quran Khatm
              </h1>
              <p className="mt-6 max-w-3xl text-base leading-8 text-quran-muted sm:text-lg">
                Build the group around one completion window and one shared
                circle, not a required number of readers. Participants claim
                according to their capacity while everyone sees the same live
                progress across all 30 Juz.
              </p>
              <div className="mt-8 flex flex-col gap-3 sm:flex-row">
                <CreateCircleAction
                  source="ramadan_hero"
                  size="lg"
                  className="h-12 rounded-full px-7 text-primary-foreground"
                >
                  Create a Ramadan Khatm Circle
                  <ArrowRight className="h-5 w-5" />
                </CreateCircleAction>
                <Link
                  href="#plan"
                  className="inline-flex h-12 items-center justify-center gap-2 rounded-full border border-quran-border bg-white/75 px-7 text-sm font-semibold text-quran-deep transition-colors hover:bg-white"
                >
                  See the Five-Part Plan
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
                30 Juz · one shared circle
              </span>
            </div>
          </div>
        </header>

        <aside className="mt-8 rounded-3xl border border-quran-green/25 bg-quran-green/[0.06] p-6 sm:p-8">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-quran-gold">
            The short answer
          </p>
          <h2 className="font-heading mt-2 text-2xl text-quran-deep">
            Set the deadline, then let the group share the work
          </h2>
          <p className="mt-3 max-w-4xl leading-8 text-quran-muted">
            Create one QuranCircle event, state when the Khatm should finish,
            and send its link to the group. Readers claim any available Juz,
            mark it read when finished, and return portions they can no longer
            complete.
          </p>
        </aside>

        <section
          className="section-panel mt-10"
          aria-labelledby="ramadan-principle-title"
        >
          <div className="grid gap-8 lg:grid-cols-[minmax(0,0.8fr)_minmax(20rem,1fr)] lg:items-center">
            <div className="relative overflow-hidden rounded-[2rem] border border-quran-gold/30 bg-quran-gold/[0.07] p-7">
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-quran-gold">
                The important distinction
              </p>
              <p className="font-heading mt-4 text-6xl leading-none text-quran-deep sm:text-7xl">
                30
              </p>
              <p className="mt-2 text-sm font-bold uppercase tracking-[0.18em] text-quran-green">
                Juz, not 30 required readers
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
                Plan for capacity, not headcount
              </p>
              <h2
                id="ramadan-principle-title"
                className="font-heading mt-2 text-3xl text-quran-deep sm:text-4xl"
              >
                A useful plan stays flexible
              </h2>
              <p className="mt-4 leading-8 text-quran-muted">
                A family of five may complete the Khatm by taking several Juz
                each. A larger community may have many people take one portion.
                The organizer does not need to calculate an ideal group size;
                the shared circle simply keeps the available work visible.
              </p>
              <p className="mt-4 leading-8 text-quran-muted">
                What matters is a clear completion window, early communication,
                and a simple way for readers to release a portion when their
                plans change.
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
            From invitation to completion
          </p>
          <h2
            id="ramadan-plan-title"
            className="font-heading mt-2 text-3xl text-quran-deep sm:text-4xl"
          >
            The five-part Ramadan group Khatm plan
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
            One workflow, different groups
          </p>
          <h2
            id="ramadan-group-sizes-title"
            className="font-heading mt-2 text-3xl text-quran-deep sm:text-4xl"
          >
            Adapt claims without redesigning the Khatm
          </h2>
          <div className="mt-8 grid gap-4 md:grid-cols-3">
            <article className="quran-card p-6">
              <HandHeart className="h-6 w-6 text-quran-green" />
              <h3 className="font-heading mt-4 text-2xl text-quran-deep">
                A small family
              </h3>
              <p className="mt-2 leading-7 text-quran-muted">
                Readers can claim several available Juz over the completion
                window and return any portion they cannot finish.
              </p>
            </article>
            <article className="quran-card p-6">
              <UsersRound className="h-6 w-6 text-quran-green" />
              <h3 className="font-heading mt-4 text-2xl text-quran-deep">
                Friends or a class
              </h3>
              <p className="mt-2 leading-7 text-quran-muted">
                Participants choose based on capacity while the organizer
                watches what remains before the deadline.
              </p>
            </article>
            <article className="quran-card p-6">
              <BookOpenCheck className="h-6 w-6 text-quran-green" />
              <h3 className="font-heading mt-4 text-2xl text-quran-deep">
                A masjid community
              </h3>
              <p className="mt-2 leading-7 text-quran-muted">
                A public or link-only circle gives a larger audience one
                current view without distributing an assignment sheet.
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
                Copy-ready starting point
              </p>
              <h2
                id="ramadan-invitation-title"
                className="font-heading mt-2 text-3xl text-quran-deep"
              >
                Ramadan group Khatm invitation
              </h2>
              <p className="mt-3 leading-7 text-quran-muted">
                Replace the brackets and send everyone to the same circle link.
              </p>
            </div>
            <blockquote className="rounded-3xl border border-quran-border/70 bg-white/75 p-6 text-sm leading-7 text-quran-muted">
              <p>
                Assalamu alaikum. We are organizing a Ramadan group Quran Khatm
                for [intention]. Please choose any available Juz using this
                link: [circle link]
              </p>
              <p className="mt-4">
                Kindly claim by [claim deadline] and finish reading by
                [completion deadline]. If your plans change, please unclaim
                early so another reader can take the portion. May Allah accept
                it from us all.
              </p>
            </blockquote>
          </div>
        </section>

        <section className="mt-14" aria-labelledby="ramadan-faq-title">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-quran-gold">
            Ramadan organizer FAQ
          </p>
          <h2
            id="ramadan-faq-title"
            className="font-heading mt-2 text-3xl text-quran-deep sm:text-4xl"
          >
            Common questions about Ramadan group Khatms
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
          aria-label="Related Khatm resources"
        >
          <Link
            href="/khatm-coordination"
            className="quran-card-interactive group p-6"
          >
            <span className="text-xs font-semibold uppercase tracking-[0.16em] text-quran-gold">
              Complete guide
            </span>
            <h2 className="font-heading mt-2 text-2xl text-quran-deep group-hover:text-quran-green">
              Organize any group Quran Khatm
            </h2>
            <p className="mt-2 leading-7 text-quran-muted">
              Review privacy, self-claiming, message templates, and the full
              coordination workflow.
            </p>
          </Link>
          <Link
            href="/group-khatm-whatsapp"
            className="quran-card-interactive group p-6"
          >
            <span className="text-xs font-semibold uppercase tracking-[0.16em] text-quran-gold">
              WhatsApp workflow
            </span>
            <h2 className="font-heading mt-2 text-2xl text-quran-deep group-hover:text-quran-green">
              Share the Khatm with your group chat
            </h2>
            <p className="mt-2 leading-7 text-quran-muted">
              Keep invitations and reminders in WhatsApp while the live circle
              tracks the 30 Juz.
            </p>
          </Link>
        </section>

        <section
          className="cta-section"
          aria-labelledby="ramadan-final-title"
        >
          <div className="relative z-10 mx-auto max-w-3xl">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-primary-foreground/65">
              A flexible plan for a meaningful month
            </p>
            <h2
              id="ramadan-final-title"
              className="font-heading mt-4 text-3xl sm:text-4xl md:text-5xl"
            >
              Begin with the circle your group can share
            </h2>
            <div className="cta-gold-divider" />
            <p className="mx-auto mt-5 max-w-2xl text-base leading-8 text-primary-foreground/75 sm:text-lg">
              Set the intention and deadline, then let readers claim according
              to their capacity.
            </p>
            <CreateCircleAction
              source="ramadan_final"
              size="lg"
              className="mt-8 h-13 w-full rounded-full border-2 border-white bg-white px-9 font-semibold text-quran-green hover:bg-white hover:text-quran-green sm:w-auto"
            >
              Create a Ramadan Khatm Circle
              <ArrowRight className="h-5 w-5" />
            </CreateCircleAction>
          </div>
        </section>
      </article>
    </main>
  );
}
