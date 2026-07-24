"use client";

import { useEffect } from "react";
import { Button } from "@/components/ui/button";
import { RotateCcw, TriangleAlert } from "lucide-react";
import { useTranslations } from "next-intl";

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const t = useTranslations("ErrorPage");

  useEffect(() => {
    console.error("Unhandled error:", error);
  }, [error]);

  return (
    <main className="page-shell flex grow items-center justify-center">
      <section className="app-state-card">
        <div className="mb-6 flex justify-center">
          <span className="inline-flex h-16 w-16 items-center justify-center rounded-[1.2rem] border border-red-200 bg-red-50 text-red-600">
            <TriangleAlert className="h-7 w-7" />
          </span>
        </div>
        <p className="text-xs font-bold uppercase tracking-[0.2em] text-quran-gold">
          {t("eyebrow")}
        </p>
        <h1 className="mt-3 font-heading text-5xl leading-none text-quran-deep sm:text-6xl">
          {t("title")}
        </h1>
        <p className="mx-auto mt-5 max-w-md text-base leading-7 text-quran-muted sm:text-lg">
          {t("description")}
        </p>
        <Button
          onClick={reset}
          className="mt-8 rounded-full px-8 text-base"
        >
          <RotateCcw className="h-4 w-4" />
          {t("tryAgain")}
        </Button>
      </section>
    </main>
  );
}
