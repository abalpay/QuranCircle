import { Check, ExternalLink, X } from "lucide-react";
import AnalyticsLink from "@/components/analytics-link";
import {
  DocumentLineArt,
  MosqueSkyline,
} from "@/components/landing/decorative-art";

type ComparisonCopy = {
  eyebrow: string;
  title: string;
  description: string;
  oldWayTitle: string;
  oldWayPoints: string[];
  quranCircleWayTitle: string;
  quranCircleWayPoints: string[];
  explanation: string;
  guideLink: string;
};

type ComparisonSectionProps = {
  copy: ComparisonCopy;
};

export default function ComparisonSection({ copy }: ComparisonSectionProps) {
  return (
    <section
      className="landing-section landing-comparison"
      aria-labelledby="comparison-title"
    >
      <div className="landing-comparison-top">
        <div className="landing-comparison-intro">
          <p className="landing-eyebrow">{copy.eyebrow}</p>
          <h2 id="comparison-title">{copy.title}</h2>
          <p>{copy.description}</p>
        </div>

        <div className="landing-comparison-cards">
          <article className="landing-comparison-card is-usual">
            <DocumentLineArt className="comparison-card-art" />
            <h3>{copy.oldWayTitle}</h3>
            <ul>
              {copy.oldWayPoints.map((point) => (
                <li key={point}>
                  <span className="comparison-point-icon is-negative">
                    <X aria-hidden="true" />
                  </span>
                  {point}
                </li>
              ))}
            </ul>
          </article>

          <span className="comparison-vs" aria-hidden="true">
            VS
          </span>

          <article className="landing-comparison-card is-qurancircle">
            <MosqueSkyline className="comparison-card-art is-mosque" />
            <h3>{copy.quranCircleWayTitle}</h3>
            <ul>
              {copy.quranCircleWayPoints.map((point) => (
                <li key={point}>
                  <span className="comparison-point-icon is-positive">
                    <Check aria-hidden="true" />
                  </span>
                  {point}
                </li>
              ))}
            </ul>
          </article>
        </div>
      </div>

      <div className="landing-comparison-foot">
        <p>{copy.explanation}</p>
        <AnalyticsLink
          href="/khatm-coordination"
          analyticsAction="read_guide"
          analyticsSource="home_guide"
          className="landing-text-link"
        >
          {copy.guideLink}
          <ExternalLink aria-hidden="true" />
        </AnalyticsLink>
      </div>
    </section>
  );
}
