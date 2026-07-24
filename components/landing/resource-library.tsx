import { Link } from "@/i18n/navigation";
import {
  ArrowUpRight,
  BookOpenCheck,
  CalendarDays,
  MessageCircleMore,
  type LucideIcon,
} from "lucide-react";

type ResourceLibraryCopy = {
  eyebrow: string;
  title: string;
  description: string;
  readResource: string;
  coordinationTitle: string;
  coordinationDescription: string;
  whatsappTitle: string;
  whatsappDescription: string;
  ramadanTitle: string;
  ramadanDescription: string;
};

type ResourceLibraryProps = {
  copy: ResourceLibraryCopy;
};

type Resource = {
  href: string;
  title: string;
  description: string;
  icon: LucideIcon;
  accent: string;
};

export default function ResourceLibrary({ copy }: ResourceLibraryProps) {
  const resources: Resource[] = [
    {
      href: "/khatm-coordination",
      title: copy.coordinationTitle,
      description: copy.coordinationDescription,
      icon: BookOpenCheck,
      accent: "is-green",
    },
    {
      href: "/group-khatm-whatsapp",
      title: copy.whatsappTitle,
      description: copy.whatsappDescription,
      icon: MessageCircleMore,
      accent: "is-gold",
    },
    {
      href: "/ramadan-group-khatm",
      title: copy.ramadanTitle,
      description: copy.ramadanDescription,
      icon: CalendarDays,
      accent: "is-deep",
    },
  ];

  return (
    <section
      className="landing-section landing-resource-library"
      aria-labelledby="resource-library-title"
    >
      <header className="landing-resource-library-header">
        <div>
          <p className="landing-eyebrow">{copy.eyebrow}</p>
          <h2 id="resource-library-title">{copy.title}</h2>
        </div>
        <p>{copy.description}</p>
      </header>

      <div className="landing-resource-library-grid">
        {resources.map(({ href, title, description, icon: Icon, accent }) => (
          <Link
            key={href}
            href={href}
            className={`landing-resource-card ${accent}`}
          >
            <span className="landing-resource-card-icon">
              <Icon aria-hidden="true" />
            </span>
            <span className="landing-resource-card-copy">
              <strong>{title}</strong>
              <span>{description}</span>
            </span>
            <span className="landing-resource-card-link">
              {copy.readResource}
              <ArrowUpRight aria-hidden="true" />
            </span>
          </Link>
        ))}
      </div>
    </section>
  );
}
