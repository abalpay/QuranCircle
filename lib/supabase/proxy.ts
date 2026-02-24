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

function getAuthRedirectPath(pathname: string) {
  if (pathname === "/account") return "/";
  if (pathname === "/reset-password") return "/?error=auth";
  return null;
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

export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({
    request,
  });

  // Handle locale cookie
  const locale = request.cookies.get("NEXT_LOCALE")?.value || "en";
  if (!request.cookies.get("NEXT_LOCALE")) {
    supabaseResponse.cookies.set("NEXT_LOCALE", locale, {
      path: "/",
      maxAge: 31536000, // 1 year
      sameSite: "lax",
    });
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim();

  if (!supabaseUrl || !supabaseAnonKey) {
    console.error("[supabase/proxy] missing environment variables", {
      hasUrl: Boolean(supabaseUrl),
      hasAnonKey: Boolean(supabaseAnonKey),
    });
    return supabaseResponse;
  }

  const supabase = createServerClient(
    supabaseUrl,
    supabaseAnonKey,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          );
          supabaseResponse = NextResponse.next({
            request,
          });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  try {
    const {
      data: { user },
    } = await supabase.auth.getUser();

    const authRedirectPath = getAuthRedirectPath(request.nextUrl.pathname);
    if (authRedirectPath && (!user || user.is_anonymous)) {
      const redirectResponse = NextResponse.redirect(
        new URL(authRedirectPath, request.url)
      );
      copyCookies(supabaseResponse, redirectResponse);
      return redirectResponse;
    }

    const shortCode = getShortCodeFromPath(request.nextUrl.pathname);
    if (shortCode) {
      const { data, error } = await supabase.rpc("get_event_snapshot_by_shortcode", {
        p_short_code: shortCode,
      });

      if (!error && !data) {
        const notFoundResponse = new NextResponse("Not Found", {
          status: 404,
          headers: {
            "X-Robots-Tag": "noindex, nofollow",
          },
        });
        copyCookies(supabaseResponse, notFoundResponse);
        return notFoundResponse;
      }
    }
  } catch (error) {
    console.error("[supabase/proxy] auth.getUser failed", error);
  }

  return supabaseResponse;
}
