import type { Metadata } from "next";
import { BookOpenCheck, HeartHandshake, Sparkles, UsersRound } from "lucide-react";
import AppPageHero from "@/components/app-page-hero";

export const metadata: Metadata = {
  title: "About QuranCircle",
  description:
    "Learn what QuranCircle is, who it is for, and how it helps families, masjids, and communities complete Quran Khatm together.",
  alternates: {
    canonical: "/about",
  },
  openGraph: {
    title: "About QuranCircle",
    description:
      "QuranCircle helps communities coordinate Quran recitation and complete Khatm together.",
    url: "/about",
  },
  twitter: {
    title: "About QuranCircle",
    description:
      "QuranCircle helps communities coordinate Quran recitation and complete Khatm together.",
  },
};

export default function AboutPage() {
  return (
    <main className="page-shell grow">
      <AppPageHero
        eyebrow="Built for shared recitation"
        title="About QuranCircle"
        description="A calm, lightweight place for families, friends, masjids, and communities to organize a complete Quran Khatm together."
        icon={BookOpenCheck}
      >
        <div className="app-hero-ledger">
          <Sparkles className="h-6 w-6 text-quran-gold" />
          <p className="mt-4 font-heading text-2xl leading-tight text-quran-deep">
            Less coordination. More space for recitation.
          </p>
          <p className="mt-3 text-sm leading-6 text-quran-muted">
            One link keeps every portion, reader, and completion status clear.
          </p>
        </div>
      </AppPageHero>

      <section className="app-content-grid" aria-label="About QuranCircle">
        <article className="app-info-card">
          <div className="app-info-card-icon">
            <UsersRound className="h-6 w-6" />
          </div>
          <h2 className="font-heading text-2xl text-quran-deep">Who It Helps</h2>
          <p className="mt-3 leading-7 text-quran-muted">
            Families, friends, masjid groups, and communities that want a simple,
            focused way to coordinate Quran recitation without unnecessary friction.
          </p>
        </article>

        <article className="app-info-card">
          <div className="app-info-card-icon">
            <HeartHandshake className="h-6 w-6" />
          </div>
          <h2 className="font-heading text-2xl text-quran-deep">How It Works</h2>
          <p className="mt-3 leading-7 text-quran-muted">
            Create a circle, share the short link, let participants claim their
            portion, and monitor progress in real time until completion.
          </p>
        </article>

        <article className="app-info-card">
          <div className="app-info-card-icon">
            <Sparkles className="h-6 w-6" />
          </div>
          <h2 className="font-heading text-2xl text-quran-deep">Principles</h2>
          <p className="mt-3 leading-7 text-quran-muted">
            QuranCircle is built around simplicity, accessibility, and reliable
            progress tracking so groups can stay focused on recitation.
          </p>
        </article>
      </section>
    </main>
  );
}
