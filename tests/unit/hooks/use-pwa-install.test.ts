import { renderHook, act, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  hasSeenClaimInstallPrompt,
  INSTALL_PROMPT_CLAIM_SURFACE_SEEN_KEY,
  INSTALL_PROMPT_DISMISSED_KEY,
  INSTALL_PROMPT_HOME_SNOOZE_UNTIL_KEY,
  INSTALL_PROMPT_INSTALLED_MANUAL_KEY,
  markClaimInstallPromptSeen,
  usePwaInstall,
  type InstallPromptOutcome,
} from "@/hooks/use-pwa-install";

const INSTALL_PROMPT_PILL_MIGRATION_KEY = "qc_install_prompt_reset_for_pill_v1";
const DAY_IN_MS = 24 * 60 * 60 * 1000;

class MockBeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{
    outcome: "accepted" | "dismissed";
    platform: string;
  }>;

  constructor(outcome: "accepted" | "dismissed") {
    super("beforeinstallprompt");
    this.prompt = vi.fn(async () => {});
    this.userChoice = Promise.resolve({ outcome, platform: "web" });
  }
}

function setUserAgent(userAgent: string) {
  Object.defineProperty(window.navigator, "userAgent", {
    value: userAgent,
    configurable: true,
  });
}

function setStandaloneNavigatorValue(value: boolean) {
  Object.defineProperty(window.navigator, "standalone", {
    value,
    configurable: true,
  });
}

function setupMatchMedia(standaloneMatches: boolean) {
  const matchMedia = vi.fn().mockImplementation((query: string) => ({
    matches: query === "(display-mode: standalone)" ? standaloneMatches : false,
    media: query,
    onchange: null,
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    addListener: vi.fn(),
    removeListener: vi.fn(),
    dispatchEvent: vi.fn().mockReturnValue(false),
  }));

  Object.defineProperty(window, "matchMedia", {
    value: matchMedia,
    configurable: true,
    writable: true,
  });
}

function setupLocalStorageMock() {
  const storage = new Map<string, string>();
  const localStorageMock = {
    getItem: vi.fn((key: string) => storage.get(key) ?? null),
    setItem: vi.fn((key: string, value: string) => {
      storage.set(key, value);
    }),
    removeItem: vi.fn((key: string) => {
      storage.delete(key);
    }),
    clear: vi.fn(() => {
      storage.clear();
    }),
  };

  Object.defineProperty(window, "localStorage", {
    value: localStorageMock,
    configurable: true,
  });
}

function dispatchStorageEvent(key: string, newValue: string | null) {
  const storageEvent = new Event("storage") as StorageEvent;
  Object.defineProperty(storageEvent, "key", { value: key });
  Object.defineProperty(storageEvent, "newValue", { value: newValue });
  Object.defineProperty(storageEvent, "storageArea", {
    value: window.localStorage,
  });
  window.dispatchEvent(storageEvent);
}

