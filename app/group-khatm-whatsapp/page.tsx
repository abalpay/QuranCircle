import type { Metadata } from "next";
import Link from "next/link";
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

export const metadata: Metadata = {
  title: "Group Quran Khatm on WhatsApp",
  description:
    "Coordinate a group Quran Khatm on WhatsApp with one shared link where readers claim Juz, avoid duplicate assignments, and follow live completion.",
  keywords: [
    "group Quran Khatm WhatsApp",
    "Quran Khatm WhatsApp message",
    "Khatm invitation message",
    "shared Juz tracker",
    "group Khatam tracker",
  ],
  alternates: {
    canonical: "/group-khatm-whatsapp",
  },
  openGraph: {
    type: "article",
    title: "How to Organize a Group Quran Khatm on WhatsApp",
    description:
      "Keep conversation in WhatsApp and keep Juz claims in one live QuranCircle link.",
    url: "/group-khatm-whatsapp",
    images: [
      {
        url: "/opengraph-image",
        width: 1200,
        height: 630,
        alt: "A group Quran Khatm coordinated with one shared link",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Organize a Group Quran Khatm on WhatsApp",
    description:
      "A practical workflow for invitations, Juz claims, reminders, and live completion.",
    images: ["/opengraph-image"],
  },
};

const workflow = [
  {
    title: "Create one Khatm circle",
    text: "Set a recognizable name, a clear intention, and the date by which the group should finish.",
    icon: UsersRound,
  },
  {
    title: "Send the same link to everyone",
    text: "Put the QuranCircle link, claim deadline, and completion deadline in one concise WhatsApp message.",
    icon: Send,
  },
  {
    title: "Let readers choose an available Juz",
    text: "Participants open the link, enter their name, and claim for themselves without creating an account.",
    icon: Link2,
  },
  {
    title: "Use the circle for status",
    text: "Available, claimed, and read portions stay in the shared view instead of being reconstructed from chat replies.",
    icon: RefreshCw,
  },
  {
    title: "Use WhatsApp for encouragement",
    text: "Send a warm reminder before the deadline and a completion message when all 30 Juz are read.",
    icon: MessageCircleMore,
  },
];

const faqItems = [
  {
    question: "Can WhatsApp itself track a group Quran Khatm?",
    answer:
      "WhatsApp can carry invitations and reminders, but its message history is not a reliable live tracker. A shared QuranCircle link gives every participant the current list of available, claimed, and read Juz.",
  },
  {
    question: "Do participants need to leave the WhatsApp group?",
    answer:
      "No. The WhatsApp group remains useful for conversation and encouragement. Participants only open the shared circle link when they need to claim, check, unclaim, or mark a Juz read.",
  },
  {
    question: "Do participants need a QuranCircle account?",
    answer:
      "No. Readers can claim an available Juz by name without creating an account. The organizer signs in to create and manage the circle.",
  },
  {
    question: "What happens if someone cannot finish their Juz?",
    answer:
      "Ask them to unclaim the portion from the same shared link as early as possible. It becomes available again, so another reader can take it without the organizer rebuilding the list.",
  },
];

function safeJsonLd(value: unknown) {
  return JSON.stringify(value).replace(/</g, "\\u003c");
}

export default function GroupKhatmWhatsappPage() {
  const pageUrl = toAbsoluteUrl("/group-khatm-whatsapp");
  const structuredData = [
    {
      "@context": "https://schema.org",
      "@type": "Article",
      headline: "How to Organize a Group Quran Khatm on WhatsApp",
      description:
        "A practical workflow for coordinating group Quran Khatm invitations, Juz claims, reminders, and completion with WhatsApp and QuranCircle.",
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
          name: "Group Khatm on WhatsApp",
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
                <span>WhatsApp workflow</span>
              </nav>

              <span className="quran-badge">
                <MessageCircleMore className="mr-2 h-3.5 w-3.5" />
                Practical organizer resource
              </span>
              <h1 className="font-heading mt-5 max-w-4xl text-4xl leading-[1.05] text-quran-deep sm:text-5xl lg:text-[3.65rem]">
                How to organize a group Quran Khatm on WhatsApp
              </h1>
              <p className="mt-6 max-w-3xl text-base leading-8 text-quran-muted sm:text-lg">
                Keep WhatsApp for invitation, encouragement, and community.
                Keep Juz claims and completion in one shared QuranCircle link,
                so every reader sees the current state instead of an old
                checklist.
              </p>
              <div className="mt-8 flex flex-col gap-3 sm:flex-row">
                <CreateCircleAction
                  source="whatsapp_hero"
                  size="lg"
                  className="h-12 rounded-full px-7 text-primary-foreground"
                >
                  Create the Shared Circle
                  <ArrowRight className="h-5 w-5" />
                </CreateCircleAction>
                <Link
                  href="#messages"
                  className="inline-flex h-12 items-center justify-center gap-2 rounded-full border border-quran-border bg-white/75 px-7 text-sm font-semibold text-quran-deep transition-colors hover:bg-white"
                >
                  Copy the Message Templates
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
                  <span className="text-xs font-bold">Group Khatm</span>
                </div>
                <div className="mt-4 space-y-2">
                  <span className="block h-8 w-[82%] rounded-xl rounded-bl-sm bg-quran-green/10" />
                  <span className="ml-auto block h-10 w-[72%] rounded-xl rounded-br-sm bg-quran-gold/15" />
                  <span className="block h-6 w-[62%] rounded-xl rounded-bl-sm bg-quran-green/10" />
                </div>
                <span className="mt-auto flex h-9 items-center justify-center rounded-full bg-quran-green text-[0.62rem] font-bold text-white">
                  Open shared circle
                </span>
              </div>
            </div>
          </div>
        </header>

        <aside className="mt-8 rounded-3xl border border-quran-green/25 bg-quran-green/[0.06] p-6 sm:p-8">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-quran-gold">
            The short answer
          </p>
          <h2 className="font-heading mt-2 text-2xl text-quran-deep">
            Use one source of truth
          </h2>
          <p className="mt-3 max-w-4xl leading-8 text-quran-muted">
            Create a QuranCircle circle, share its link in WhatsApp, and ask
            each reader to claim and complete their Juz through that link.
            Conversation stays in the chat; assignment status stays in the
            live circle.
          </p>
        </aside>

        <section
          className="section-panel mt-10"
          aria-labelledby="whatsapp-comparison-title"
        >
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-quran-gold">
            Separate conversation from status
          </p>
          <h2
            id="whatsapp-comparison-title"
            className="font-heading mt-2 text-3xl text-quran-deep sm:text-4xl"
          >
            WhatsApp and QuranCircle have different jobs
          </h2>
          <div className="mt-8 grid gap-4 md:grid-cols-2">
            <article className="rounded-3xl border border-quran-border/70 bg-white/55 p-6">
              <MessageCircleMore className="h-6 w-6 text-quran-gold" />
              <h3 className="font-heading mt-4 text-2xl text-quran-deep">
                Use WhatsApp for
              </h3>
              <ul className="mt-5 space-y-3 text-quran-muted">
                {[
                  "The invitation and intention",
                  "Questions and encouragement",
                  "A reminder before the deadline",
                  "The final completion message",
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
                Use QuranCircle for
              </h3>
              <ul className="mt-5 space-y-3 text-quran-muted">
                {[
                  "The live list of all 30 Juz",
                  "Participant self-claiming",
                  "Preventing duplicate claims",
                  "Available, claimed, and read status",
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
            A reliable workflow
          </p>
          <h2
            id="whatsapp-workflow-title"
            className="font-heading mt-2 text-3xl text-quran-deep sm:text-4xl"
          >
            Coordinate the group Khatm in five steps
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
            Common failure points
          </p>
          <h2
            id="avoid-whatsapp-problems-title"
            className="font-heading mt-2 text-3xl text-quran-deep sm:text-4xl"
          >
            Keep these out of the chat checklist
          </h2>
          <div className="mt-7 grid gap-4 md:grid-cols-3">
            {[
              {
                title: "Duplicate claims",
                text: "Do not assign from replies in two different chat threads. Ask everyone to claim through the shared circle.",
              },
              {
                title: "Silent changes",
                text: "If someone cannot finish, have them unclaim in QuranCircle so the Juz is visibly available again.",
              },
              {
                title: "Stale reposts",
                text: "Avoid reposting an edited 30-line list. Share the same live link whenever someone asks what remains.",
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

        <section
          className="mt-14"
          aria-labelledby="whatsapp-faq-title"
        >
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-quran-gold">
            Organizer FAQ
          </p>
          <h2
            id="whatsapp-faq-title"
            className="font-heading mt-2 text-3xl text-quran-deep sm:text-4xl"
          >
            Questions about group Khatms on WhatsApp
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
              Plan the whole group Khatm
            </h2>
            <p className="mt-2 leading-7 text-quran-muted">
              Work through intention, visibility, participant access, progress,
              and completion.
            </p>
          </Link>
          <Link
            href="/ramadan-group-khatm"
            className="quran-card-interactive group p-6"
          >
            <span className="text-xs font-semibold uppercase tracking-[0.16em] text-quran-gold">
              Seasonal guide
            </span>
            <h2 className="font-heading mt-2 text-2xl text-quran-deep group-hover:text-quran-green">
              Adapt the workflow for Ramadan
            </h2>
            <p className="mt-2 leading-7 text-quran-muted">
              Build a flexible plan around one deadline rather than a required
              number of readers.
            </p>
          </Link>
        </section>

        <section
          className="cta-section"
          aria-labelledby="whatsapp-final-title"
        >
          <div className="relative z-10 mx-auto max-w-3xl">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-primary-foreground/65">
              One link for the whole group
            </p>
            <h2
              id="whatsapp-final-title"
              className="font-heading mt-4 text-3xl sm:text-4xl md:text-5xl"
            >
              Let WhatsApp carry the invitation, not the spreadsheet
            </h2>
            <div className="cta-gold-divider" />
            <p className="mx-auto mt-5 max-w-2xl text-base leading-8 text-primary-foreground/75 sm:text-lg">
              Create the circle once, share it with the group, and let the live
              view show everyone what remains.
            </p>
            <CreateCircleAction
              source="whatsapp_final"
              size="lg"
              className="mt-8 h-13 w-full rounded-full border-2 border-white bg-white px-9 font-semibold text-quran-green hover:bg-white hover:text-quran-green sm:w-auto"
            >
              Create Your Khatm Circle
              <ArrowRight className="h-5 w-5" />
            </CreateCircleAction>
          </div>
        </section>
      </article>
    </main>
  );
}
