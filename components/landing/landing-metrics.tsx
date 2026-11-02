import { getFormatter, getTranslations } from "next-intl/server";

type LandingMetricsProps = {
  stats: {
    totalCircles: number;
    totalJuzClaimed: number;
    khatmsCompleted: number;
  };
};

type Metric = {
  label: string;
  value: number;
};

export default async function LandingMetrics({ stats }: LandingMetricsProps) {
  const [t, format] = await Promise.all([
    getTranslations("LandingMetrics"),
    getFormatter(),
  ]);
  const formatMetric = (value: number) => {
    const normalized = Math.max(0, Math.trunc(value));
    return format.number(normalized);
  };
  const metrics: Metric[] = [
    {
      label: t("circlesCreated"),
      value: stats.totalCircles,
    },
    {
      label: t("juzClaimed"),
      value: stats.totalJuzClaimed,
    },
    {
      label: t("khatmsCompleted"),
      value: stats.khatmsCompleted,
    },
  ];

  return (
    <section className="landing-metrics" aria-label={t("ariaLabel")}>
      <ul className="landing-metrics-grid">
        {metrics.map(({ label, value }) => (
          <li key={label}>
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
