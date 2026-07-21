import { NextRequest } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { CookieMethodsServer } from "@supabase/ssr";
import { updateSession } from "@/lib/supabase/proxy";

const supabaseMocks = vi.hoisted(() => ({
  createServerClient: vi.fn(),
  getUser: vi.fn(),
  rpc: vi.fn(),
}));

let capturedCookieMethods: CookieMethodsServer | undefined;

vi.mock("@supabase/ssr", () => ({
  createServerClient: supabaseMocks.createServerClient,
}));

function buildRequest(pathname: string, cookie?: string) {
  return new NextRequest(new URL(pathname, "https://quran-circle.test"), {
    headers: cookie ? { cookie } : undefined,
  });
}

describe("updateSession", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.NEXT_PUBLIC_SUPABASE_URL = "https://supabase.test";
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = "anon-key";
    capturedCookieMethods = undefined;
    supabaseMocks.createServerClient.mockImplementation((...args: unknown[]) => {
      const options = args[2] as { cookies: CookieMethodsServer };
      capturedCookieMethods = options.cookies;

      return {
        auth: {
          getUser: supabaseMocks.getUser,
        },
        rpc: supabaseMocks.rpc,
      };
    });
  });

  it("redirects unauthenticated account requests while preserving locale cookie", async () => {
    supabaseMocks.getUser.mockResolvedValue({
      data: { user: null },
    });

    const response = await updateSession(buildRequest("/account"));

    expect(response.status).toBe(307);
    expect(response.headers.get("location")).toBe("https://quran-circle.test/");
    expect(response.cookies.get("NEXT_LOCALE")?.value).toBe("en");
  });

  it("redirects anonymous users away from reset password", async () => {
    supabaseMocks.getUser.mockResolvedValue({
      data: { user: { id: "anon-user", is_anonymous: true } },
    });

    const response = await updateSession(buildRequest("/reset-password"));

    expect(response.status).toBe(307);
    expect(response.headers.get("location")).toBe(
      "https://quran-circle.test/?error=auth"
    );
  });

  it("allows authenticated users through account routes", async () => {
    supabaseMocks.getUser.mockResolvedValue({
      data: { user: { id: "auth-user", is_anonymous: false } },
    });

    const response = await updateSession(buildRequest("/account", "NEXT_LOCALE=tr"));

    expect(response.status).toBe(200);
    expect(response.headers.get("location")).toBeNull();
    expect(response.cookies.get("NEXT_LOCALE")).toBeUndefined();
  });

  it("returns noindex 404 for missing short-code pages", async () => {
    supabaseMocks.getUser.mockResolvedValue({
      data: { user: null },
    });
    supabaseMocks.rpc.mockResolvedValue({
      data: null,
      error: null,
    });

    const response = await updateSession(buildRequest("/s/VALID123"));

    expect(supabaseMocks.rpc).toHaveBeenCalledWith(
      "get_event_snapshot_by_shortcode",
      { p_short_code: "VALID123" }
    );
    expect(response.status).toBe(404);
    expect(response.headers.get("X-Robots-Tag")).toBe("noindex, nofollow");
  });

  it("allows existing short-code pages through", async () => {
    supabaseMocks.getUser.mockResolvedValue({
      data: { user: null },
    });
    supabaseMocks.rpc.mockResolvedValue({
      data: { event: { id: "event-id" } },
      error: null,
    });

    const response = await updateSession(buildRequest("/s/VALID123"));

    expect(response.status).toBe(200);
  });

  it("does not query invalid short-code paths", async () => {
    supabaseMocks.getUser.mockResolvedValue({
      data: { user: null },
    });

    const response = await updateSession(buildRequest("/s/not-valid"));

    expect(response.status).toBe(200);
    expect(supabaseMocks.rpc).not.toHaveBeenCalled();
  });

  it("propagates auth refresh cache headers with refreshed cookies", async () => {
    supabaseMocks.getUser.mockImplementation(async () => {
      capturedCookieMethods?.setAll?.(
        [
          {
            name: "sb-test-auth-token",
            value: "refreshed-token",
            options: { path: "/", httpOnly: true },
          },
        ],
        {
          "Cache-Control":
            "private, no-cache, no-store, must-revalidate, max-age=0",
          Expires: "0",
          Pragma: "no-cache",
        }
      );

      return { data: { user: { id: "auth-user", is_anonymous: false } } };
    });

    const response = await updateSession(buildRequest("/account"));

    expect(response.cookies.get("sb-test-auth-token")?.value).toBe(
      "refreshed-token"
    );
    expect(response.headers.get("Cache-Control")).toBe(
      "private, no-cache, no-store, must-revalidate, max-age=0"
    );
    expect(response.headers.get("Expires")).toBe("0");
    expect(response.headers.get("Pragma")).toBe("no-cache");
    expect(response.cookies.get("NEXT_LOCALE")?.value).toBe("en");
  });

  it("preserves refreshed auth state and cache headers across redirects", async () => {
    supabaseMocks.getUser.mockImplementation(async () => {
      capturedCookieMethods?.setAll?.(
        [
          {
            name: "sb-test-auth-token",
            value: "expired-token",
            options: { path: "/", httpOnly: true },
          },
        ],
        {
          "Cache-Control":
            "private, no-cache, no-store, must-revalidate, max-age=0",
          Expires: "0",
          Pragma: "no-cache",
        }
      );

      return { data: { user: null } };
    });

    const response = await updateSession(buildRequest("/account"));

    expect(response.status).toBe(307);
    expect(response.cookies.get("sb-test-auth-token")?.value).toBe(
      "expired-token"
    );
    expect(response.cookies.get("NEXT_LOCALE")?.value).toBe("en");
    expect(response.headers.get("Cache-Control")).toBe(
      "private, no-cache, no-store, must-revalidate, max-age=0"
    );
    expect(response.headers.get("Expires")).toBe("0");
    expect(response.headers.get("Pragma")).toBe("no-cache");
  });
});
