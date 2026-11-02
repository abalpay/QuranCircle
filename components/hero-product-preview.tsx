"use client";

import {
  Check,
  CheckCircle2,
  Link2,
  RotateCcw,
  ShieldCheck,
} from "lucide-react";
import { useState } from "react";
import { useTranslations } from "next-intl";
import { cn } from "@/lib/utils";

type PreviewStatus = "available" | "claimed" | "completed";

const JUZ_NUMBERS = Array.from({ length: 30 }, (_, index) => index + 1);
const COMPLETED_JUZ = new Set([3, 7, 8, 14, 16, 21]);
const CLAIMED_JUZ = new Set([1, 2, 4, 5, 9, 10, 12, 15, 18, 20, 24, 27]);
const DEMO_JUZ = 19;

const CLAIMED_NAMES: Record<number, string> = {
  1: "Haleemah",
  2: "Haleemah",
  4: "Amina",
  5: "Yusuf",
  9: "Mariam",
  10: "Omar",
  12: "Zaynab",
  15: "Haleemah",
  18: "Ali",
  20: "Haleemah",
  24: "Ibrahim",
  27: "Safiya",
};

function getStatus(juzNumber: number, isDemoClaimed: boolean): PreviewStatus {
  if (COMPLETED_JUZ.has(juzNumber)) return "completed";
  if (CLAIMED_JUZ.has(juzNumber)) return "claimed";
  if (juzNumber === DEMO_JUZ && isDemoClaimed) return "claimed";
  return "available";
}

type TileContentProps = {
  juzNumber: number;
  status: PreviewStatus;
  isDemo: boolean;
  isDemoClaimed: boolean;
};

function TileContent({
  juzNumber,
  status,
  isDemo,
  isDemoClaimed,
}: TileContentProps) {
  const t = useTranslations("HeroPreview");
  const claimedName =
    juzNumber === DEMO_JUZ && isDemoClaimed
      ? t("you")
      : CLAIMED_NAMES[juzNumber];

  return (
    <>
      <span className="hero-product-tile-number">{juzNumber}</span>
      {status === "completed" ? (
        <span className="hero-product-tile-state">
          {t("completed")}
          <CheckCircle2 aria-hidden className="h-3 w-3" />
        </span>
      ) : status === "claimed" ? (
        <span className="hero-product-tile-state">
          {claimedName}
          <Check aria-hidden className="h-3 w-3" />
        </span>
      ) : isDemo ? (
        <span className="hero-product-tile-action">{t("claimJuz")}</span>
      ) : (
        <span className="hero-product-tile-state">{t("available")}</span>
      )}
    </>
  );
}

export default function HeroProductPreview() {
  const t = useTranslations("HeroPreview");
  const [isDemoClaimed, setIsDemoClaimed] = useState(false);
  const claimedCount = isDemoClaimed ? 19 : 18;
  const progress = Math.round((claimedCount / 30) * 100);

  return (
    <div className="hero-product-frame">
      <div
        className="hero-product-card"
        aria-label={t("previewAriaLabel")}
      >
        <header className="hero-product-header">
          <div className="hero-product-meta">
            <span className="hero-product-badge">
              <ShieldCheck aria-hidden className="h-3.5 w-3.5" />
              {t("interactivePreview")}
            </span>
            <span>{t("khatmNumber", { number: 1 })}</span>
          </div>

          <div className="hero-product-heading">
            <div>
              <p className="hero-product-overline">{t("circleName")}</p>
              <h2>{t("progressTracker")}</h2>
              <p aria-live="polite">
                {t("claimedProgress", { claimed: claimedCount, total: 30 })}
              </p>
            </div>
            <div className="hero-product-progress-value">
              <strong>{progress}%</strong>
              <span>{t("overallProgress")}</span>
            </div>
          </div>

          <div
            className="hero-product-progress"
            role="progressbar"
            aria-label={t("progressAriaLabel")}
            aria-valuemin={0}
            aria-valuemax={30}
            aria-valuenow={claimedCount}
          >
            <span style={{ width: `${progress}%` }} />
          </div>

          <div className="hero-product-progress-labels" aria-hidden>
            <span>{t("claimedCount", { count: claimedCount })}</span>
            <span>{t("juzCount", { count: 30 })}</span>
          </div>
        </header>

        <div className="hero-product-legend" aria-label={t("legendLabel")}>
          <span>
            <i className="is-available" />
            {t("available")}
          </span>
          <span>
            <i className="is-claimed" />
            {t("claimed")}
          </span>
          <span>
            <i className="is-completed" />
            {t("completed")}
          </span>
        </div>

        <ol className="hero-product-grid" aria-label={t("gridLabel")}>
          {JUZ_NUMBERS.map((juzNumber) => {
            const status = getStatus(juzNumber, isDemoClaimed);
            const isDemo = juzNumber === DEMO_JUZ;
            const tileClassName = cn(
              "hero-product-tile",
              `is-${status}`,
              isDemo && "is-demo"
            );

            return (
              <li key={juzNumber}>
                {isDemo ? (
                  <button
                    type="button"
                    className={tileClassName}
                    onClick={() => setIsDemoClaimed(true)}
                    disabled={isDemoClaimed}
                    aria-label={
                      isDemoClaimed
                        ? t("demoClaimedLabel", { number: DEMO_JUZ })
                        : t("demoClaimLabel", { number: DEMO_JUZ })
                    }
                  >
                    <TileContent
                      juzNumber={juzNumber}
                      status={status}
                      isDemo
                      isDemoClaimed={isDemoClaimed}
                    />
                  </button>
                ) : (
                  <div className={tileClassName}>
                    <TileContent
                      juzNumber={juzNumber}
                      status={status}
                      isDemo={false}
                      isDemoClaimed={isDemoClaimed}
                    />
                  </div>
                )}
              </li>
            );
          })}
        </ol>

        <footer className="hero-product-footer">
          <span>
            <ShieldCheck aria-hidden className="h-4 w-4" />
            {t("openForClaims")}
          </span>
          <span className="hero-product-footer-divider" aria-hidden />
          <span>
            <Link2 aria-hidden className="h-4 w-4" />
            {t("shareCircleLink")}
          </span>
          {isDemoClaimed ? (
            <button type="button" onClick={() => setIsDemoClaimed(false)}>
              <RotateCcw aria-hidden className="h-3.5 w-3.5" />
              {t("resetDemo")}
            </button>
          ) : null}
        </footer>
      </div>
    </div>
  );
}
