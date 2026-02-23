import type { Metadata } from "next";

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
      <section className="quran-card-primary p-6 sm:p-10">
        <h1 className="font-heading text-4xl text-quran-deep sm:text-5xl">
          About QuranCircle
        </h1>
        <p className="mt-4 max-w-3xl text-base leading-relaxed text-quran-muted sm:text-lg">
          QuranCircle is a lightweight platform for organizing collaborative Quran
          reading circles. It helps groups track Juz assignments and completion
          progress so a full Khatm can be finished together with clarity.
        </p>
      </section>

      <section className="section-panel mt-8 space-y-6">
        <div>
          <h2 className="font-heading text-2xl text-quran-deep">Who It Helps</h2>
          <p className="mt-2 text-quran-muted">
            Families, friends, masjid groups, and communities that want a simple,
            focused way to coordinate Quran recitation without unnecessary friction.
          </p>
        </div>

        <div>
          <h2 className="font-heading text-2xl text-quran-deep">How It Works</h2>
          <p className="mt-2 text-quran-muted">
            Create a circle, share the short link, let participants claim their
            portion, and monitor progress in real time until completion.
          </p>
        </div>

        <div>
          <h2 className="font-heading text-2xl text-quran-deep">Principles</h2>
          <p className="mt-2 text-quran-muted">
            QuranCircle is built around simplicity, accessibility, and reliable
            progress tracking so groups can stay focused on recitation.
          </p>
        </div>
      </section>
    </main>
  );
}
