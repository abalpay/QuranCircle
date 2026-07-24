import type { Metadata } from "next";
import { ShieldCheck } from "lucide-react";
import AppPageHero from "@/components/app-page-hero";

export const metadata: Metadata = {
  title: "Privacy Policy",
  description:
    "Read QuranCircle's privacy policy, including what data is collected and how account and circle information is used.",
  alternates: {
    canonical: "/privacy",
  },
  openGraph: {
    title: "Privacy Policy - QuranCircle",
    description:
      "How QuranCircle handles user data, authentication, and circle participation details.",
    url: "/privacy",
  },
  twitter: {
    title: "Privacy Policy - QuranCircle",
    description:
      "How QuranCircle handles user data, authentication, and circle participation details.",
  },
};

export default function PrivacyPage() {
  return (
    <main className="page-shell grow">
      <AppPageHero
        eyebrow="Clear by design"
        title="Privacy Policy"
        description="QuranCircle is designed to collect only the information needed to operate collaborative Quran reading circles."
        icon={ShieldCheck}
        compact
      />

      <div className="app-prose-layout">
        <aside className="app-prose-rail">
          <p className="text-xs font-bold uppercase tracking-[0.18em] text-quran-gold">
            In plain language
          </p>
          <p className="mt-3 text-sm leading-6 text-quran-muted">
            Your data supports authentication, circle participation, and progress
            tracking. It is not the purpose of the product.
          </p>
        </aside>

        <article className="app-prose-panel">
          <section className="app-prose-section">
            <span className="app-prose-number">01</span>
            <div>
              <h2 className="font-heading text-3xl text-quran-deep">Information Collected</h2>
              <p className="mt-3 max-w-3xl leading-7 text-quran-muted">
                We store account details required for authentication and the circle data
                needed to track Khatm progress, including circle names, optional
                descriptions, and participant claims.
              </p>
            </div>
          </section>

          <section className="app-prose-section">
            <span className="app-prose-number">02</span>
            <div>
              <h2 className="font-heading text-3xl text-quran-deep">How Data Is Used</h2>
              <p className="mt-3 max-w-3xl leading-7 text-quran-muted">
                Data is used to provide core product functionality: creating circles,
                joining circles, assigning portions, and showing completion progress.
              </p>
            </div>
          </section>

          <section className="app-prose-section">
            <span className="app-prose-number">03</span>
            <div>
              <h2 className="font-heading text-3xl text-quran-deep">Data Access and Deletion</h2>
              <p className="mt-3 max-w-3xl leading-7 text-quran-muted">
                If you need account-related assistance, contact the project maintainers
                through the official contact page.
              </p>
            </div>
          </section>
        </article>
      </div>
    </main>
  );
}
