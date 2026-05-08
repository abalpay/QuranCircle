import { NextRequest } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { updateSession } from "@/lib/supabase/proxy";

const supabaseMocks = vi.hoisted(() => ({
  createServerClient: vi.fn(),
  getUser: vi.fn(),
  rpc: vi.fn(),
}));

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
    supabaseMocks.createServerClient.mockReturnValue({
      auth: {
        getUser: supabaseMocks.getUser,
      },
      rpc: supabaseMocks.rpc,
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
});
