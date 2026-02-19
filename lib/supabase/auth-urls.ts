import { getSiteUrl } from "@/lib/site-url";

export function getSafeNextPath(nextPath?: string) {
  if (!nextPath || !nextPath.startsWith("/") || nextPath.startsWith("//")) {
    return "/";
  }

  return nextPath;
}

export function getAuthCallbackUrl(nextPath?: string) {
  const callbackUrl = new URL("/auth/callback", `${getSiteUrl()}/`);
  const safeNextPath = getSafeNextPath(nextPath);

  if (safeNextPath !== "/") {
    callbackUrl.searchParams.set("next", safeNextPath);
  }

  return callbackUrl.toString();
}
