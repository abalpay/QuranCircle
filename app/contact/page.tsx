import type { Metadata } from "next";
import Link from "next/link";
import { ArrowUpRight, Clock3, Github, MessageCircleMore } from "lucide-react";
import AppPageHero from "@/components/app-page-hero";

export const metadata: Metadata = {
  title: "Contact",
  description:
    "Contact QuranCircle maintainers for feedback, bug reports, and project questions.",
  alternates: {
    canonical: "/contact",
  },
  openGraph: {
    title: "Contact QuranCircle",
    description:
      "Reach QuranCircle maintainers for feedback, bug reports, and support.",
    url: "/contact",
  },
  twitter: {
    title: "Contact QuranCircle",
    description:
      "Reach QuranCircle maintainers for feedback, bug reports, and support.",
  },
};

export default function ContactPage() {
  return (
    <main className="page-shell grow">
      <AppPageHero
        eyebrow="Talk to the maintainers"
        title="Contact"
        description="Share product feedback, report a problem, or ask a project question through the public support channel."
        icon={MessageCircleMore}
      >
        <div className="app-hero-ledger">
          <p className="text-[0.65rem] font-bold uppercase tracking-[0.2em] text-quran-gold">
            Best place to start
          </p>
          <p className="mt-3 font-heading text-3xl text-quran-deep">GitHub Issues</p>
          <p className="mt-2 text-sm leading-6 text-quran-muted">
            Public, searchable, and easy for the community to follow.
          </p>
        </div>
      </AppPageHero>

      <section className="mt-8 grid gap-5 md:grid-cols-2" aria-label="Contact options">
        <article className="app-info-card">
          <div className="app-info-card-icon">
            <Github className="h-6 w-6" />
          </div>
          <h2 className="font-heading text-3xl text-quran-deep">Open an issue</h2>
          <p className="mt-3 leading-7 text-quran-muted">
            Submit feature requests and bug reports through the public issue tracker.
          </p>
          <Link
            href="https://github.com/abalpay/QuranCircle/issues"
            className="mt-6 inline-flex min-h-11 items-center gap-2 rounded-full border border-quran-border bg-white/75 px-5 text-sm font-semibold text-quran-green transition-colors hover:border-quran-green/40 hover:bg-white"
            target="_blank"
            rel="noreferrer"
          >
            Open issue tracker
            <ArrowUpRight className="h-4 w-4" />
          </Link>
        </article>

        <article className="app-info-card">
          <div className="app-info-card-icon">
            <Clock3 className="h-6 w-6" />
          </div>
          <h2 className="font-heading text-3xl text-quran-deep">What to expect</h2>
          <p className="mt-3 leading-7 text-quran-muted">
            Requests are reviewed as quickly as possible, with priority given to
            reliability, data integrity, and user-impacting bugs.
          </p>
          <div className="mt-6 border-t border-quran-border/55 pt-5 text-sm leading-6 text-quran-muted">
            Include the page, device, and steps to reproduce a problem when possible.
          </div>
        </article>
      </section>
    </main>
  );
}
