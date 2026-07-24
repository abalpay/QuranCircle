import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import {
  SHORT_CODE_MAX_LENGTH,
  SHORT_CODE_MIN_LENGTH,
  SHORT_CODE_REGEX,
} from "@/lib/constants/short-code";

function copyCookies(from: NextResponse, to: NextResponse) {
  for (const cookie of from.cookies.getAll()) {
    to.cookies.set(cookie);
  }
}

function copyAuthResponseState(from: NextResponse, to: NextResponse) {
  copyCookies(from, to);

  for (const name of ["Cache-Control", "Expires", "Pragma"]) {
    const value = from.headers.get(name);
    if (value !== null) {
      to.headers.set(name, value);
    }
  }
}

function getAuthRedirectPath(pathname: string) {
  if (pathname === "/account") return "/";
  if (pathname === "/reset-password") return "/?error=auth";
  return null;
}

function getAppPathname(pathname: string) {
  return pathname.replace(/^\/(?:en|tr)(?=\/|$)/, "") || "/";
}

function localizeRedirectPath(pathname: string, requestPathname: string) {
  if (requestPathname !== "/tr" && !requestPathname.startsWith("/tr/")) {
    return pathname;
  }

  if (pathname === "/") return "/tr";
  if (pathname.startsWith("/?")) return `/tr${pathname.slice(1)}`;
  return `/tr${pathname}`;
}

function getShortCodeFromPath(pathname: string) {
  const match = pathname.match(/^\/s\/([^/]+)$/);
  if (!match) return null;

  const shortCode = match[1];
  if (
    shortCode.length < SHORT_CODE_MIN_LENGTH ||
    shortCode.length > SHORT_CODE_MAX_LENGTH ||
    !SHORT_CODE_REGEX.test(shortCode)
  ) {
    return null;
  }

  return shortCode;
}

export async function updateSession(
  request: NextRequest,
  requestHeaders: Headers = request.headers,
  initialResponse?: NextResponse,
) {
  const supabaseResponse =
    initialResponse ??
    NextResponse.next({
      request: {
        headers: requestHeaders,
      },
    });

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim();

  if (!supabaseUrl || !supabaseAnonKey) {
    console.error("[supabase/proxy] missing environment variables", {
      hasUrl: Boolean(supabaseUrl),
      hasAnonKey: Boolean(supabaseAnonKey),
    });
    return supabaseResponse;
  }

  const supabase = createServerClient(supabaseUrl, supabaseAnonKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet, responseHeaders) {
        cookiesToSet.forEach(({ name, value }) =>
          request.cookies.set(name, value),
        );
        cookiesToSet.forEach(({ name, value, options }) =>
          supabaseResponse.cookies.set(name, value, options),
        );
        Object.entries(responseHeaders).forEach(([name, value]) =>
          supabaseResponse.headers.set(name, value),
        );
      },
    },
  });

  try {
    const {
      data: { user },
    } = await supabase.auth.getUser();

    const appPathname = getAppPathname(request.nextUrl.pathname);
    const authRedirectPath = getAuthRedirectPath(appPathname);
    if (authRedirectPath && (!user || user.is_anonymous)) {
      const redirectResponse = NextResponse.redirect(
        new URL(
          localizeRedirectPath(authRedirectPath, request.nextUrl.pathname),
          request.url
        )
      );
      copyAuthResponseState(supabaseResponse, redirectResponse);
      return redirectResponse;
    }

    const shortCode = getShortCodeFromPath(appPathname);
    if (shortCode) {
      const { data, error } = await supabase.rpc(
        "get_event_snapshot_by_shortcode",
        {
          p_short_code: shortCode,
        },
      );

      if (!error && !data) {
        const notFoundResponse = new NextResponse("Not Found", {
          status: 404,
          headers: {
            "X-Robots-Tag": "noindex, nofollow",
          },
        });
        copyAuthResponseState(supabaseResponse, notFoundResponse);
        return notFoundResponse;
      }
    }
  } catch (error) {
    console.error("[supabase/proxy] auth.getUser failed", error);
  }

  return supabaseResponse;
}
