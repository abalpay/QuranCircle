// Cloudflare Turnstile (D15). The single place the site key is read and the only code that touches
// the widget. NEXT_PUBLIC_* is inlined at build time. Unset => no script, no widget, no token.
//
// Fails open: if no token can be obtained (script blocked, error, timeout) the Supabase call goes
// ahead without one and Supabase, which enforces CAPTCHA server-side, decides. Only a Supabase
// captcha rejection reaches the user (reportCaptchaRejection).
export const TURNSTILE_ORIGIN = "https://challenges.cloudflare.com";
export const CAPTCHA_FAILED_EVENT = "quran-circle:captcha-failed";
export const CAPTCHA_INTERACTIVE_EVENT = "quran-circle:captcha-interactive";
const ONLOAD_CALLBACK = "__qcTurnstileLoaded";
const SCRIPT_LOAD_TIMEOUT_MS = 12_000;
const CHALLENGE_TIMEOUT_MS = 60_000;
const DIALOG_SELECTOR = '[role="dialog"][data-state="open"], [role="alertdialog"][data-state="open"]';

export function getTurnstileSiteKey(): string | null {
  return process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY?.trim() || null;
}

type TurnstileApi = {
  render: (container: HTMLElement, options: Record<string, unknown>) => string;
  execute: (widgetId: string) => void;
  remove: (widgetId: string) => void;
};

declare global {
  interface Window {
    turnstile?: TurnstileApi;
    [ONLOAD_CALLBACK]?: () => void;
  }
}

let apiPromise: Promise<TurnstileApi> | null = null;
let scriptEl: HTMLScriptElement | null = null;

function resetScript() {
  apiPromise = null;
  scriptEl?.remove();
  scriptEl = null;
}

// Created from our nonced bundle, so 'strict-dynamic' trusts it. Loaded on the first token request.
// The script promise is reset only when the script itself errors or misses its load deadline.
function loadTurnstile(): Promise<TurnstileApi> {
  if (window.turnstile) return Promise.resolve(window.turnstile);
  apiPromise ??= new Promise<TurnstileApi>((resolve, reject) => {
    const script = document.createElement("script");
    // The global callback always belongs to the newest injection, so a late onload from an
    // older script resolves the promise that is waiting now instead of stranding it.
    window[ONLOAD_CALLBACK] = () => {
      if (window.turnstile) return resolve(window.turnstile);
      resetScript();
      reject(new Error("Turnstile API missing"));
    };
    script.onerror = () => {
      if (scriptEl === script) resetScript(); // next call re-injects once
      reject(new Error("Turnstile script failed to load"));
    };
    script.src = `${TURNSTILE_ORIGIN}/turnstile/v0/api.js?render=explicit&onload=${ONLOAD_CALLBACK}`;
    script.async = true;
    scriptEl = script;
    document.head.appendChild(script);
  });
  return apiPromise;
}

let interactiveLabel = "";
/** Translated text that names the widget box for screen readers (set by CaptchaErrorToast). */
export function setCaptchaInteractiveLabel(label: string) {
  interactiveLabel = label;
}

function announceInteractive(active: boolean) {
  window.dispatchEvent(new CustomEvent(CAPTCHA_INTERACTIVE_EVENT, { detail: { active } }));
}

// Shown only when Cloudflare asks for interaction. Inside the topmost open dialog so its focus
// trap and pointer-events lock do not block it; otherwise pinned to the bottom of the viewport.
function showWidgetBox(box: HTMLElement, insideDialog: boolean) {
  Object.assign(
    box.style,
    insideDialog
      ? { position: "static", width: "auto", height: "auto", overflow: "visible", marginTop: "1rem" }
      : { position: "fixed", width: "auto", height: "auto", overflow: "visible", insetInline: "0", bottom: "1rem", zIndex: "100", pointerEvents: "auto" },
    { display: "flex", justifyContent: "center" },
  );
  // Radix hides the app root from assistive tech while a dialog is open, so the box names itself.
  box.setAttribute("role", "group");
  box.setAttribute("aria-label", interactiveLabel);
  box.tabIndex = -1;
  box.focus({ preventScroll: true });
  announceInteractive(true);
}

