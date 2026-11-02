import { Compass } from "lucide-react";
import { Button } from "@/components/ui/button";
import AnalyticsLink from "@/components/analytics-link";
import { getTranslations } from "next-intl/server";

export default async function PublicCircleCta() {
  const t = await getTranslations("PublicCircleCta");
  return (
    <section
      className="landing-final-cta"
      aria-labelledby="public-circle-cta-title"
    >
      <div className="landing-final-cta-copy">
        <p className="landing-cta-badge">
          {t("eyebrow")}
        </p>
        <h2 id="public-circle-cta-title">{t("title")}</h2>
        <p>{t("description")}</p>
        <Button asChild size="lg" className="landing-final-cta-button">
          <AnalyticsLink
            href="/browse"
            analyticsAction="browse_circles"
            analyticsSource="home_browse"
          >
            <Compass aria-hidden="true" />
            {t("button")}
          </AnalyticsLink>
        </Button>
      </div>
    </section>
  );
}
