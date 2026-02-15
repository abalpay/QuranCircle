"use client";

import { useEffect } from "react";
import { Button } from "@/components/ui/button";

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("Unhandled error:", error);
  }, [error]);

  return (
    <main className="page-shell grow flex items-center justify-center">
      <section className="quran-card-info mx-auto max-w-xl p-10 text-center shadow-lg">
        <div className="mb-6 flex justify-center">
          <span className="inline-flex h-20 w-20 items-center justify-center rounded-3xl bg-red-100 text-3xl font-bold text-red-600">
            !
          </span>
        </div>
        <h1 className="font-heading text-4xl text-quran-deep sm:text-5xl">
          Something Went Wrong
        </h1>
        <p className="mt-4 text-base leading-relaxed text-quran-muted sm:text-lg">
          An unexpected error occurred. Please try again.
        </p>
        <Button
          onClick={reset}
          className="mt-8 h-12 rounded-full px-8 text-base"
        >
          Try Again
        </Button>
      </section>
    </main>
  );
}
