const LOCAL_DEV_URL = "http://localhost:3001";

function trimTrailingSlash(url: string) {
  return url.endsWith("/") ? url.slice(0, -1) : url;
}

export function getSiteUrl() {
  const envUrl = process.env.NEXT_PUBLIC_SITE_URL?.trim();
  if (envUrl) {
    return trimTrailingSlash(envUrl);
  }

  if (typeof window !== "undefined") {
    return trimTrailingSlash(window.location.origin);
  }

  return LOCAL_DEV_URL;
}

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
