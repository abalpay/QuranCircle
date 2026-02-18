"use client";

import { useEffect } from "react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { usePwaInstall } from "@/hooks/use-pwa-install";
import {
  CheckCircle2,
  Download,
  EllipsisVertical,
  PlusSquare,
  Share2,
  Smartphone,
  X,
} from "lucide-react";

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
  const {
    platform,
    isEligible,
    canNativePrompt,
    promptNativeInstall,
    dismissForever,
    markInstalledManually,
  } = usePwaInstall();

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
      ? "Keep your circle one tap away"
      : "Install QuranCircle";
  const description =
    surface === "claim-success"
      ? "Add this app to your phone so you can return to your Khatm in seconds."
      : "Get quick access from your home screen with an app-like experience.";

  const handleDismiss = () => {
    dismissForever();
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
        aria-label="Install QuranCircle"
        aria-modal="false"
      >
        <button
          type="button"
          onClick={handleDismiss}
          className="absolute right-3 top-3 inline-flex h-8 w-8 items-center justify-center rounded-full text-quran-muted transition-colors hover:bg-quran-border/30"
          aria-label="Close install prompt"
        >
          <X className="h-4 w-4" />
        </button>

        <div className="pr-8">
          <div className="mb-1 inline-flex items-center gap-2 rounded-full border border-quran-border/70 bg-white/70 px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.18em] text-quran-muted">
            <Smartphone className="h-3.5 w-3.5" />
            Install App
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
                iPhone & iPad Steps
              </p>
              <div className="mt-2 grid grid-cols-3 gap-2 text-center text-[11px] font-medium text-quran-deep">
                <div className="install-step-chip">
                  <Share2 className="mx-auto mb-1 h-4 w-4" />
                  Share
                </div>
                <div className="install-step-chip">
                  <PlusSquare className="mx-auto mb-1 h-4 w-4" />
                  Add to Home
                </div>
                <div className="install-step-chip">
                  <CheckCircle2 className="mx-auto mb-1 h-4 w-4" />
                  Add
                </div>
              </div>
              <p className="mt-2 text-xs leading-relaxed text-quran-muted">
                If you don&apos;t see this option, open this page in Safari and try again.
              </p>
            </div>
          ) : (
            <div className="rounded-2xl border border-quran-border/65 bg-white/65 p-3">
              {canNativePrompt ? (
                <p className="text-xs leading-relaxed text-quran-muted">
                  Tap install to add QuranCircle to your home screen.
                </p>
              ) : (
                <>
                  <p className="text-xs font-semibold uppercase tracking-[0.14em] text-quran-muted">
                    Manual Install
                  </p>
                  <p className="mt-2 text-xs leading-relaxed text-quran-muted">
                    Open your browser menu <EllipsisVertical className="mx-0.5 inline h-3.5 w-3.5" /> and
                    choose <strong>Install app</strong> or <strong>Add to Home screen</strong>.
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
              <Download className="mr-2 h-4 w-4" />
              Install App
            </Button>
          )}

          {shouldShowDoneAction && (
            <Button
              size="sm"
              variant="outline"
              className="h-10 flex-1 rounded-full border-quran-border bg-white/75 px-4 text-sm text-quran-deep hover:bg-white"
              onClick={handleManualDone}
            >
              <CheckCircle2 className="mr-2 h-4 w-4" />
              I Added It
            </Button>
          )}

          <Button
            size="sm"
            variant="ghost"
            className="h-10 rounded-full px-4 text-sm text-quran-muted hover:bg-quran-border/20 hover:text-quran-deep"
            onClick={handleDismiss}
          >
            Not now
          </Button>
        </div>
      </section>
    </div>
  );
}
