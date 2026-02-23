import type { Metadata } from "next";
import Link from "next/link";

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
      <section className="quran-card-primary p-6 sm:p-10">
        <h1 className="font-heading text-4xl text-quran-deep sm:text-5xl">
          Contact
        </h1>
        <p className="mt-4 max-w-3xl text-base leading-relaxed text-quran-muted sm:text-lg">
          For product feedback, bug reports, or project questions, use the
          channels below.
        </p>
      </section>

      <section className="section-panel mt-8 space-y-5">
        <div className="quran-card-info">
          <h2 className="font-heading text-2xl text-quran-deep">GitHub Issues</h2>
          <p className="mt-2 text-quran-muted">
            Submit feature requests and bug reports through the public issue tracker.
          </p>
          <Link
            href="https://github.com/abalpay/QuranCircle/issues"
            className="mt-4 inline-flex text-sm font-semibold text-quran-green hover:underline"
            target="_blank"
            rel="noreferrer"
          >
            Open issue tracker
          </Link>
        </div>

        <div className="quran-card-info">
          <h2 className="font-heading text-2xl text-quran-deep">Response Expectations</h2>
          <p className="mt-2 text-quran-muted">
            Requests are reviewed as quickly as possible, with priority given to
            reliability, data integrity, and user-impacting bugs.
          </p>
        </div>
      </section>
    </main>
  );
}