describe("usePwaInstall", () => {
  beforeEach(() => {
    process.env.NEXT_PUBLIC_ENABLE_INSTALL_PROMPT = "true";
    setupLocalStorageMock();
    setUserAgent(
      "Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 Chrome/121 Mobile Safari/537.36"
    );
    setStandaloneNavigatorValue(false);
    setupMatchMedia(false);
  });

  it("suppresses eligibility when app is running in standalone mode", async () => {
    setupMatchMedia(true);

    const { result } = renderHook(() => usePwaInstall());

    await waitFor(() => {
      expect(result.current.isStandalone).toBe(true);
    });
    expect(result.current.isEligible).toBe(false);
  });

  it("detects iOS user agents and keeps native prompt unavailable", async () => {
    setUserAgent(
      "Mozilla/5.0 (iPhone; CPU iPhone OS 17_4 like Mac OS X) AppleWebKit/605.1.15 Version/17.4 Mobile/15E148 Safari/604.1"
    );

    const { result } = renderHook(() => usePwaInstall());

    await waitFor(() => {
      expect(result.current.platform).toBe("ios");
    });
    expect(result.current.canNativePrompt).toBe(false);
    expect(result.current.isEligible).toBe(true);
  });

  it("captures beforeinstallprompt and completes native install flow", async () => {
    const { result } = renderHook(() => usePwaInstall());

    await waitFor(() => {
      expect(result.current.isEligible).toBe(true);
    });

    const installEvent = new MockBeforeInstallPromptEvent("accepted");
    act(() => {
      window.dispatchEvent(installEvent);
    });

    await waitFor(() => {
      expect(result.current.canNativePrompt).toBe(true);
    });

    let outcome: InstallPromptOutcome | undefined;
    await act(async () => {
      outcome = await result.current.promptNativeInstall();
    });

    expect(outcome).toBe("accepted");
    expect(window.localStorage.getItem(INSTALL_PROMPT_INSTALLED_MANUAL_KEY)).toBe("1");
    expect(result.current.isEligible).toBe(false);
  });

  it("persistently suppresses claim-success prompt after dismissForever", async () => {
    const { result } = renderHook(() => usePwaInstall("claim-success"));

    await waitFor(() => {
      expect(result.current.isEligible).toBe(true);
    });

    act(() => {
      result.current.dismissForever();
    });

    expect(window.localStorage.getItem(INSTALL_PROMPT_DISMISSED_KEY)).toBe("1");
    expect(result.current.isEligible).toBe(false);
  });

  it("suppresses home prompt for seven days after snooze", async () => {
    const nowSpy = vi.spyOn(Date, "now").mockReturnValue(1_700_000_000_000);
    const { result } = renderHook(() => usePwaInstall("home"));

    await waitFor(() => {
      expect(result.current.isEligible).toBe(true);
    });

    act(() => {
      result.current.snoozeForDays(7);
    });

    expect(window.localStorage.getItem(INSTALL_PROMPT_HOME_SNOOZE_UNTIL_KEY)).toBe(
      String(1_700_000_000_000 + 7 * DAY_IN_MS)
    );
    expect(result.current.isEligible).toBe(false);

    nowSpy.mockRestore();
  });

  it("resets legacy dismissal once for home-surface migration", async () => {
    window.localStorage.setItem(INSTALL_PROMPT_DISMISSED_KEY, "1");

    const { result } = renderHook(() => usePwaInstall("home"));

    await waitFor(() => {
      expect(result.current.isEligible).toBe(true);
    });

    expect(window.localStorage.getItem(INSTALL_PROMPT_DISMISSED_KEY)).toBeNull();
    expect(window.localStorage.getItem(INSTALL_PROMPT_PILL_MIGRATION_KEY)).toBe("1");
  });

  it("persists manual install completion and suppresses prompt", async () => {
    setUserAgent(
      "Mozilla/5.0 (iPhone; CPU iPhone OS 17_4 like Mac OS X) AppleWebKit/605.1.15 CriOS/123 Mobile/15E148 Safari/604.1"
    );

    const { result } = renderHook(() => usePwaInstall());

    await waitFor(() => {
      expect(result.current.isEligible).toBe(true);
    });

    act(() => {
      result.current.markInstalledManually();
    });

    expect(window.localStorage.getItem(INSTALL_PROMPT_INSTALLED_MANUAL_KEY)).toBe("1");
    expect(result.current.isEligible).toBe(false);
  });

  it("tracks claim-surface display with one-time storage key", () => {
    expect(hasSeenClaimInstallPrompt()).toBe(false);

    markClaimInstallPromptSeen();

    expect(window.localStorage.getItem(INSTALL_PROMPT_CLAIM_SURFACE_SEEN_KEY)).toBe(
      "1"
    );
    expect(hasSeenClaimInstallPrompt()).toBe(true);
  });

  it("synchronizes claim-success dismissal state changes from other tabs", async () => {
    const { result } = renderHook(() => usePwaInstall("claim-success"));

    await waitFor(() => {
      expect(result.current.isEligible).toBe(true);
    });

    act(() => {
      dispatchStorageEvent(INSTALL_PROMPT_DISMISSED_KEY, "1");
    });

    expect(result.current.isEligible).toBe(false);
  });

  it("synchronizes home snooze state changes from other tabs", async () => {
    const nowSpy = vi.spyOn(Date, "now").mockReturnValue(1_700_000_000_000);
    const { result } = renderHook(() => usePwaInstall("home"));

    await waitFor(() => {
      expect(result.current.isEligible).toBe(true);
    });

    act(() => {
      dispatchStorageEvent(
        INSTALL_PROMPT_HOME_SNOOZE_UNTIL_KEY,
        String(1_700_000_000_000 + DAY_IN_MS)
      );
    });

    expect(result.current.isEligible).toBe(false);
    nowSpy.mockRestore();
  });
});
