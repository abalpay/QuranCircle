import { NextRequest, NextResponse } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";
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
