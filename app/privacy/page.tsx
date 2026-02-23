import type { Metadata } from "next";

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
      <section className="quran-card-primary p-6 sm:p-10">
        <h1 className="font-heading text-4xl text-quran-deep sm:text-5xl">
          Privacy Policy
        </h1>
        <p className="mt-4 max-w-3xl text-base leading-relaxed text-quran-muted sm:text-lg">
          QuranCircle is designed to collect only the data needed to operate
          collaborative Quran reading circles.
        </p>
      </section>

      <section className="section-panel mt-8 space-y-6">
        <div>
          <h2 className="font-heading text-2xl text-quran-deep">Information Collected</h2>
          <p className="mt-2 text-quran-muted">
            We store account details required for authentication and the circle data
            needed to track Khatm progress, including circle names, optional
            descriptions, and participant claims.
          </p>
        </div>

        <div>
          <h2 className="font-heading text-2xl text-quran-deep">How Data Is Used</h2>
          <p className="mt-2 text-quran-muted">
            Data is used to provide core product functionality: creating circles,
            joining circles, assigning portions, and showing completion progress.
          </p>
        </div>

        <div>
          <h2 className="font-heading text-2xl text-quran-deep">Data Access and Deletion</h2>
          <p className="mt-2 text-quran-muted">
            If you need account-related assistance, contact the project maintainers
            through the official contact page.
          </p>
        </div>
      </section>
    </main>
  );
}
