function trimTrailingSlash(url: string) {
  return url.endsWith("/") ? url.slice(0, -1) : url;
}

function normalizeSiteUrl(url: string) {
  const normalized = trimTrailingSlash(url);
  try {
    const parsed = new URL(normalized);
    if (parsed.hostname === "qurancircle.io") {
      parsed.hostname = "www.qurancircle.io";
    }
    return trimTrailingSlash(parsed.origin);
  } catch {
    return normalized;
  }
}

export function getSiteUrl() {
  const envUrl = process.env.NEXT_PUBLIC_SITE_URL?.trim();
  if (envUrl) {
    return normalizeSiteUrl(envUrl);
  }

  if (process.env.VERCEL_URL) {
    return normalizeSiteUrl(`https://${trimTrailingSlash(process.env.VERCEL_URL)}`);
  }

  if (typeof window !== "undefined") {
    return normalizeSiteUrl(window.location.origin);
  }

  if (process.env.NODE_ENV === "production") {
    throw new Error(
      "NEXT_PUBLIC_SITE_URL is required in production. Set it in your environment variables."
    );
  }

  return "http://localhost:3001";
}

export function toAbsoluteUrl(pathname: string) {
  const normalizedPath = pathname.startsWith("/") ? pathname : `/${pathname}`;
  return new URL(normalizedPath, `${getSiteUrl()}/`).toString();
}
