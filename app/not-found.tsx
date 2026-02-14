import Link from "next/link";
import { Button } from "@/components/ui/button";

export default function NotFound() {
  return (
    <main className="page-shell grow flex items-center justify-center">
      <section className="quran-card-info mx-auto max-w-xl p-10 text-center shadow-lg">
        <div className="mb-6 flex justify-center">
          <span className="inline-flex h-20 w-20 items-center justify-center rounded-3xl bg-quran-green/10 text-3xl font-bold text-quran-green">
            ?
          </span>
        </div>
        <h1 className="font-heading text-4xl text-quran-deep sm:text-5xl">
          Page Not Found
        </h1>
        <p className="mt-4 text-base leading-relaxed text-quran-muted sm:text-lg">
          We couldn't find the circle you're looking for. It may have been completed or moved.
        </p>
        <Button asChild className="mt-8 h-12 rounded-full px-8 text-base">
          <Link href="/">Return Home</Link>
        </Button>
      </section>
    </main>
  );
}
