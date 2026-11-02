import { act, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { toast } from "sonner";
import CaptchaErrorToast from "@/components/captcha-error-toast";
import {
  CAPTCHA_FAILED_EVENT,
  CAPTCHA_INTERACTIVE_EVENT,
  isCaptchaRejection,
  reportCaptchaRejection,
} from "@/lib/captcha";
import { IntlWrapper } from "../../helpers/intl-wrapper";

vi.mock("sonner", () => ({ toast: { error: vi.fn() } }));

const SCRIPT_URL =
  "https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit&onload=__qcTurnstileLoaded";
const KEY = "1x00000000000000000000AA";

let getCaptchaToken: typeof import("@/lib/captcha").getCaptchaToken;
let getTurnstileSiteKey: typeof import("@/lib/captcha").getTurnstileSiteKey;

const turnstile = { render: vi.fn(), execute: vi.fn(), remove: vi.fn() };
type Options = Record<string, (...args: unknown[]) => unknown> & { sitekey?: string };
let options: Options;

type ScriptMode = "load" | "error" | "stall";
let scriptMode: ScriptMode = "load";

// jsdom never fetches the script; emulate what Cloudflare's api.js does when it is appended.
function interceptScripts() {
  const append = document.head.appendChild.bind(document.head);
  vi.spyOn(document.head, "appendChild").mockImplementation((node) => {
    const result = append(node);
    if (node instanceof HTMLScriptElement) {
      queueMicrotask(() => {
        if (scriptMode === "load") {
          (window as unknown as Record<string, () => void>).__qcTurnstileLoaded?.();
        } else if (scriptMode === "error") {
          node.onerror?.(new Event("error"));
        }
      });
    }
    return result;
  });
}

const scripts = () => document.head.querySelectorAll("script");

describe("getCaptchaToken (Turnstile)", () => {
  beforeEach(async () => {
    // the script promise is module state: start every test from a fresh module
    vi.resetModules();
    ({ getCaptchaToken, getTurnstileSiteKey } = await import("@/lib/captcha"));
    vi.unstubAllEnvs();
    vi.stubEnv("NEXT_PUBLIC_TURNSTILE_SITE_KEY", KEY);
    scriptMode = "load";
    scripts().forEach((s) => s.remove());
    document.body.innerHTML = "";
    document.documentElement.lang = "ar";
    turnstile.render.mockImplementation((_el: HTMLElement, o: Options) => {
      options = o;
      return "widget-1";
    });
    window.turnstile = turnstile;
    vi.spyOn(console, "warn").mockImplementation(() => {});
    interceptScripts();
  });
  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
    vi.clearAllMocks();
    delete window.turnstile;
  });

  it.each([undefined, "", "  "])("site key %j: no token, no script, no widget", async (value) => {
    vi.stubEnv("NEXT_PUBLIC_TURNSTILE_SITE_KEY", value);
    expect(getTurnstileSiteKey()).toBeNull();
    await expect(getCaptchaToken("signin")).resolves.toBeUndefined();
    expect(scripts()).toHaveLength(0);
    expect(turnstile.render).not.toHaveBeenCalled();
  });

  it("loads the script once, renders an on-demand widget with locale and action, resolves the token and cleans up", async () => {
    const pending = getCaptchaToken("signup");
    await vi.waitFor(() => expect(turnstile.execute).toHaveBeenCalledWith("widget-1"));

    expect(scripts()[0].src).toBe(SCRIPT_URL);
    expect(options).toMatchObject({
      sitekey: KEY,
      action: "signup",
      language: "ar",
      execution: "execute",
      appearance: "interaction-only",
    });

    options.callback("token-123");
    await expect(pending).resolves.toBe("token-123");
    expect(turnstile.remove).toHaveBeenCalledTimes(1);
    expect(turnstile.remove).toHaveBeenCalledWith("widget-1");
    expect(document.body.children).toHaveLength(0);

    // single-use tokens: next call gets a fresh widget; the script is not injected twice
    const second = getCaptchaToken("signin");
    await vi.waitFor(() => expect(turnstile.render).toHaveBeenCalledTimes(2));
    options.callback("token-456");
    await expect(second).resolves.toBe("token-456");
    expect(scripts()).toHaveLength(1);
  });

  it("fails open when the script is blocked, and re-injects it on the next call", async () => {
    scriptMode = "error";
    await expect(getCaptchaToken("signin")).resolves.toBeUndefined();
    expect(scripts()).toHaveLength(0);
    expect(turnstile.render).not.toHaveBeenCalled();

    scriptMode = "load";
    const next = getCaptchaToken("signin");
    await vi.waitFor(() => expect(turnstile.execute).toHaveBeenCalled());
    expect(scripts()).toHaveLength(1);
    options.callback("t");
    await expect(next).resolves.toBe("t");
  });

  it("times out a stalled script load and allows a fresh inject afterwards", async () => {
    vi.useFakeTimers();
    scriptMode = "stall";
    const pending = getCaptchaToken("signin");
    await vi.advanceTimersByTimeAsync(60_001);
    await expect(pending).resolves.toBeUndefined();
    expect(scripts()).toHaveLength(0);

    scriptMode = "load";
    const next = getCaptchaToken("signin");
    await vi.advanceTimersByTimeAsync(0);
    expect(scripts()).toHaveLength(1);
    options.callback("t");
    await expect(next).resolves.toBe("t");
  });

  it("removes the widget and fails open when the challenge times out", async () => {
    vi.useFakeTimers();
    const pending = getCaptchaToken("signin");
    await vi.advanceTimersByTimeAsync(60_001);
    await expect(pending).resolves.toBeUndefined();
    expect(turnstile.remove).toHaveBeenCalledTimes(1);
    expect(document.body.children).toHaveLength(0);
  });

  it.each(["error-callback", "timeout-callback", "unsupported-callback"])(
    "%s fails open, removes the widget once, and ignores late callbacks",
    async (name) => {
      const pending = getCaptchaToken("signin");
      await vi.waitFor(() => expect(turnstile.execute).toHaveBeenCalled());
      options[name]("600010");
      await expect(pending).resolves.toBeUndefined();
      options.callback("late");
      options[name]("again");
      expect(turnstile.remove).toHaveBeenCalledTimes(1);
    },
  );

  it("cleans up immediately when render throws", async () => {
    turnstile.render.mockImplementation(() => {
      throw new Error("boom");
    });
    await expect(getCaptchaToken("signin")).resolves.toBeUndefined();
    expect(turnstile.execute).not.toHaveBeenCalled();
    expect(document.body.children).toHaveLength(0);
  });

  it("fails fast when the dialog hosting the widget closes", async () => {
    document.body.innerHTML = '<div role="dialog" data-state="open" id="d"></div>';
    const pending = getCaptchaToken("signin");
    await vi.waitFor(() => expect(turnstile.execute).toHaveBeenCalled());
    document.getElementById("d")!.remove();
    await expect(pending).resolves.toBeUndefined();
    expect(turnstile.remove).toHaveBeenCalledTimes(1);
  });

  it("places the widget in the topmost open dialog and shows, focuses and announces it on interaction", async () => {
    document.body.innerHTML =
      '<div role="dialog" data-state="open" id="bottom"></div><div role="dialog" data-state="open" id="top"><button id="b">x</button></div>';
    const announce = vi.fn();
    window.addEventListener(CAPTCHA_INTERACTIVE_EVENT, announce);
    document.getElementById("b")!.focus();

    const pending = getCaptchaToken("signin");
    await vi.waitFor(() => expect(turnstile.execute).toHaveBeenCalled());
    const box = turnstile.render.mock.calls[0][0] as HTMLElement;
    expect(box.parentElement?.id).toBe("top");
    expect(box.style.width).toBe("0px"); // invisible until Cloudflare asks for interaction

    options["before-interactive-callback"]();
    expect(box.style.position).toBe("static");
    expect(document.activeElement).toBe(box);
    expect((announce.mock.calls[0][0] as CustomEvent).detail.active).toBe(true);

    options.callback("t");
    await pending;
    expect((announce.mock.calls.at(-1)![0] as CustomEvent).detail.active).toBe(false);
    expect(document.activeElement).toBe(document.getElementById("b"));
    window.removeEventListener(CAPTCHA_INTERACTIVE_EVENT, announce);
  });

  it("pins the widget to the viewport when no dialog is open", async () => {
    const pending = getCaptchaToken("signin");
    await vi.waitFor(() => expect(turnstile.execute).toHaveBeenCalled());
    const box = turnstile.render.mock.calls[0][0] as HTMLElement;
    expect(box.parentElement).toBe(document.body);
    options["before-interactive-callback"]();
    expect(box.style.position).toBe("fixed");
    options.callback("t");
    await pending;
  });
});