// One fresh widget per call (tokens are single-use), removed when done. A short deadline covers the
// script load, a longer one the challenge itself.
function acquireToken(siteKey: string, action: string): Promise<string> {
  return new Promise<string>((resolve, reject) => {
    const dialogs = document.querySelectorAll<HTMLElement>(DIALOG_SELECTOR);
    const dialog = dialogs[dialogs.length - 1] ?? null;
    const previousFocus = document.activeElement as HTMLElement | null;
    const box = document.createElement("div");
    Object.assign(box.style, { position: "fixed", width: "0", height: "0", overflow: "hidden" });
    (dialog ?? document.body).appendChild(box);

    let done = false;
    let widgetId = "";
    let turnstile: TurnstileApi | undefined;
    const observer = new MutationObserver(() => {
      if (!box.isConnected) fail(); // dialog closed under us
    });
    const finish = (settle: () => void) => {
      if (done) return;
      done = true;
      clearTimeout(loadTimer);
      clearTimeout(challengeTimer);
      observer.disconnect();
      if (widgetId) {
        try {
          turnstile?.remove(widgetId);
        } catch {
          // already gone
        }
      }
      const hadFocus = box.contains(document.activeElement);
      box.remove();
      announceInteractive(false);
      if (hadFocus && previousFocus?.isConnected) previousFocus.focus({ preventScroll: true });
      settle();
    };
    const fail = () => finish(() => reject(new Error("Captcha check failed")));
    let challengeTimer: ReturnType<typeof setTimeout> | undefined;
    const loadTimer = setTimeout(() => {
      resetScript(); // stalled load: allow a fresh inject next time
      fail();
    }, SCRIPT_LOAD_TIMEOUT_MS);
    observer.observe(document.body, { childList: true, subtree: true });

    loadTurnstile().then((api) => {
      if (done) return;
      clearTimeout(loadTimer);
      challengeTimer = setTimeout(fail, CHALLENGE_TIMEOUT_MS);
      turnstile = api;
      try {
        widgetId = api.render(box, {
          sitekey: siteKey,
          action,
          language: document.documentElement.lang || "auto",
          execution: "execute",
          appearance: "interaction-only",
          retry: "never",
          callback: (token: string) => finish(() => resolve(token)),
          "error-callback": () => {
            fail();
            return true;
          },
          "timeout-callback": fail,
          "unsupported-callback": fail,
          "before-interactive-callback": () => showWidgetBox(box, Boolean(dialog)),
        });
        api.execute(widgetId);
      } catch {
        fail();
      }
    }, fail);
  });
}

/** A fresh single-use token, or undefined when no site key is set or none could be obtained. */
export async function getCaptchaToken(action: string): Promise<string | undefined> {
  const siteKey = getTurnstileSiteKey();
  if (!siteKey) return undefined;
  try {
    return await acquireToken(siteKey, action);
  } catch (error) {
    console.warn("[captcha] no token, continuing without:", (error as Error).message);
    return undefined;
  }
}

// Supabase's own rejection (code `captcha_failed`; message fallback for older servers).
export function isCaptchaRejection(error: unknown): boolean {
  const { code, message } = (error ?? {}) as { code?: string; message?: string };
  return code === "captcha_failed" || /captcha/i.test(message ?? "");
}

/** Announces a Supabase captcha rejection (one toast, see CaptchaErrorToast). True if it was one. */
export function reportCaptchaRejection(error: unknown, onRetry?: () => void): boolean {
  if (!isCaptchaRejection(error)) return false;
  window.dispatchEvent(new CustomEvent(CAPTCHA_FAILED_EVENT, { detail: { onRetry } }));
  return true;
}

// Lets ensureSession callers tell "captcha rejected" from "anonymous auth disabled" (both give null).
let sessionCaptchaRejected = false;
export const wasSessionCaptchaRejected = () => sessionCaptchaRejected;
export const setSessionCaptchaRejected = (value: boolean) => {
  sessionCaptchaRejected = value;
};
