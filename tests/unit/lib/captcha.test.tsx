import { render } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { toast } from "sonner";
import CaptchaErrorToast from "@/components/captcha-error-toast";
import {
  CAPTCHA_FAILED_EVENT,
  getCaptchaToken,
  getTurnstileSiteKey,
  isCaptchaError,
} from "@/lib/captcha";
import { IntlWrapper } from "../../helpers/intl-wrapper";

vi.mock("sonner", () => ({ toast: { error: vi.fn() } }));

const turnstile = {
  render: vi.fn(),
  execute: vi.fn(),
  remove: vi.fn(),
};
let renderOptions: Record<string, (...args: unknown[]) => void> & { sitekey?: string };

// The script tag never loads in jsdom; fire the documented onload callback when it is appended.
function stubScriptLoad() {
  const append = document.head.appendChild.bind(document.head);
  vi.spyOn(document.head, "appendChild").mockImplementation((node) => {
    const result = append(node);
    if (node instanceof HTMLScriptElement) {
      (window as unknown as Record<string, () => void>).__qcTurnstileLoaded?.();
    }
    return result;
  });
}

describe("captcha (Turnstile)", () => {
  beforeEach(() => {
    vi.unstubAllEnvs();
    document.head.querySelectorAll("script").forEach((s) => s.remove());
    document.documentElement.lang = "ar";
    turnstile.render.mockImplementation((_el: HTMLElement, options: typeof renderOptions) => {
      renderOptions = options;
      return "widget-1";
    });
    vi.stubGlobal("turnstile", turnstile);
    window.turnstile = turnstile;
  });
  afterEach(() => {
    vi.restoreAllMocks();
    vi.clearAllMocks();
    delete window.turnstile;
  });

  it.each([undefined, "", "  "])("is off for site key %j: no token, no script, no widget", async (value) => {
    vi.stubEnv("NEXT_PUBLIC_TURNSTILE_SITE_KEY", value);
    expect(getTurnstileSiteKey()).toBeNull();
    await expect(getCaptchaToken("signin")).resolves.toBeUndefined();
    expect(document.head.querySelector("script")).toBeNull();
    expect(turnstile.render).not.toHaveBeenCalled();
  });

  it("loads the script once, renders an on-demand widget with locale and action, resolves the token and cleans up", async () => {
    vi.stubEnv("NEXT_PUBLIC_TURNSTILE_SITE_KEY", "1x00000000000000000000AA");
    stubScriptLoad();

    const pending = getCaptchaToken("signup");
    await vi.waitFor(() => expect(turnstile.execute).toHaveBeenCalledWith("widget-1"));

    const script = document.head.querySelector("script");
    expect(script?.src).toBe(
      "https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit&onload=__qcTurnstileLoaded",
    );
    expect(renderOptions).toMatchObject({
      sitekey: "1x00000000000000000000AA",
      action: "signup",
      language: "ar",
      execution: "execute",
      appearance: "interaction-only",
    });

    renderOptions.callback("token-123");
    await expect(pending).resolves.toBe("token-123");
    expect(turnstile.remove).toHaveBeenCalledWith("widget-1");

    // single-use tokens: the next call renders a fresh widget; the script is not loaded twice
    const second = getCaptchaToken("signin");
    await vi.waitFor(() => expect(turnstile.render).toHaveBeenCalledTimes(2));
    renderOptions.callback("token-456");
    await expect(second).resolves.toBe("token-456");
    expect(document.head.querySelectorAll("script")).toHaveLength(1);
  });

  it("rejects with CaptchaError and announces the failure with a retry", async () => {
    vi.stubEnv("NEXT_PUBLIC_TURNSTILE_SITE_KEY", "2x00000000000000000000AB");
    stubScriptLoad();
    const listener = vi.fn();
    window.addEventListener(CAPTCHA_FAILED_EVENT, listener);
    const retry = vi.fn();

    const pending = getCaptchaToken("anon_signin", retry);
    await vi.waitFor(() => expect(turnstile.execute).toHaveBeenCalled());
    renderOptions["error-callback"]("600010");

    const error = await pending.catch((e) => e);
    expect(isCaptchaError(error)).toBe(true);
    expect(turnstile.remove).toHaveBeenCalledWith("widget-1");
    expect(listener).toHaveBeenCalledTimes(1);
    expect((listener.mock.calls[0][0] as CustomEvent).detail.onRetry).toBe(retry);
    window.removeEventListener(CAPTCHA_FAILED_EVENT, listener);
  });

  it("times out", async () => {
    vi.stubEnv("NEXT_PUBLIC_TURNSTILE_SITE_KEY", "1x00000000000000000000AA");
    stubScriptLoad();
    vi.useFakeTimers();
    const pending = getCaptchaToken("signin").catch((e) => e);
    await vi.advanceTimersByTimeAsync(60_001);
    expect(isCaptchaError(await pending)).toBe(true);
    vi.useRealTimers();
  });

  it("CaptchaErrorToast shows the translated message with a Retry action", () => {
    const retry = vi.fn();
    render(<CaptchaErrorToast />, { wrapper: IntlWrapper });
    window.dispatchEvent(new CustomEvent(CAPTCHA_FAILED_EVENT, { detail: { onRetry: retry } }));

    expect(toast.error).toHaveBeenCalledWith(
      "Security check failed",
      expect.objectContaining({
        description: "We couldn't confirm you're not a bot. Please try again.",
        action: { label: "Try again", onClick: retry },
      }),
    );
  });
});