describe("captcha rejection", () => {
  it("recognises Supabase's captcha_failed code and message", () => {
    expect(isCaptchaRejection({ code: "captcha_failed", message: "x" })).toBe(true);
    expect(isCaptchaRejection(new Error("captcha verification process failed"))).toBe(true);
    expect(isCaptchaRejection(new Error("Invalid login credentials"))).toBe(false);
    expect(isCaptchaRejection(null)).toBe(false);
  });

  it("announces only captcha rejections", () => {
    const listener = vi.fn();
    window.addEventListener(CAPTCHA_FAILED_EVENT, listener);
    const retry = vi.fn();
    expect(reportCaptchaRejection(new Error("Invalid login credentials"), retry)).toBe(false);
    expect(listener).not.toHaveBeenCalled();
    expect(reportCaptchaRejection({ code: "captcha_failed" }, retry)).toBe(true);
    expect((listener.mock.calls[0][0] as CustomEvent).detail.onRetry).toBe(retry);
    window.removeEventListener(CAPTCHA_FAILED_EVENT, listener);
  });
});

describe("CaptchaErrorToast", () => {
  it("shows one deduped translated toast with Retry, and announces the interactive check", () => {
    const retry = vi.fn();
    render(<CaptchaErrorToast />, { wrapper: IntlWrapper });
    act(() => {
      window.dispatchEvent(new CustomEvent(CAPTCHA_FAILED_EVENT, { detail: { onRetry: retry } }));
    });
    expect(toast.error).toHaveBeenCalledWith(
      "Security check failed",
      expect.objectContaining({
        id: "captcha-failed",
        description: "We couldn't confirm you're not a bot. Please try again.",
        action: { label: "Try again", onClick: retry },
      }),
    );

    const status = screen.getByRole("status");
    expect(status).toBeEmptyDOMElement();
    act(() => {
      window.dispatchEvent(new CustomEvent(CAPTCHA_INTERACTIVE_EVENT, { detail: { active: true } }));
    });
    expect(status).toHaveTextContent("Please complete the security check.");
  });
});
