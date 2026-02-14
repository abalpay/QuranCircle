import { getPublicEvents } from "@/lib/actions/events";
import { Globe2 } from "lucide-react";
import BrowseEvents from "@/components/browse-events";

export default async function BrowsePage() {
  const events = await getPublicEvents();

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

      <BrowseEvents initialEvents={events} />
    </main>
  );
}
