import {
  CheckCircle2,
  Link2,
  UsersRound,
  type LucideIcon,
} from "lucide-react";
import { GeometricRosette } from "@/components/landing/decorative-art";
import { getTranslations } from "next-intl/server";

type ProcessStep = {
  title: string;
  description: string;
  icon: LucideIcon;
};

export default async function HowItWorks() {
  const t = await getTranslations("HowItWorks");
  const steps: ProcessStep[] = [
    {
      title: t("stepOneTitle"),
      description: t("stepOneDescription"),
      icon: UsersRound,
    },
    {
      title: t("stepTwoTitle"),
      description: t("stepTwoDescription"),
      icon: Link2,
    },
    {
      title: t("stepThreeTitle"),
      description: t("stepThreeDescription"),
      icon: CheckCircle2,
    },
  ];
  return (
    <section
      className="landing-section landing-process"
      aria-labelledby="process-title"
    >
      <GeometricRosette className="landing-process-rosette" />
      <header className="landing-process-header">
        <div>
          <p className="landing-eyebrow">{t("eyebrow")}</p>
          <h2 id="process-title">{t("title")}</h2>
        </div>
        <p>{t("description")}</p>
      </header>

      <ol className="landing-process-steps">
        {steps.map(({ title, description, icon: Icon }, index) => (
          <li key={title}>
            <div className="process-step-top">
              <span className="process-step-number">0{index + 1}</span>
              <span className="process-step-connector" aria-hidden="true" />
              <span className="process-step-medallion">
                <Icon aria-hidden="true" />
              </span>
            </div>
            <h3>{title}</h3>
            <p>{description}</p>
          </li>
        ))}
      </ol>
    </section>
  );
}
