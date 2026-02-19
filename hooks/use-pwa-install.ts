"use client";

import { useCallback, useEffect, useMemo, useState } from "react";

export type InstallPlatform = "android" | "ios" | "other";
export type InstallPromptOutcome = "accepted" | "dismissed" | "unavailable";
export type InstallSurface = "home" | "claim-success";

export const INSTALL_PROMPT_DISMISSED_KEY = "qc_install_prompt_dismissed_v1";
export const INSTALL_PROMPT_INSTALLED_MANUAL_KEY =
  "qc_install_prompt_installed_manual_v1";
export const INSTALL_PROMPT_CLAIM_SURFACE_SEEN_KEY =
  "qc_install_prompt_claim_surface_seen_v1";
export const INSTALL_PROMPT_HOME_SNOOZE_UNTIL_KEY =
  "qc_install_prompt_home_snooze_until_v1";

const INSTALL_PROMPT_PILL_MIGRATION_KEY = "qc_install_prompt_reset_for_pill_v1";
const INSTALL_PROMPT_SYNC_EVENT = "qc:install-prompt-sync";
const DAY_IN_MS = 24 * 60 * 60 * 1000;

type InstallPromptSyncDetail = {
  key: string;
  value: string | null;
};

function emitInstallPromptSync(key: string, value: string | null) {
  if (typeof window === "undefined") return;

  window.dispatchEvent(
    new CustomEvent<InstallPromptSyncDetail>(INSTALL_PROMPT_SYNC_EVENT, {
      detail: { key, value },
    })
  );
}

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

function readStoredNumber(key: string) {
  if (typeof window === "undefined") return null;

  try {
    const value = window.localStorage.getItem(key);
    if (!value) return null;

    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : null;
  } catch {
    return null;
  }
}

function writeStoredFlag(key: string) {
  if (typeof window === "undefined") return;

  try {
    window.localStorage.setItem(key, "1");
    emitInstallPromptSync(key, "1");
  } catch {
    // noop: storage may be unavailable in private modes.
  }
}

function writeStoredNumber(key: string, value: number) {
  if (typeof window === "undefined") return;

  try {
    const serialized = String(value);
    window.localStorage.setItem(key, serialized);
    emitInstallPromptSync(key, serialized);
  } catch {
    // noop: storage may be unavailable in private modes.
  }
}

function removeStoredKey(key: string) {
  if (typeof window === "undefined") return;

  try {
    window.localStorage.removeItem(key);
    emitInstallPromptSync(key, null);
  } catch {
    // noop: storage may be unavailable in private modes.
  }
}

function parseStoredNumber(value: string | null) {
  if (!value) return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
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

export function usePwaInstall(surface: InstallSurface = "claim-success") {
  const [platform] = useState<InstallPlatform>(() => detectPlatform());
  const [isStandalone, setIsStandalone] = useState(() => isStandaloneContext());
  const [isDismissed, setIsDismissed] = useState(() =>
    readStoredFlag(INSTALL_PROMPT_DISMISSED_KEY)
  );
  const [homeSnoozeUntil, setHomeSnoozeUntil] = useState<number | null>(() =>
    readStoredNumber(INSTALL_PROMPT_HOME_SNOOZE_UNTIL_KEY)
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

  const snoozeForDays = useCallback((days: number) => {
    const validDays = Number.isFinite(days) ? Math.max(0, days) : 0;
    if (validDays <= 0) {
      removeStoredKey(INSTALL_PROMPT_HOME_SNOOZE_UNTIL_KEY);
      setHomeSnoozeUntil(null);
      return;
    }

    const snoozeUntil = Date.now() + validDays * DAY_IN_MS;
    writeStoredNumber(INSTALL_PROMPT_HOME_SNOOZE_UNTIL_KEY, snoozeUntil);
    setHomeSnoozeUntil(snoozeUntil);
  }, []);

  useEffect(() => {
    if (!featureEnabled || surface !== "home") return;

    try {
      if (window.localStorage.getItem(INSTALL_PROMPT_PILL_MIGRATION_KEY) === "1") {
        return;
      }

      if (window.localStorage.getItem(INSTALL_PROMPT_DISMISSED_KEY) === "1") {
        window.localStorage.removeItem(INSTALL_PROMPT_DISMISSED_KEY);
        setIsDismissed(false);
      }

      window.localStorage.setItem(INSTALL_PROMPT_PILL_MIGRATION_KEY, "1");
    } catch {
      // noop: storage may be unavailable in private modes.
    }
  }, [featureEnabled, surface]);

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

  useEffect(() => {
    if (!featureEnabled) return;

    const handleInstallPromptStateChange = (key: string, newValue: string | null) => {
      if (key === INSTALL_PROMPT_DISMISSED_KEY) {
        setIsDismissed(newValue === "1");
      }

      if (key === INSTALL_PROMPT_HOME_SNOOZE_UNTIL_KEY) {
        setHomeSnoozeUntil(parseStoredNumber(newValue));
      }

      if (key === INSTALL_PROMPT_INSTALLED_MANUAL_KEY) {
        const installed = newValue === "1";
        setIsManuallyInstalled(installed);
        if (installed) {
          setDeferredPrompt(null);
        }
      }
    };

    const handleStorage = (event: StorageEvent) => {
      if (event.storageArea !== window.localStorage) return;
      if (!event.key) return;
      handleInstallPromptStateChange(event.key, event.newValue);
    };

    const handleCustomSync = (event: Event) => {
      const syncEvent = event as CustomEvent<InstallPromptSyncDetail>;
      if (!syncEvent.detail?.key) return;
      handleInstallPromptStateChange(syncEvent.detail.key, syncEvent.detail.value);
    };

    window.addEventListener("storage", handleStorage);
    window.addEventListener(INSTALL_PROMPT_SYNC_EVENT, handleCustomSync);
    return () => {
      window.removeEventListener("storage", handleStorage);
      window.removeEventListener(INSTALL_PROMPT_SYNC_EVENT, handleCustomSync);
    };
  }, [featureEnabled]);

  useEffect(() => {
    if (homeSnoozeUntil === null) return;
    if (homeSnoozeUntil > Date.now()) return;

    removeStoredKey(INSTALL_PROMPT_HOME_SNOOZE_UNTIL_KEY);
    setHomeSnoozeUntil(null);
  }, [homeSnoozeUntil]);

  const isHomeSnoozed = useMemo(() => {
    return homeSnoozeUntil !== null && homeSnoozeUntil > Date.now();
  }, [homeSnoozeUntil]);

  const isEligible = useMemo(() => {
    const baseEligible = featureEnabled && !isStandalone && !isManuallyInstalled;
    if (!baseEligible) return false;

    if (surface === "home") {
      return !isHomeSnoozed;
    }

    return !isDismissed;
  }, [
    featureEnabled,
    isDismissed,
    isHomeSnoozed,
    isManuallyInstalled,
    isStandalone,
    surface,
  ]);

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
    snoozeForDays,
    markInstalledManually: markInstalled,
  };
}
