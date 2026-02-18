"use client";

import { useCallback, useEffect, useMemo, useState } from "react";

export type InstallPlatform = "android" | "ios" | "other";
export type InstallPromptOutcome = "accepted" | "dismissed" | "unavailable";

export const INSTALL_PROMPT_DISMISSED_KEY = "qc_install_prompt_dismissed_v1";
export const INSTALL_PROMPT_INSTALLED_MANUAL_KEY =
  "qc_install_prompt_installed_manual_v1";
export const INSTALL_PROMPT_CLAIM_SURFACE_SEEN_KEY =
  "qc_install_prompt_claim_surface_seen_v1";

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{
    outcome: "accepted" | "dismissed";
    platform: string;
  }>;
}

type IOSNavigator = Navigator & { standalone?: boolean };

function readStoredFlag(key: string) {
  if (typeof window === "undefined") return false;

  try {
    return window.localStorage.getItem(key) === "1";
  } catch {
    return false;
  }
}

function writeStoredFlag(key: string) {
  if (typeof window === "undefined") return;

  try {
    window.localStorage.setItem(key, "1");
  } catch {
    // noop: storage may be unavailable in private modes.
  }
}

function detectPlatform(): InstallPlatform {
  if (typeof navigator === "undefined") return "other";

  const ua = navigator.userAgent;
  const isIOS =
    /iPhone|iPad|iPod/i.test(ua) ||
    (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);

  if (isIOS) return "ios";
  if (/Android/i.test(ua)) return "android";
  return "other";
}

function isStandaloneContext() {
  if (typeof window === "undefined") return false;

  const displayModeStandalone = window.matchMedia
    ? window.matchMedia("(display-mode: standalone)").matches
    : false;
  const iOSStandalone = Boolean((navigator as IOSNavigator).standalone);
  return displayModeStandalone || iOSStandalone;
}

export function isInstallPromptEnabled() {
  return process.env.NEXT_PUBLIC_ENABLE_INSTALL_PROMPT === "true";
}

export function hasSeenClaimInstallPrompt() {
  return readStoredFlag(INSTALL_PROMPT_CLAIM_SURFACE_SEEN_KEY);
}

export function markClaimInstallPromptSeen() {
  writeStoredFlag(INSTALL_PROMPT_CLAIM_SURFACE_SEEN_KEY);
}

export function usePwaInstall() {
  const [platform] = useState<InstallPlatform>(() => detectPlatform());
  const [isStandalone, setIsStandalone] = useState(() => isStandaloneContext());
  const [isDismissed, setIsDismissed] = useState(() =>
    readStoredFlag(INSTALL_PROMPT_DISMISSED_KEY)
  );
  const [isManuallyInstalled, setIsManuallyInstalled] = useState(() =>
    readStoredFlag(INSTALL_PROMPT_INSTALLED_MANUAL_KEY)
  );
  const [deferredPrompt, setDeferredPrompt] =
    useState<BeforeInstallPromptEvent | null>(null);

  const featureEnabled = isInstallPromptEnabled();

  const markInstalled = useCallback(() => {
    writeStoredFlag(INSTALL_PROMPT_INSTALLED_MANUAL_KEY);
    setIsManuallyInstalled(true);
    setDeferredPrompt(null);
  }, []);

  const dismissForever = useCallback(() => {
    writeStoredFlag(INSTALL_PROMPT_DISMISSED_KEY);
    setIsDismissed(true);
  }, []);

  useEffect(() => {
    if (!featureEnabled) return;

    const handleDisplayModeChange = () => {
      setIsStandalone(isStandaloneContext());
    };

    const handleBeforeInstallPrompt = (event: Event) => {
      const promptEvent = event as BeforeInstallPromptEvent;
      promptEvent.preventDefault();
      setDeferredPrompt(promptEvent);
    };

    const handleAppInstalled = () => {
      markInstalled();
    };

    const mediaQuery = window.matchMedia
      ? window.matchMedia("(display-mode: standalone)")
      : null;

    if (mediaQuery?.addEventListener) {
      mediaQuery.addEventListener("change", handleDisplayModeChange);
    } else if (mediaQuery?.addListener) {
      mediaQuery.addListener(handleDisplayModeChange);
    }

    window.addEventListener(
      "beforeinstallprompt",
      handleBeforeInstallPrompt as EventListener
    );
    window.addEventListener("appinstalled", handleAppInstalled);

    return () => {
      if (mediaQuery?.removeEventListener) {
        mediaQuery.removeEventListener("change", handleDisplayModeChange);
      } else if (mediaQuery?.removeListener) {
        mediaQuery.removeListener(handleDisplayModeChange);
      }

      window.removeEventListener(
        "beforeinstallprompt",
        handleBeforeInstallPrompt as EventListener
      );
      window.removeEventListener("appinstalled", handleAppInstalled);
    };
  }, [featureEnabled, markInstalled]);

  const isEligible = useMemo(() => {
    return featureEnabled && !isStandalone && !isDismissed && !isManuallyInstalled;
  }, [featureEnabled, isDismissed, isManuallyInstalled, isStandalone]);

  const canNativePrompt =
    isEligible && platform === "android" && deferredPrompt !== null;

  const promptNativeInstall = useCallback(async (): Promise<InstallPromptOutcome> => {
    if (!featureEnabled || !deferredPrompt) {
      return "unavailable";
    }

    try {
      await deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      setDeferredPrompt(null);

      if (outcome === "accepted") {
        markInstalled();
      }

      return outcome;
    } catch {
      setDeferredPrompt(null);
      return "unavailable";
    }
  }, [deferredPrompt, featureEnabled, markInstalled]);

  return {
    platform,
    isStandalone,
    canNativePrompt,
    isEligible,
    promptNativeInstall,
    dismissForever,
    markInstalledManually: markInstalled,
  };
}
