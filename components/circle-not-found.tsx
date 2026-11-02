import { Link } from "@/i18n/navigation";
import { Button } from "@/components/ui/button";
import CreateCircleAction from "@/components/create-circle-action";
import { useTranslations } from "next-intl";

export default function CircleNotFound() {
  const t = useTranslations("CircleNotFound");

  return (
    <main className="page-shell flex grow items-center justify-center">
      <section className="app-state-card">
        <h1 className="font-heading text-4xl leading-tight text-quran-deep sm:text-5xl">
          {t("title")}
        </h1>
        <p className="mx-auto mt-5 max-w-md text-base leading-7 text-quran-muted sm:text-lg">
          {t("description")}
        </p>
        <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
          <CreateCircleAction
            source="circle_not_found"
            className="rounded-full px-8 text-base"
          >
            {t("startKhatm")}
          </CreateCircleAction>
          <Button asChild variant="outline" className="rounded-full px-8 text-base">
            <Link href="/browse">{t("browseCircles")}</Link>
          </Button>
        </div>
      </section>
    </main>
  );
}
