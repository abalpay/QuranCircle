// Cloudflare Turnstile (D15). The single place the site key is read and the only code that touches
// the widget. NEXT_PUBLIC_* is inlined at build time. Unset => no script, no widget, no token.
export const TURNSTILE_ORIGIN = "https://challenges.cloudflare.com";
export const CAPTCHA_FAILED_EVENT = "quran-circle:captcha-failed";
const ONLOAD_CALLBACK = "__qcTurnstileLoaded";
const TOKEN_TIMEOUT_MS = 60_000;

export function getTurnstileSiteKey(): string | null {
  return process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY?.trim() || null;
}

export class CaptchaError extends Error {
  constructor() {
    super("Captcha check failed");
    this.name = "CaptchaError";
  }
}

export function isCaptchaError(error: unknown): error is CaptchaError {
  return error instanceof CaptchaError;
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

// Created from our nonced bundle, so 'strict-dynamic' trusts it. Loaded on the first token request.
function loadTurnstile(): Promise<TurnstileApi> {
  apiPromise ??= new Promise<TurnstileApi>((resolve, reject) => {
    const script = document.createElement("script");
    const fail = () => {
      apiPromise = null;
      script.remove();
      reject(new CaptchaError());
    };
    window[ONLOAD_CALLBACK] = () =>
      window.turnstile ? resolve(window.turnstile) : fail();
    script.src = `${TURNSTILE_ORIGIN}/turnstile/v0/api.js?render=explicit&onload=${ONLOAD_CALLBACK}`;
    script.async = true;
    script.onerror = fail;
    document.head.appendChild(script);
  });
  return apiPromise;
}

const HIDDEN_STYLE = { position: "fixed", width: "0", height: "0", overflow: "hidden" };

// Shown only when Cloudflare asks for interaction. Inside an open dialog so the dialog's focus
// trap and pointer-events lock do not block it; otherwise pinned to the bottom of the viewport.
function showWidgetBox(box: HTMLElement, insideDialog: boolean) {
  Object.assign(
    box.style,
    insideDialog
      ? { position: "static", width: "auto", height: "auto", overflow: "visible", marginTop: "1rem" }
      : { position: "fixed", width: "auto", height: "auto", overflow: "visible", insetInline: "0", bottom: "1rem", zIndex: "100", pointerEvents: "auto" },
    { display: "flex", justifyContent: "center" },
  );
}

/**
 * Returns a fresh single-use Turnstile token, or undefined when no site key is configured.
 * One widget per call, removed afterwards. On failure it announces CAPTCHA_FAILED_EVENT (the
 * toast lives in CaptchaErrorToast; `onRetry` powers its Retry button) and throws CaptchaError.
 */
export async function getCaptchaToken(
  action: string,
  onRetry?: () => void,
): Promise<string | undefined> {
  const siteKey = getTurnstileSiteKey();
  if (!siteKey) return undefined;

  try {
    const turnstile = await loadTurnstile();
    return await new Promise<string>((resolve, reject) => {
      const dialog = document.querySelector<HTMLElement>(
        '[role="dialog"][data-state="open"], [role="alertdialog"][data-state="open"]',
      );
      const box = document.createElement("div");
      Object.assign(box.style, HIDDEN_STYLE);
      (dialog ?? document.body).appendChild(box);

      let widgetId = "";
      const finish = (settle: () => void) => {
        clearTimeout(timer);
        if (widgetId) turnstile.remove(widgetId);
        box.remove();
        settle();
      };
      const fail = () => finish(() => reject(new CaptchaError()));
      const timer = setTimeout(fail, TOKEN_TIMEOUT_MS);

      widgetId = turnstile.render(box, {
        sitekey: siteKey,
        action,
        language: document.documentElement.lang || "auto",
        execution: "execute",
        appearance: "interaction-only",
        retry: "never",
        callback: (token: string) => finish(() => resolve(token)),
        "error-callback": fail,
        "timeout-callback": fail,
        "before-interactive-callback": () => showWidgetBox(box, Boolean(dialog)),
      });
      turnstile.execute(widgetId);
    });
  } catch (error) {
    window.dispatchEvent(new CustomEvent(CAPTCHA_FAILED_EVENT, { detail: { onRetry } }));
    throw error instanceof CaptchaError ? error : new CaptchaError();
  }
}
