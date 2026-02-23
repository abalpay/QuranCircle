export type CircleShareInput = {
  name: string;
  isPublic: boolean;
  url: string;
};

type ShareNavigator = {
  share?: (payload: { title: string; text: string; url: string }) => Promise<void>;
  clipboard?: {
    writeText: (text: string) => Promise<void>;
  };
};

export type ShareCircleInviteOptions = {
  navigatorRef?: ShareNavigator | null;
  title?: string;
  onCopySuccess?: () => void;
  onCopyError?: () => void;
};

export function buildCircleInviteText({ name, isPublic, url }: CircleShareInput) {
  const intro = isPublic
    ? `Join the "${name}" Khatm circle on QuranCircle.`
    : `You're invited to join the "${name}" Khatm circle on QuranCircle.`;

  return `${intro} Claim a Juz here: ${url}`;
}

function resolveNavigator(
  navigatorRef: ShareCircleInviteOptions["navigatorRef"]
): ShareNavigator | null {
  if (navigatorRef !== undefined) return navigatorRef;
  if (typeof navigator === "undefined") return null;
  return navigator;
}

export async function shareCircleInvite(
  input: CircleShareInput,
  options: ShareCircleInviteOptions = {}
) {
  const text = buildCircleInviteText(input);
  const navigatorRef = resolveNavigator(options.navigatorRef);
  if (!navigatorRef) return;

  if (typeof navigatorRef.share === "function") {
    try {
      await navigatorRef.share({
        title: options.title ?? input.name,
        text,
        url: input.url,
      });
    } catch {
      // User cancellation is expected in native share sheets.
    }
    return;
  }

  try {
    if (!navigatorRef.clipboard || typeof navigatorRef.clipboard.writeText !== "function") {
      throw new Error("Clipboard API unavailable");
    }
    await navigatorRef.clipboard.writeText(text);
    options.onCopySuccess?.();
  } catch {
    options.onCopyError?.();
  }
}
