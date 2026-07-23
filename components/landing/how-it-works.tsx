import {
  CheckCircle2,
  Link2,
  UsersRound,
  type LucideIcon,
} from "lucide-react";
import { GeometricRosette } from "@/components/landing/decorative-art";

type ProcessStep = {
  title: string;
  description: string;
  icon: LucideIcon;
};

const steps: ProcessStep[] = [
  {
    title: "Set Your Circle",
    description:
      "Name your Khatm, choose link-only or public, and share in seconds.",
    icon: UsersRound,
  },
  {
    title: "Claim A Juz",
    description:
      "Participants choose their portion by name with no account friction.",
    icon: Link2,
  },
  {
    title: "Track Completion",
    description: "Progress is updated live so everyone can see what remains.",
    icon: CheckCircle2,
  },
];

export default function HowItWorks() {
  return (
    <section
      className="landing-section landing-process"
      aria-labelledby="process-title"
    >
      <GeometricRosette className="landing-process-rosette" />
      <header className="landing-process-header">
        <div>
          <p className="landing-eyebrow">A clear path</p>
          <h2 id="process-title">How It Works</h2>
        </div>
        <p>Simple, focused, and designed for spiritual collaboration.</p>
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
