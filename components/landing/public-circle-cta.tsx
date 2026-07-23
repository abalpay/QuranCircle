import { Compass, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import AnalyticsLink from "@/components/analytics-link";
import {
  GeometricRosette,
  MosqueSkyline,
} from "@/components/landing/decorative-art";

export default function PublicCircleCta() {
  return (
    <section
      className="landing-final-cta"
      aria-labelledby="public-circle-cta-title"
    >
      <MosqueSkyline className="landing-cta-mosque" />
      <GeometricRosette className="landing-cta-rosette" />

      <div className="landing-final-cta-copy">
        <p className="landing-cta-badge">
          <Sparkles aria-hidden="true" />
          Open to everyone
        </p>
        <h2 id="public-circle-cta-title">Join a public circle today</h2>
        <p>
          Pick a Juz, join fellow readers, and help complete the Qur’an
          together.
        </p>
        <Button asChild size="lg" className="landing-final-cta-button">
          <AnalyticsLink
            href="/browse"
            analyticsAction="browse_circles"
            analyticsSource="home_browse"
          >
            <Compass aria-hidden="true" />
            Browse Public Circles
          </AnalyticsLink>
        </Button>
      </div>
    </section>
  );
}
