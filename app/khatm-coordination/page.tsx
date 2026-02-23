import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Khatm Coordination Guide",
  description:
    "A practical guide to organizing Quran Khatm coordination for families, masjids, and community groups.",
  alternates: {
    canonical: "/khatm-coordination",
  },
  openGraph: {
    title: "Khatm Coordination Guide - QuranCircle",
    description:
      "Learn a practical process to plan, launch, and complete a coordinated Quran Khatm.",
    url: "/khatm-coordination",
  },
  twitter: {
    title: "Khatm Coordination Guide - QuranCircle",
    description:
      "Learn a practical process to plan, launch, and complete a coordinated Quran Khatm.",
  },
};

export default function KhatmCoordinationPage() {
  return (
    <main className="page-shell grow">
      <section className="quran-card-primary p-6 sm:p-10">
        <h1 className="font-heading text-4xl text-quran-deep sm:text-5xl">
          Khatm Coordination Guide
        </h1>
        <p className="mt-4 max-w-3xl text-base leading-relaxed text-quran-muted sm:text-lg">
          Use this framework to organize a complete Quran Khatm with clear roles,
          clean communication, and steady completion tracking.
        </p>
      </section>

      <section className="section-panel mt-8 space-y-6">
        <div>
          <h2 className="font-heading text-2xl text-quran-deep">1. Define the Circle</h2>
          <p className="mt-2 text-quran-muted">
            Set the goal, audience, and timeline first. Decide if the circle is
            private (invite-only) or public (discoverable).
          </p>
        </div>

        <div>
          <h2 className="font-heading text-2xl text-quran-deep">2. Share a Clear Invitation</h2>
          <p className="mt-2 text-quran-muted">
            Share one link with a short message that explains expectations,
            deadline, and who to contact for updates.
          </p>
        </div>

        <div>
          <h2 className="font-heading text-2xl text-quran-deep">3. Assign Juz Early</h2>
          <p className="mt-2 text-quran-muted">
            Encourage participants to claim quickly so you can spot unassigned
            portions and follow up before deadlines approach.
          </p>
        </div>

        <div>
          <h2 className="font-heading text-2xl text-quran-deep">4. Review Progress Daily</h2>
          <p className="mt-2 text-quran-muted">
            Keep momentum by checking completion status each day and sending short,
            positive reminders when portions remain open.
          </p>
        </div>

        <div>
          <h2 className="font-heading text-2xl text-quran-deep">5. Close and Relaunch</h2>
          <p className="mt-2 text-quran-muted">
            Once complete, acknowledge contributors and launch the next cycle while
            engagement is still high.
          </p>
        </div>
      </section>
    </main>
  );
}
