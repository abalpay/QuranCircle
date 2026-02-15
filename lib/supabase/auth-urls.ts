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

  if (process.env.NODE_ENV === "production") {
    throw new Error(
      "NEXT_PUBLIC_SITE_URL is required in production. Set it in your environment variables."
    );
  }

  // Dev-only fallback
  return "http://localhost:3001";
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
