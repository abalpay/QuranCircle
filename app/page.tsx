import Link from "next/link";
import { Button } from "@/components/ui/button";
import {
  Share2,
  CheckCircle2,
  Compass,
  HandHeart,
} from "lucide-react";
import UserDashboard from "@/components/home-content";
import HeroActions from "@/components/hero-actions";
import FeaturedCircles from "@/components/featured-circles";
import HomeInstallPrompt from "@/components/home-install-prompt";
import { getCommunityStats } from "@/lib/actions/stats";
import { getPublicEvents } from "@/lib/actions/events";

const steps = [
  {
    title: "Set Your Circle",
    description:
      "Name your Khatm, choose link-only or public, and share in seconds.",
    icon: Share2,
  },
  {
    title: "Claim A Juz",
    description:
      "Participants choose their portion by name with no account friction.",
    icon: HandHeart,
  },
  {
    title: "Track Completion",
    description:
      "Progress is updated live so everyone can see what remains.",
    icon: CheckCircle2,
  },
];

export default async function HomePage() {
  const [stats, publicEvents] = await Promise.all([
    getCommunityStats(),
    getPublicEvents(),
  ]);

  const featuredEvents = publicEvents.slice(0, 3);

  return (
    <main className="page-shell grow">
      {/* ── Hero Section ── */}
      <section className="hero-pattern relative flex flex-col items-center justify-center py-20 text-center sm:py-28 lg:py-36">
        <HomeInstallPrompt />

        <p className="bismillah-decoration mb-6 animate-fade-rise">
          بِسْمِ ٱللَّهِ ٱلرَّحْمَـٰنِ ٱلرَّحِيمِ
        </p>

        <h1 className="font-heading max-w-4xl animate-fade-rise text-4xl leading-[1.1] text-quran-deep [animation-delay:100ms] sm:text-5xl md:text-6xl lg:text-7xl">
          Complete the Quran
          <br />
          <span className="hero-gradient-text">together.</span>
        </h1>

        <p className="mt-6 max-w-2xl animate-fade-rise text-base leading-relaxed text-quran-muted [animation-delay:200ms] sm:text-lg md:text-xl">
          QuranCircle helps families, masjids, and groups coordinate meaningful
          recitation. Create a circle, let people claim their portion, and
          finish your collective Khatm with clarity.
        </p>

        <div className="w-full max-w-md animate-fade-rise px-2 [animation-delay:300ms] sm:w-auto sm:max-w-none sm:px-0">
          <HeroActions />
        </div>

        <div className="hero-divider" />
      </section>

      {/* ── Community Stats Bar ── */}
      <div className="stats-bar animate-fade-rise [animation-delay:400ms]">
        <div className="grid grid-cols-3 gap-4">
          <div className="stats-bar-item">
            <span className="stats-value">{stats.totalCircles}</span>
            <span className="stats-label">Circles</span>
          </div>
          <div className="stats-bar-item border-x border-quran-border/30 px-4">
            <span className="stats-value">{stats.totalJuzClaimed}</span>
            <span className="stats-label">Juz Claimed</span>
          </div>
          <div className="stats-bar-item">
            <span className="stats-value">{stats.activeKhatms}</span>
            <span className="stats-label">Khatms</span>
          </div>
        </div>
      </div>

      {/* ── User Dashboard (only if logged in) ── */}
      <UserDashboard />

      {/* ── How It Works — Vertical Timeline ── */}
      <section className="section-panel mt-24">
        <div className="mb-10 text-center">
          <h2 className="font-heading text-3xl text-quran-deep sm:text-4xl">
            How It Works
          </h2>
          <p className="mt-3 text-quran-muted">
            Simple, focused, and designed for spiritual collaboration.
          </p>
        </div>

        {/* Mobile: vertical timeline / Desktop: 3-column grid */}
        <div className="flex flex-col gap-10 md:hidden">
          {steps.map((step, index) => (
            <div
              key={step.title}
              className="how-it-works-step animate-fade-rise"
              style={{
                animationDelay: `${index * 100 + 400}ms`,
                animationFillMode: "both",
              }}
            >
              {/* Connector line (not on last item) */}
              {index < steps.length - 1 && <div className="step-connector" />}

              <div className="step-number-circle">{index + 1}</div>

              <div className="flex-1 pb-2">
                <h3 className="font-heading text-xl text-quran-deep">
                  {step.title}
                </h3>
                <p className="mt-2 text-sm leading-relaxed text-quran-muted">
                  {step.description}
                </p>
              </div>
            </div>
          ))}
        </div>

        {/* Desktop: card grid */}
        <div className="hidden gap-6 md:grid md:grid-cols-3">
          {steps.map((step, index) => (
            <div
              key={step.title}
              className="quran-card animate-fade-rise p-6 sm:p-8"
              style={{
                animationDelay: `${index * 100 + 400}ms`,
                animationFillMode: "both",
              }}
            >
              <div className="mb-5 inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-quran-green/10 text-quran-green">
                <step.icon className="h-6 w-6" />
              </div>
              <h3 className="font-heading text-2xl text-quran-deep">
                {step.title}
              </h3>
              <p className="mt-3 text-base leading-relaxed text-quran-muted">
                {step.description}
              </p>
            </div>
          ))}
        </div>
      </section>

      {/* ── Featured Public Circles ── */}
      {featuredEvents.length > 0 && (
        <section className="mt-24">
          <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
            <div>
              <h2 className="font-heading text-3xl text-quran-deep sm:text-4xl">
                Active Circles
              </h2>
              <p className="mt-2 text-quran-muted">
                Join an ongoing Khatm and contribute today.
              </p>
            </div>
            <Button
              asChild
              variant="outline"
              className="rounded-full border-quran-border bg-white/60 px-6 hover:bg-white/90"
            >
              <Link href="/browse">
                <Compass className="mr-2 h-4 w-4" />
                View All
              </Link>
            </Button>
          </div>

          <FeaturedCircles events={featuredEvents} />
        </section>
      )}

      {/* ── CTA Section ── */}
      <section className="cta-section">
        <div className="relative z-10 mx-auto max-w-2xl">
          <p className="mb-6 inline-flex items-center gap-2.5 rounded-full border border-white/15 bg-white/[0.07] px-4 py-1.5 text-[0.7rem] font-semibold uppercase tracking-[0.2em] text-primary-foreground/70 backdrop-blur-sm">
            <span className="inline-block h-1.5 w-1.5 rounded-full bg-[hsl(var(--quran-gold))]" />
            Open to Everyone
          </p>

          <h3 className="font-heading text-3xl sm:text-4xl md:text-5xl lg:text-[3.5rem]">
            Join a public circle today
          </h3>

          <div className="cta-gold-divider" />

          <p className="mx-auto mt-5 max-w-lg text-base leading-relaxed text-primary-foreground/70 sm:text-lg">
            Pick a Juz, join fellow readers, and help complete the Quran
            together.
          </p>

          <div className="mt-10">
            <Button
              asChild
              size="lg"
              className="group h-14 w-full rounded-full border-2 border-white bg-white px-10 text-base font-semibold text-quran-green shadow-[0_16px_40px_-16px_hsl(0_0%_0%/0.3)] transition-all hover:bg-white hover:text-quran-green hover:scale-105 hover:shadow-[0_20px_50px_-16px_hsl(0_0%_0%/0.4)] active:scale-95 sm:w-auto"
            >
              <Link href="/browse">
                <Compass className="mr-2 h-5 w-5 transition-transform group-hover:rotate-45" />
                Browse Public Circles
              </Link>
            </Button>
          </div>
        </div>
      </section>
    </main>
  );
}
