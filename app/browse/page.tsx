import type { Metadata } from "next";
import { getPublicEventsPage } from "@/lib/actions/events";
import { Globe2 } from "lucide-react";
import BrowseEvents from "@/components/browse-events";
import AppPageHero from "@/components/app-page-hero";

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
      <AppPageHero
        eyebrow="Open to everyone"
        title="Browse Community Khatms"
        description="Join an active Quran reading circle and contribute your Juz. No account is required to claim a portion and begin reciting."
        icon={Globe2}
      >
        <div className="app-hero-ledger browse-hero-ledger">
          <p className="text-[0.65rem] font-bold uppercase tracking-[0.2em] text-quran-gold">
            One shared reading
          </p>
          <div className="app-hero-ledger-value">
            <strong>30</strong>
            <span>Juz</span>
          </div>
          <p className="mt-4 text-sm leading-6 text-quran-muted">
            Choose an available portion, add your name, and follow the circle&apos;s
            progress together.
          </p>
        </div>
      </AppPageHero>

      <div className="mt-8">
        <BrowseEvents initialPage={initialPage} />
      </div>
    </main>
  );
}
