export type CircleShareInput = {
  title: string;
  /** The whole message, circle link included (WhatsApp and the clipboard). */
  text: string;
  url: string;
  /** The message without the link, for the native sheet, which gets the link as its own field (no duplicate). */
  nativeText: string;
};

export type CircleShareKind = "open" | "completed" | "closed";

/** Nothing to take in a full or archived circle, so its message invites to follow, not to claim. */
export function shareKindForStatus(status: "open" | "full" | "completed" | "archived"): CircleShareKind {
  return status === "open" ? "open" : status === "completed" ? "completed" : "closed";
}

/** First strong isolate / pop: keeps a name in another script from reordering the words around it. Invisible. */
const FSI = "\u2068";
const PDI = "\u2069";

const BIDI_CONTROLS = /[\u202A-\u202E\u2066-\u2069]/g;

/** User text can carry its own bidi controls; strip them so they cannot unbalance ours. */
export function isolateName(name: string) {
  return `${FSI}${name.replace(BIDI_CONTROLS, "").trim()}${PDI}`;
}

type ShareTextTranslator = (key: CircleShareKind, values: { name: string; link: string }) => string;

/**
 * The one builder for every circle share (circle menu and completion moment): salaam-led for an
 * open khatm, alhamdulillah for a finished one, the user's name isolated, the link last.
 */
export function buildCircleShare(
  t: ShareTextTranslator,
  { kind, name, url }: { kind: CircleShareKind; name: string; url: string }
): CircleShareInput & { whatsAppUrl: string } {
  const isolated = isolateName(name);
  const text = t(kind, { name: isolated, link: url });
  const nativeText = t(kind, { name: isolated, link: "" }).trim();
  return { title: name, text, url, nativeText, whatsAppUrl: buildWhatsAppShareUrl(text) };
}

/** wa.me link with the finished message prefilled. */
export function buildWhatsAppShareUrl(text: string) {
  return `https://wa.me/?text=${encodeURIComponent(text)}`;
}

export function canNativeShare(navigatorRef: { share?: unknown } | null = typeof navigator === "undefined" ? null : navigator) {
  return typeof navigatorRef?.share === "function";
}

type ShareNavigator = {
  share?: (payload: { title: string; text: string; url: string }) => Promise<void>;
  clipboard?: {
    writeText: (text: string) => Promise<void>;
  };
};

type ShareNavigatorOptions = {
  navigatorRef?: ShareNavigator | null;
};

export type ShareCircleInviteResult =
  | "shared"
  | "copied"
  | "cancelled"
  | "failed";

function isAbortError(error: unknown) {
  return (
    typeof error === "object" &&
    error !== null &&
    "name" in error &&
    error.name === "AbortError"
  );
}

function resolveNavigator(
  navigatorRef: ShareNavigatorOptions["navigatorRef"]
): ShareNavigator | null {
  if (navigatorRef !== undefined) return navigatorRef;
  if (typeof navigator === "undefined") return null;
  return navigator;
}

export async function shareCircleInvite(
  input: CircleShareInput,
  options: ShareNavigatorOptions = {}
): Promise<ShareCircleInviteResult> {
  const navigatorRef = resolveNavigator(options.navigatorRef);
  if (!navigatorRef) return "failed";

  if (typeof navigatorRef.share === "function") {
    try {
      await navigatorRef.share({
        title: input.title,
        text: input.nativeText,
        url: input.url,
      });
      return "shared";
    } catch (error) {
      return isAbortError(error) ? "cancelled" : "failed";
    }
  }

  try {
    if (!navigatorRef.clipboard || typeof navigatorRef.clipboard.writeText !== "function") {
      throw new Error("Clipboard API unavailable");
    }
    await navigatorRef.clipboard.writeText(input.text);
    return "copied";
  } catch {
    return "failed";
  }
}

export async function copyCircleLink(
  url: string,
  options: ShareNavigatorOptions = {}
): Promise<"copied" | "failed"> {
  const navigatorRef = resolveNavigator(options.navigatorRef);

  try {
    if (!navigatorRef?.clipboard || typeof navigatorRef.clipboard.writeText !== "function") {
      throw new Error("Clipboard API unavailable");
    }
    await navigatorRef.clipboard.writeText(url);
    return "copied";
  } catch {
    return "failed";
  }
}
