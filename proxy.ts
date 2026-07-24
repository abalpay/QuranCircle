import { NextRequest } from "next/server";
import createMiddleware from "next-intl/middleware";
import { updateSession } from "@/lib/supabase/proxy";
import { routing } from "@/i18n/routing";

const handleI18nRouting = createMiddleware(routing);

function getSupabaseConnectSources() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
  if (!supabaseUrl) return "";

  try {
    const origin = new URL(supabaseUrl).origin;
    const realtimeOrigin = origin.replace(/^http/, "ws");
    return `${origin} ${realtimeOrigin}`;
  } catch {
    return "";
  }
}

function buildContentSecurityPolicy(nonce: string) {
  const isDevelopment = process.env.NODE_ENV === "development";
  const supabaseConnectSources = getSupabaseConnectSources();
  const developmentConnectSources = isDevelopment ? " http: https: ws: wss:" : "";

  return `
    default-src 'self';
    script-src 'self' 'nonce-${nonce}' 'strict-dynamic'${isDevelopment ? " 'unsafe-eval'" : ""};
    style-src 'self' 'unsafe-inline';
    img-src 'self' blob: data:;
    font-src 'self' data:;
    connect-src 'self' ${supabaseConnectSources}${developmentConnectSources};
    worker-src 'self' blob:;
    manifest-src 'self';
    object-src 'none';
    base-uri 'self';
    form-action 'self';
    frame-ancestors 'none';
    ${isDevelopment ? "" : "upgrade-insecure-requests;"}
  `
    .replace(/\s{2,}/g, " ")
    .trim();
}

export async function proxy(request: NextRequest) {
  const nonce = Buffer.from(crypto.randomUUID()).toString("base64");
  const contentSecurityPolicy = buildContentSecurityPolicy(nonce);
  const requestHeaders = new Headers(request.headers);

  requestHeaders.set("x-nonce", nonce);
  requestHeaders.set("Content-Security-Policy", contentSecurityPolicy);

  const localizedRequest = new NextRequest(request, {
    headers: requestHeaders,
  });
  const i18nResponse = handleI18nRouting(localizedRequest);

  if (!i18nResponse.ok) {
    i18nResponse.headers.set("Content-Security-Policy", contentSecurityPolicy);
    return i18nResponse;
  }

  const response = await updateSession(request, requestHeaders, i18nResponse);
  response.headers.set("Content-Security-Policy", contentSecurityPolicy);

  return response;
}

export const config = {
  matcher: [
    "/((?!api|auth|_next|_vercel|favicon.ico|manifest\\.json|sw\\.js|workbox-.*\\.js|robots.txt|sitemap.xml|.*opengraph-image|.*\\..*).*)",
  ],
};
