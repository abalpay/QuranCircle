import {
  BookOpen,
  CircleCheckBig,
  UsersRound,
  type LucideIcon,
} from "lucide-react";
import { getFormatter, getTranslations } from "next-intl/server";

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

export default async function LandingMetrics({ stats }: LandingMetricsProps) {
  const [t, format] = await Promise.all([
    getTranslations("LandingMetrics"),
    getFormatter(),
  ]);
  const formatMetric = (value: number) => {
    const normalized = Math.max(0, Math.trunc(value));
    return `${format.number(normalized)}${normalized > 0 ? "+" : ""}`;
  };
  const metrics: Metric[] = [
    {
      label: t("circlesCreated"),
      value: stats.totalCircles,
      icon: UsersRound,
    },
    {
      label: t("juzClaimed"),
      value: stats.totalJuzClaimed,
      icon: BookOpen,
    },
    {
      label: t("activeKhatms"),
      value: stats.activeKhatms,
      icon: CircleCheckBig,
    },
  ];

  return (
    <section className="landing-metrics" aria-label={t("ariaLabel")}>
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
