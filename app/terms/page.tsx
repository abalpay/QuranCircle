import type { Metadata } from "next";

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
      <section className="quran-card-primary p-6 sm:p-10">
        <h1 className="font-heading text-4xl text-quran-deep sm:text-5xl">
          Terms of Use
        </h1>
        <p className="mt-4 max-w-3xl text-base leading-relaxed text-quran-muted sm:text-lg">
          By using QuranCircle, you agree to use the service responsibly and in a
          way that supports constructive community participation.
        </p>
      </section>

      <section className="section-panel mt-8 space-y-6">
        <div>
          <h2 className="font-heading text-2xl text-quran-deep">Acceptable Use</h2>
          <p className="mt-2 text-quran-muted">
            Do not misuse the platform, disrupt other participants, or publish
            harmful or abusive content.
          </p>
        </div>

        <div>
          <h2 className="font-heading text-2xl text-quran-deep">Account Responsibility</h2>
          <p className="mt-2 text-quran-muted">
            You are responsible for activity under your account and for sharing
            circle links appropriately.
          </p>
        </div>

        <div>
          <h2 className="font-heading text-2xl text-quran-deep">Service Availability</h2>
          <p className="mt-2 text-quran-muted">
            QuranCircle is continuously improved, and features may change over
            time. We aim to keep the service reliable and secure.
          </p>
        </div>
      </section>
    </main>
  );
}
