import { BookOpenCheck, ExternalLink } from "lucide-react";
import AnalyticsLink from "@/components/analytics-link";
import { OpenQuranIllustration } from "@/components/landing/decorative-art";

type OrganizerResourceProps = {
  eyebrow: string;
  title: string;
  description: string;
  button: string;
};

export default function OrganizerResource({
  eyebrow,
  title,
  description,
  button,
}: OrganizerResourceProps) {
  return (
    <section
      className="landing-resource"
      aria-labelledby="organizer-resource-title"
    >
      <div className="landing-resource-copy">
        <p className="landing-eyebrow">{eyebrow}</p>
        <h2 id="organizer-resource-title">{title}</h2>
        <p>{description}</p>
      </div>

      <AnalyticsLink
        href="/khatm-coordination"
        analyticsAction="read_guide"
        analyticsSource="home_guide"
        className="landing-resource-button"
      >
        <BookOpenCheck aria-hidden="true" />
        {button}
        <ExternalLink aria-hidden="true" />
      </AnalyticsLink>

      <OpenQuranIllustration className="landing-resource-quran" />
    </section>
  );
}
