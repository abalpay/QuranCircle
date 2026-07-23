import {
  BookOpen,
  CircleCheckBig,
  UsersRound,
  type LucideIcon,
} from "lucide-react";

type LandingMetricsProps = {
  stats: {
    totalCircles: number;
    totalJuzClaimed: number;
    activeKhatms: number;
  };
};

type Metric = {
  label: string;
  value: number;
  icon: LucideIcon;
};

const numberFormatter = new Intl.NumberFormat("en-US");

function formatMetric(value: number) {
  const normalized = Math.max(0, Math.trunc(value));
  return `${numberFormatter.format(normalized)}${normalized > 0 ? "+" : ""}`;
}

export default function LandingMetrics({ stats }: LandingMetricsProps) {
  const metrics: Metric[] = [
    {
      label: "Circles created",
      value: stats.totalCircles,
      icon: UsersRound,
    },
    {
      label: "Juz claimed",
      value: stats.totalJuzClaimed,
      icon: BookOpen,
    },
    {
      label: "Khatms active now",
      value: stats.activeKhatms,
      icon: CircleCheckBig,
    },
  ];

  return (
    <section className="landing-metrics" aria-label="QuranCircle community statistics">
      <ul className="landing-metrics-grid">
        {metrics.map(({ label, value, icon: Icon }) => (
          <li key={label}>
            <Icon aria-hidden="true" />
            <div>
              <strong>{formatMetric(value)}</strong>
              <span>{label}</span>
            </div>
          </li>
        ))}
      </ul>
    </section>
  );
}
