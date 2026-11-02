import { act, renderHook, waitFor } from "@testing-library/react";
import type { ReactNode } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const { getCaptchaToken, mockCreateClient } = vi.hoisted(() => ({
  getCaptchaToken: vi.fn(),
  mockCreateClient: vi.fn(),
}));

vi.mock("@/lib/captcha", () => ({ getCaptchaToken }));
vi.mock("@/lib/supabase/client", () => ({ createClient: () => mockCreateClient() }));
vi.mock("@/lib/supabase/auth-urls", () => ({ getAuthCallbackUrl: () => "https://example.com/cb" }));

import { AuthProvider, useAuth } from "@/hooks/use-auth";

function setup() {
  const auth = {
    getSession: vi.fn().mockResolvedValue({ data: { session: null } }),
    getUser: vi.fn().mockResolvedValue({ data: { user: null } }),
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

describe("useAuth captcha tokens", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response(JSON.stringify({ prepared: true, status: "no_pending_merge" }))));
    getCaptchaToken.mockImplementation(async (action: string) => `tok-${action}`);
  });

  it("passes a token to signInAnonymously", async () => {
    const { auth, hook } = setup();
    await waitFor(() => expect(hook.result.current.sessionReady).toBe(true));
    await act(async () => void (await hook.result.current.ensureSession()));
    expect(auth.signInAnonymously).toHaveBeenCalledWith({ options: { captchaToken: "tok-anon_signin" } });
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
    expect(auth.signUp).toHaveBeenCalledWith(
      expect.objectContaining({ options: expect.objectContaining({ captchaToken: "tok-signup" }) }),
    );

    await hook.result.current.resetPassword("u@example.com");
    expect(auth.resetPasswordForEmail).toHaveBeenCalledWith("u@example.com", {
      redirectTo: "https://example.com/cb",
      captchaToken: "tok-reset",
    });
  });

  it("sends no token when captcha is not configured", async () => {
    getCaptchaToken.mockResolvedValue(undefined);
    const { auth, hook } = setup();
    await waitFor(() => expect(hook.result.current.sessionReady).toBe(true));
    await act(async () => void (await hook.result.current.ensureSession()));
    expect(auth.signInAnonymously).toHaveBeenCalledWith(undefined);
    await hook.result.current.signInWithPassword("u@example.com", "Password!1");
    expect(auth.signInWithPassword).toHaveBeenCalledWith({ email: "u@example.com", password: "Password!1" });
  });

  it("does not call Supabase when the captcha check fails", async () => {
    getCaptchaToken.mockRejectedValue(new Error("Captcha check failed"));
    const { auth, hook } = setup();
    await waitFor(() => expect(hook.result.current.sessionReady).toBe(true));

    let ensured: unknown = "unset";
    await act(async () => {
      ensured = await hook.result.current.ensureSession();
    });
    expect(ensured).toBeNull();
    expect(auth.signInAnonymously).not.toHaveBeenCalled();

    const result = await hook.result.current.signInWithPassword("u@example.com", "Password!1");
    expect(result.error?.message).toBe("Captcha check failed");
    expect(auth.signInWithPassword).not.toHaveBeenCalled();
  });
});
