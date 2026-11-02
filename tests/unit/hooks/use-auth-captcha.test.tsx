import { act, renderHook, waitFor } from "@testing-library/react";
import type { ReactNode } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { CAPTCHA_FAILED_EVENT, wasSessionCaptchaRejected } from "@/lib/captcha";

const { getCaptchaToken, mockCreateClient } = vi.hoisted(() => ({
  getCaptchaToken: vi.fn(),
  mockCreateClient: vi.fn(),
}));

// Keep the real rejection helpers; only token acquisition is mocked.
vi.mock("@/lib/captcha", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/lib/captcha")>()),
  getCaptchaToken,
}));
vi.mock("@/lib/supabase/client", () => ({ createClient: () => mockCreateClient() }));
vi.mock("@/lib/supabase/auth-urls", () => ({ getAuthCallbackUrl: () => "https://example.com/cb" }));

import { AuthProvider, useAuth } from "@/hooks/use-auth";

const rejection = { code: "captcha_failed", message: "captcha verification process failed" };

function setup(anonymousUser = false) {
  const auth = {
    getSession: vi.fn().mockResolvedValue({ data: { session: null } }),
    getUser: vi.fn().mockResolvedValue({
      data: { user: anonymousUser ? { id: "a", is_anonymous: true } : null },
    }),
    signInAnonymously: vi.fn().mockResolvedValue({ data: { user: { id: "a", is_anonymous: true } }, error: null }),
    signInWithPassword: vi.fn().mockResolvedValue({ data: { session: null }, error: null }),
    signUp: vi.fn().mockResolvedValue({ data: { session: null }, error: null }),
    resetPasswordForEmail: vi.fn().mockResolvedValue({ error: null }),
    onAuthStateChange: vi.fn(() => ({ data: { subscription: { unsubscribe: vi.fn() } } })),
  };
  mockCreateClient.mockReturnValue({ auth });
  const hook = renderHook(() => useAuth(), {
    wrapper: ({ children }: { children: ReactNode }) => <AuthProvider>{children}</AuthProvider>,
  });
  return { auth, hook };
}

describe("useAuth captcha", () => {
  const failed = vi.fn();
  beforeEach(() => {
    vi.clearAllMocks();
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response(JSON.stringify({ prepared: true, status: "no_pending_merge" }))));
    getCaptchaToken.mockImplementation(async (action: string) => `tok-${action}`);
    window.addEventListener(CAPTCHA_FAILED_EVENT, failed);
  });

  it("passes a token to signInAnonymously", async () => {
    const { auth, hook } = setup();
    await waitFor(() => expect(hook.result.current.sessionReady).toBe(true));
    await act(async () => void (await hook.result.current.ensureSession()));
    expect(auth.signInAnonymously).toHaveBeenCalledWith({ options: { captchaToken: "tok-anon_signin" } });
    expect(wasSessionCaptchaRejected()).toBe(false);
  });

  it("passes a token to signInWithPassword, signUp and resetPasswordForEmail", async () => {
    const { auth, hook } = setup();
    await waitFor(() => expect(hook.result.current.sessionReady).toBe(true));

    await hook.result.current.signInWithPassword("u@example.com", "Password!1");
    expect(auth.signInWithPassword).toHaveBeenCalledWith({
      email: "u@example.com",
      password: "Password!1",
      options: { captchaToken: "tok-signin" },
    });

    await hook.result.current.signUp("u@example.com", "Password!1", "u");
    expect(auth.signUp.mock.calls[0][0].options.captchaToken).toBe("tok-signup");

    await hook.result.current.resetPassword("u@example.com");
    expect(auth.resetPasswordForEmail).toHaveBeenCalledWith("u@example.com", {
      redirectTo: "https://example.com/cb",
      captchaToken: "tok-reset",
    });
  });

  it("with no token (key unset or check failed) the payloads carry no captcha fields", async () => {
    getCaptchaToken.mockResolvedValue(undefined);
    const { auth, hook } = setup();
    await waitFor(() => expect(hook.result.current.sessionReady).toBe(true));

    await act(async () => void (await hook.result.current.ensureSession()));
    expect(auth.signInAnonymously).toHaveBeenCalledWith(undefined);

    await hook.result.current.signInWithPassword("u@example.com", "Password!1");
    expect(auth.signInWithPassword.mock.calls[0][0]).toStrictEqual({ email: "u@example.com", password: "Password!1" });

    await hook.result.current.signUp("u@example.com", "Password!1", "u");
    expect(auth.signUp.mock.calls[0][0].options).not.toHaveProperty("captchaToken");

    await hook.result.current.resetPassword("u@example.com");
    expect(auth.resetPasswordForEmail.mock.calls[0][1]).toStrictEqual({ redirectTo: "https://example.com/cb" });
    expect(failed).not.toHaveBeenCalled();
  });

  it("anonymous sign-in rejected by Supabase: one captcha event with a retry, flagged for callers", async () => {
    const { auth, hook } = setup();
    auth.signInAnonymously.mockResolvedValue({ data: { user: null }, error: rejection });
    await waitFor(() => expect(hook.result.current.sessionReady).toBe(true));

    let ensured: unknown = "unset";
    await act(async () => {
      ensured = await hook.result.current.ensureSession();
    });
    expect(ensured).toBeNull();
    expect(wasSessionCaptchaRejected()).toBe(true);
    expect(failed).toHaveBeenCalledTimes(1);

    // retry from the toast signs in again
    auth.signInAnonymously.mockResolvedValue({ data: { user: { id: "a", is_anonymous: true } }, error: null });
    await act(async () => (failed.mock.calls[0][0] as CustomEvent).detail.onRetry());
    await waitFor(() => expect(auth.signInAnonymously).toHaveBeenCalledTimes(2));
    expect(wasSessionCaptchaRejected()).toBe(false);
  });

  it("anonymous auth failing for another reason is not flagged as a captcha rejection", async () => {
    const { auth, hook } = setup();
    auth.signInAnonymously.mockResolvedValue({ data: { user: null }, error: { code: "anonymous_provider_disabled", message: "Anonymous sign-ins are disabled" } });
    await waitFor(() => expect(hook.result.current.sessionReady).toBe(true));
    await act(async () => void (await hook.result.current.ensureSession()));
    expect(wasSessionCaptchaRejected()).toBe(false);
    expect(failed).not.toHaveBeenCalled();
  });

  it("password sign-in rejected by Supabase: returns the error, one captcha event, no merge finalize", async () => {
    const { auth, hook } = setup(true);
    auth.signInWithPassword.mockResolvedValue({ data: { session: null }, error: rejection });
    await waitFor(() => expect(hook.result.current.sessionReady).toBe(true));

    const result = await hook.result.current.signInWithPassword("u@example.com", "Password!1");
    expect(result.error).toBe(rejection);
    expect(failed).toHaveBeenCalledTimes(1);
    expect(vi.mocked(fetch).mock.calls.map((c) => c[0])).not.toContain("/auth/callback");
  });

  it("signUp and reset rejections are announced too", async () => {
    const { auth, hook } = setup();
    auth.signUp.mockResolvedValue({ data: { session: null }, error: rejection });
    auth.resetPasswordForEmail.mockResolvedValue({ error: rejection });
    await waitFor(() => expect(hook.result.current.sessionReady).toBe(true));
    await hook.result.current.signUp("u@example.com", "Password!1", "u");
    await hook.result.current.resetPassword("u@example.com");
    expect(failed).toHaveBeenCalledTimes(2);
  });
});
