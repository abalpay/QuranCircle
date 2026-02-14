import Link from "next/link";
import { Button } from "@/components/ui/button";
import {
  Share2,
  CheckCircle2,
  Compass,
  Sparkles,
  HandHeart,
} from "lucide-react";
import UserDashboard from "@/components/home-content";
import HeroActions from "@/components/hero-actions";

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

export default function HomePage() {
  return (
    <main className="page-shell grow">
      {/* Hero Section */}
      <section className="hero-pattern relative flex flex-col items-center justify-center py-16 text-center sm:py-24">
        <span className="quran-badge mb-6 animate-fade-rise">
          <Sparkles className="mr-2 h-3.5 w-3.5" />
          Community Khatm Platform
        </span>
        <h1 className="font-heading max-w-4xl text-5xl leading-tight text-quran-deep animate-fade-rise [animation-delay:100ms] sm:text-6xl md:text-7xl">
          Complete the Quran together, <br className="hidden sm:block" />
          <span className="text-quran-green">one Juz at a time.</span>
        </h1>
        <p className="mt-6 max-w-2xl text-lg leading-relaxed text-quran-muted animate-fade-rise [animation-delay:200ms] sm:text-xl">
          QuranCircle helps families, masjids, and groups coordinate meaningful
          recitation. Create a circle, let people claim their portion, and
          finish your collective Khatm with clarity.
        </p>
        <div className="animate-fade-rise [animation-delay:300ms]">
          <HeroActions />
        </div>
      </section>

      {/* User Dashboard (Only visible if logged in) */}
      <UserDashboard />

      {/* Features / How It Works */}
      <section className="section-panel mt-24">
        <div className="mb-10 text-center">
          <h2 className="font-heading text-3xl text-quran-deep sm:text-4xl">
            How It Works
          </h2>
          <p className="mt-3 text-quran-muted">
            Simple, focused, and designed for spiritual collaboration.
          </p>
        </div>
        
        <div className="grid gap-6 md:grid-cols-3">
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

      {/* CTA Section */}
      <section className="mt-24 mb-12 rounded-[2.5rem] border border-quran-border bg-quran-green/94 px-6 py-16 text-center text-primary-foreground shadow-[0_32px_64px_-32px_var(--color-quran-deep)] sm:px-12 sm:py-20">
        <div className="mx-auto max-w-2xl">
          <h3 className="font-heading text-3xl sm:text-4xl md:text-5xl">
            Join a public circle today
          </h3>
          <p className="mt-4 text-lg text-primary-foreground/90 sm:text-xl">
            Explore active Khatms and contribute to an ongoing completion.
          </p>
          <div className="mt-8">
            <Button
              asChild
              size="lg"
              className="h-12 rounded-full border-2 border-white bg-white text-base font-semibold text-quran-green shadow-lg transition-transform hover:bg-white/90 hover:scale-105 active:scale-95"
            >
              <Link href="/browse">
                <Compass className="mr-2 h-5 w-5" />
                Browse Public Khatims
              </Link>
            </Button>
          </div>
        </div>
      </section>
    </main>
  );
}
