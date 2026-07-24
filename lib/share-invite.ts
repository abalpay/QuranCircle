export type CircleShareInput = {
  title: string;
  text: string;
  url: string;
};

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

function buildClipboardInvite(input: CircleShareInput) {
  return `${input.text}\n${input.url}`;
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
        text: input.text,
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
    await navigatorRef.clipboard.writeText(buildClipboardInvite(input));
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
