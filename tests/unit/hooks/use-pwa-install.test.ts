import { renderHook, act, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  hasSeenClaimInstallPrompt,
  INSTALL_PROMPT_CLAIM_SURFACE_SEEN_KEY,
  INSTALL_PROMPT_DISMISSED_KEY,
  INSTALL_PROMPT_INSTALLED_MANUAL_KEY,
  markClaimInstallPromptSeen,
  usePwaInstall,
  type InstallPromptOutcome,
} from "@/hooks/use-pwa-install";

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

  it("persistently suppresses prompt after dismissForever", async () => {
    const { result } = renderHook(() => usePwaInstall());

    await waitFor(() => {
      expect(result.current.isEligible).toBe(true);
    });

    act(() => {
      result.current.dismissForever();
    });

    expect(window.localStorage.getItem(INSTALL_PROMPT_DISMISSED_KEY)).toBe("1");
    expect(result.current.isEligible).toBe(false);
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

  it("synchronizes dismissal state changes from other tabs via storage events", async () => {
    const { result } = renderHook(() => usePwaInstall());

    await waitFor(() => {
      expect(result.current.isEligible).toBe(true);
    });

    act(() => {
      const storageEvent = new Event("storage") as StorageEvent;
      Object.defineProperty(storageEvent, "key", {
        value: INSTALL_PROMPT_DISMISSED_KEY,
      });
      Object.defineProperty(storageEvent, "newValue", { value: "1" });
      Object.defineProperty(storageEvent, "storageArea", {
        value: window.localStorage,
      });
      window.dispatchEvent(
        storageEvent
      );
    });

    expect(result.current.isEligible).toBe(false);
  });
});
