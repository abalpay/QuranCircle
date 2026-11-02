import { NextRequest, NextResponse } from "next/server";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { proxy } from "../../proxy";

const proxyMocks = vi.hoisted(() => ({
  updateSession: vi.fn(),
}));

vi.mock("@/lib/supabase/proxy", () => ({
  updateSession: proxyMocks.updateSession,
}));

describe("application proxy security headers", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.NEXT_PUBLIC_SUPABASE_URL = "https://project-ref.supabase.co";
    proxyMocks.updateSession.mockResolvedValue(NextResponse.next());
  });

  it("forwards a unique nonce and enforces a strict CSP", async () => {
    const request = new NextRequest("https://qurancircle.test/browse");

    const response = await proxy(request);
    const forwardedHeaders = proxyMocks.updateSession.mock.calls[0]?.[1] as
      | Headers
      | undefined;
    const nonce = forwardedHeaders?.get("x-nonce");
    const requestCsp = forwardedHeaders?.get("Content-Security-Policy");

    expect(nonce).toBeTruthy();
    expect(requestCsp).toContain(`'nonce-${nonce}'`);
    expect(requestCsp).toContain("'strict-dynamic'");
    expect(requestCsp).toContain("https://project-ref.supabase.co");
    expect(requestCsp).toContain("wss://project-ref.supabase.co");
    expect(requestCsp).not.toContain("'unsafe-eval'");
    expect(response.headers.get("Content-Security-Policy")).toBe(requestCsp);
  });

  describe("Turnstile CSP", () => {
    afterEach(() => vi.unstubAllEnvs());

    async function cspFor(siteKey: string | undefined) {
      vi.stubEnv("NEXT_PUBLIC_TURNSTILE_SITE_KEY", siteKey);
      const response = await proxy(new NextRequest("https://qurancircle.test/browse"));
      return response.headers.get("Content-Security-Policy") ?? "";
    }

    it("is unchanged when no site key is set", async () => {
      const csp = await cspFor(undefined);
      expect(csp).not.toContain("challenges.cloudflare.com");
      expect(csp).not.toContain("frame-src");
    });

    it("allows Turnstile only in script-src and frame-src when a site key is set", async () => {
      const csp = await cspFor("1x00000000000000000000AA");
      const directives = csp.split(";").map((d) => d.trim());
      const withCloudflare = directives.filter((d) => d.includes("https://challenges.cloudflare.com"));
      expect(withCloudflare.map((d) => d.split(" ")[0]).sort()).toEqual(["frame-src", "script-src"]);
      expect(csp).toContain("frame-src 'self' https://challenges.cloudflare.com;");
      expect(csp).toContain("'strict-dynamic'");
      expect(csp).toContain("default-src 'self';");
      expect(csp).not.toContain("'unsafe-inline' https://challenges");
    });
  });

  it("forwards viewport diagnostics only for the explicit query opt-in", async () => {
    const enabledRequest = new NextRequest(
      "https://qurancircle.test/browse?viewportDebug=1"
    );
    await proxy(enabledRequest);

    const enabledHeaders = proxyMocks.updateSession.mock.calls[0]?.[1] as Headers;
    expect(enabledHeaders.get("x-qurancircle-viewport-debug")).toBe("1");

    proxyMocks.updateSession.mockClear();
    const disabledRequest = new NextRequest("https://qurancircle.test/browse", {
      headers: {
        "x-qurancircle-viewport-debug": "1",
      },
    });
    await proxy(disabledRequest);

    const disabledHeaders = proxyMocks.updateSession.mock.calls[0]?.[1] as Headers;
    expect(disabledHeaders.has("x-qurancircle-viewport-debug")).toBe(false);
  });
});
