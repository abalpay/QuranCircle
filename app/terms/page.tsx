import type { Metadata } from "next";
import { ScrollText } from "lucide-react";
import AppPageHero from "@/components/app-page-hero";

export const metadata: Metadata = {
  title: "Terms of Use",
  description:
    "Review QuranCircle terms of use for acceptable usage, account responsibilities, and service expectations.",
  alternates: {
    canonical: "/terms",
  },
  openGraph: {
    title: "Terms of Use - QuranCircle",
    description:
      "Usage terms for QuranCircle, including account and content responsibilities.",
    url: "/terms",
  },
  twitter: {
    title: "Terms of Use - QuranCircle",
    description:
      "Usage terms for QuranCircle, including account and content responsibilities.",
  },
};

export default function TermsPage() {
  return (
    <main className="page-shell grow">
      <AppPageHero
        eyebrow="A respectful shared space"
        title="Terms of Use"
        description="By using QuranCircle, you agree to use the service responsibly and support constructive community participation."
        icon={ScrollText}
        compact
      />

      <div className="app-prose-layout">
        <aside className="app-prose-rail">
          <p className="text-xs font-bold uppercase tracking-[0.18em] text-quran-gold">
            Shared responsibility
          </p>
          <p className="mt-3 text-sm leading-6 text-quran-muted">
            Keep circles respectful, protect shared links, and use the service for
            its intended purpose.
          </p>
        </aside>

        <article className="app-prose-panel">
          <section className="app-prose-section">
            <span className="app-prose-number">01</span>
            <div>
              <h2 className="font-heading text-3xl text-quran-deep">Acceptable Use</h2>
              <p className="mt-3 max-w-3xl leading-7 text-quran-muted">
                Do not misuse the platform, disrupt other participants, or publish
                harmful or abusive content.
              </p>
            </div>
          </section>

          <section className="app-prose-section">
            <span className="app-prose-number">02</span>
            <div>
              <h2 className="font-heading text-3xl text-quran-deep">Account Responsibility</h2>
              <p className="mt-3 max-w-3xl leading-7 text-quran-muted">
                You are responsible for activity under your account and for sharing
                circle links appropriately.
              </p>
            </div>
          </section>

          <section className="app-prose-section">
            <span className="app-prose-number">03</span>
            <div>
              <h2 className="font-heading text-3xl text-quran-deep">Service Availability</h2>
              <p className="mt-3 max-w-3xl leading-7 text-quran-muted">
                QuranCircle is continuously improved, and features may change over
                time. We aim to keep the service reliable and secure.
              </p>
            </div>
          </section>
        </article>
      </div>
    </main>
  );
}
