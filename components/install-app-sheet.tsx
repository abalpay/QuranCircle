"use client";

import { useEffect } from "react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { usePwaInstall } from "@/hooks/use-pwa-install";
import {
  CheckCircle2,
  Download,
  PlusSquare,
  Share2,
  Smartphone,
  X,
} from "lucide-react";
import { useTranslations } from "next-intl";

type Props = {
  surface: "home" | "claim-success";
  open: boolean;
  onOpenChange: (open: boolean) => void;
  showDoneAction?: boolean;
};

export default function InstallAppSheet({
  surface,
  open,
  onOpenChange,
  showDoneAction = false,
}: Props) {
  const t = useTranslations("InstallApp");
  const {
    platform,
    isEligible,
    canNativePrompt,
    promptNativeInstall,
    dismissForever,
    snoozeForDays,
    markInstalledManually,
  } = usePwaInstall(surface);

  useEffect(() => {
    if (!isEligible && open) {
      onOpenChange(false);
    }
  }, [isEligible, onOpenChange, open]);

  if (!open || !isEligible) {
    return null;
  }

  const isIOS = platform === "ios";
  const shouldShowDoneAction = showDoneAction && isIOS;

  const title =
    surface === "claim-success"
      ? t("claimSuccessTitle")
      : t("homeTitle");
  const description =
    surface === "claim-success"
      ? t("claimSuccessDesc")
      : t("homeDesc");

  const handleDismiss = () => {
    if (surface === "home") {
      snoozeForDays(7);
    } else {
      dismissForever();
    }
    onOpenChange(false);
  };

  const handleNativeInstall = async () => {
    const outcome = await promptNativeInstall();
    if (outcome === "accepted") {
      onOpenChange(false);
    }
  };

  const handleManualDone = () => {
    markInstalledManually();
    onOpenChange(false);
  };

  return (
    <div className="install-sheet-anchor pointer-events-none fixed inset-x-0 z-50 px-3 md:hidden">
      <section
        className="install-sheet pointer-events-auto"
        role="dialog"
        aria-label={t("dialogAriaLabel")}
        aria-modal="false"
      >
        <button
          type="button"
          onClick={handleDismiss}
          className="absolute end-2 top-2 inline-flex size-11 items-center justify-center rounded-full text-quran-muted transition-colors hover:bg-quran-border/30"
          aria-label={t("close")}
        >
          <X className="h-4 w-4" />
        </button>

        <div className="pe-8">
          <div className="mb-1 inline-flex items-center gap-2 rounded-full border border-quran-border/70 bg-white/70 px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.18em] text-quran-muted">
            <Smartphone className="h-3.5 w-3.5" />
            {t("installApp")}
          </div>
          <h2 className="font-heading text-2xl leading-tight text-quran-deep">
            {title}
          </h2>
          <p className="mt-1 text-sm leading-relaxed text-quran-muted">{description}</p>
        </div>

        <div className="mt-4 space-y-3">
          {isIOS ? (
            <div className="rounded-2xl border border-quran-border/65 bg-white/65 p-3">
              <p className="text-xs font-semibold uppercase tracking-[0.14em] text-quran-muted">
                {t("iosSteps")}
              </p>
              <div className="mt-2 grid grid-cols-3 gap-2 text-center text-[11px] font-medium text-quran-deep">
                <div className="install-step-chip">
                  <Share2 className="mx-auto mb-1 h-4 w-4" />
                  {t("share")}
                </div>
                <div className="install-step-chip">
                  <PlusSquare className="mx-auto mb-1 h-4 w-4" />
                  {t("addToHome")}
                </div>
                <div className="install-step-chip">
                  <CheckCircle2 className="mx-auto mb-1 h-4 w-4" />
                  {t("add")}
                </div>
              </div>
              <p className="mt-2 text-xs leading-relaxed text-quran-muted">
                {t("safariNote")}
              </p>
            </div>
          ) : (
            <div className="rounded-2xl border border-quran-border/65 bg-white/65 p-3">
              {canNativePrompt ? (
                <p className="text-xs leading-relaxed text-quran-muted">
                  {t("tapToInstall")}
                </p>
              ) : (
                <>
                  <p className="text-xs font-semibold uppercase tracking-[0.14em] text-quran-muted">
                    {t("manualInstall")}
                  </p>
                  <p className="mt-2 text-xs leading-relaxed text-quran-muted">
                    {t("manualInstallDesc")}
                  </p>
                </>
              )}
            </div>
          )}
        </div>

        <div className={cn("mt-4 flex gap-2", shouldShowDoneAction ? "flex-wrap" : "items-center")}>
          {canNativePrompt && (
            <Button
              size="sm"
              className="h-10 flex-1 rounded-full px-4 text-sm font-semibold"
              onClick={handleNativeInstall}
            >
              <Download className="me-2 h-4 w-4" />
              {t("installButton")}
            </Button>
          )}

          {shouldShowDoneAction && (
            <Button
              size="sm"
              variant="outline"
              className="h-10 flex-1 rounded-full border-quran-border bg-white/75 px-4 text-sm text-quran-deep hover:bg-white"
              onClick={handleManualDone}
            >
              <CheckCircle2 className="me-2 h-4 w-4" />
              {t("iAddedIt")}
            </Button>
          )}

          <Button
            size="sm"
            variant="ghost"
            className="h-10 rounded-full px-4 text-sm text-quran-muted hover:bg-quran-border/20 hover:text-quran-deep"
            onClick={handleDismiss}
          >
            {t("notNow")}
          </Button>
        </div>
      </section>
    </div>
  );
}
