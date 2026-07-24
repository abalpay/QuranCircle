import { Link } from "@/i18n/navigation";
import { Button } from "@/components/ui/button";
import { ArrowLeft, SearchX } from "lucide-react";
import { useTranslations } from "next-intl";

export default function NotFound() {
  const t = useTranslations("NotFoundPage");

  return (
    <main className="page-shell flex grow items-center justify-center">
      <section className="app-state-card">
        <div className="mb-6 flex justify-center">
          <span className="inline-flex h-16 w-16 items-center justify-center rounded-[1.2rem] border border-quran-border/60 bg-quran-green/[0.075] text-quran-green">
            <SearchX className="h-7 w-7" />
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
        <Button asChild className="mt-8 rounded-full px-8 text-base">
          <Link href="/">
            <ArrowLeft className="h-4 w-4" />
            {t("returnHome")}
          </Link>
        </Button>
      </section>
    </main>
  );
}
