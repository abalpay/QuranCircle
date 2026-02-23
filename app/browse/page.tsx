import type { Metadata } from "next";
import { getPublicEventsPage } from "@/lib/actions/events";
import { Globe2 } from "lucide-react";
import BrowseEvents from "@/components/browse-events";

const INITIAL_PUBLIC_CIRCLES_LIMIT = 12;

const browseDescription =
  "Discover active public Quran Khatm circles, join a group, and claim your Juz to contribute to completion together.";

export const metadata: Metadata = {
  title: "Browse Community Khatms",
  description: browseDescription,
  alternates: {
    canonical: "/browse",
  },
  openGraph: {
    title: "Browse Community Khatms - QuranCircle",
    description: browseDescription,
    url: "/browse",
  },
  twitter: {
    title: "Browse Community Khatms - QuranCircle",
    description: browseDescription,
  },
};

export default async function BrowsePage() {
  const initialPage = await getPublicEventsPage({
    limit: INITIAL_PUBLIC_CIRCLES_LIMIT,
  });

  return (
    <main className="page-shell grow">
      <section className="quran-card-primary mb-8 p-6 sm:p-10 text-center sm:text-left">
        <div className="flex flex-col items-center sm:items-start">
          <span className="quran-badge mb-4">
            <Globe2 className="mr-2 h-3.5 w-3.5" />
            Public Circles
          </span>
          <h1 className="font-heading text-4xl text-quran-deep sm:text-5xl">
            Browse Community Khatms
          </h1>
          <p className="mt-3 max-w-2xl text-base leading-relaxed text-quran-muted sm:text-lg">
            Join active Quran reading circles and contribute your Juz. No account
            is required to claim and begin reciting.
          </p>
        </div>
      </section>

      <BrowseEvents initialPage={initialPage} />
    </main>
  );
}
