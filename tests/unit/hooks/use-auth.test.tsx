import {
  act,
  renderHook,
  waitFor,
} from "@testing-library/react";
import type { ReactNode } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mockCreateClient = vi.fn();
const mockGetAuthCallbackUrl = vi.fn(
  (nextPath?: string) =>
    `https://example.com/auth/callback${
      nextPath ? `?next=${encodeURIComponent(nextPath)}` : ""
    }`
);

vi.mock("@/lib/supabase/client", () => ({
  createClient: () => mockCreateClient(),
}));

vi.mock("@/lib/supabase/auth-urls", () => ({
  getAuthCallbackUrl: (nextPath?: string) => mockGetAuthCallbackUrl(nextPath),
}));

import { AuthProvider, useAuth } from "@/hooks/use-auth";

type MockUser = { id: string; is_anonymous: boolean };

function renderAuthHook() {
  return renderHook(() => useAuth(), {
    wrapper: ({ children }: { children: ReactNode }) => (
      <AuthProvider>{children}</AuthProvider>
    ),
  });
}

let authStateChangeHandler:
  | ((event: string, session: { user: MockUser } | null) => void)
  | null = null;

function buildJsonResponse(
  body: Record<string, unknown>,
  init?: Omit<ResponseInit, "headers">
) {
  return new Response(JSON.stringify(body), {
    status: init?.status ?? 200,
    headers: { "Content-Type": "application/json" },
  });
}

function createSupabaseMock(options?: {
  initialSessionUser?: MockUser | null;
  getUserUser?: MockUser | null;
  signInAnonymouslyUser?: MockUser | null;
  signInWithPasswordUser?: MockUser | null;
}) {
  const initialSessionUser = options?.initialSessionUser ?? null;
  const getUserUser = options?.getUserUser ?? null;
  const signInAnonymouslyUser =
    options?.signInAnonymouslyUser ??
    ({
      id: "anon-user",
      is_anonymous: true,
    } as const);
  const signInWithPasswordUser = options?.signInWithPasswordUser ?? null;

  const getSession = vi.fn().mockResolvedValue({
    data: {
      session: initialSessionUser ? { user: initialSessionUser } : null,
    },
  });
  const getUser = vi.fn().mockResolvedValue({
    data: {
      user: getUserUser,
    },
  });
  const signInAnonymously = vi.fn().mockResolvedValue({
    data: { user: signInAnonymouslyUser },
    error: null,
  });
  const signInWithPassword = vi.fn().mockResolvedValue({
    data: {
      session: signInWithPasswordUser ? { user: signInWithPasswordUser } : null,
    },
    error: null,
  });
  const signUp = vi.fn().mockResolvedValue({
    data: {
      session: null,
    },
    error: null,
  });
  const signInWithOAuth = vi.fn().mockResolvedValue({ error: null });
  const signOut = vi.fn().mockResolvedValue({ error: null });
  const resetPasswordForEmail = vi.fn().mockResolvedValue({ error: null });
  const onAuthStateChange = vi.fn((callback) => {
    authStateChangeHandler = callback;
    return {
      data: {
        subscription: {
          unsubscribe: vi.fn(),
        },
      },
    };
  });

  const supabase = {
    auth: {
      getSession,
      getUser,
      signInAnonymously,
      signInWithPassword,
      signUp,
      signInWithOAuth,
      signOut,
      resetPasswordForEmail,
      onAuthStateChange,
    },
  };

  return {
    supabase,
    getSession,
    getUser,
    signInAnonymously,
    signInWithPassword,
    signInWithOAuth,
  };
}

describe("useAuth", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.useRealTimers();
    process.env.NEXT_PUBLIC_ENABLE_ANONYMOUS_AUTH = "true";
    authStateChangeHandler = null;
    vi.stubGlobal("fetch", vi.fn());
    window.history.replaceState({}, "", "/");
  });

  it("bootstraps anonymous session through ensureSession", async () => {
    const { supabase, signInAnonymously } = createSupabaseMock();
    mockCreateClient.mockReturnValue(supabase);

    const auth = renderAuthHook();

    await waitFor(() => {
      expect(auth.result.current.sessionReady).toBe(true);
    });

    let ensuredUser: MockUser | null | undefined;
    await act(async () => {
      ensuredUser = (await auth.result.current.ensureSession()) as MockUser | null;
    });

    expect(ensuredUser).toEqual({
      id: "anon-user",
      is_anonymous: true,
    });
    expect(signInAnonymously).toHaveBeenCalledTimes(1);
  });

  it("returns MergePreparationError when merge prep endpoint fails", async () => {
    const { supabase, signInWithPassword } = createSupabaseMock({
      getUserUser: { id: "anon-user", is_anonymous: true },
    });
    mockCreateClient.mockReturnValue(supabase);
    vi.mocked(fetch).mockResolvedValueOnce(
      buildJsonResponse({ prepared: false }, { status: 500 })
    );

    const auth = renderAuthHook();

    await waitFor(() => {
      expect(auth.result.current.sessionReady).toBe(true);
    });

    const result = await auth.result.current.signInWithPassword(
      "user@example.com",
      "Password!123"
    );

    expect(result?.error?.name).toBe("MergePreparationError");
    expect(signInWithPassword).not.toHaveBeenCalled();
    expect(fetch).toHaveBeenCalledWith("/api/auth/prepare-merge", {
      method: "POST",
      credentials: "include",
      cache: "no-store",
    });
  });

  it("signInWithPassword finalizes merge state for authenticated sessions", async () => {
    const { supabase, signInWithPassword } = createSupabaseMock({
      getUserUser: { id: "anon-user", is_anonymous: true },
      signInWithPasswordUser: { id: "auth-user", is_anonymous: false },
    });
    mockCreateClient.mockReturnValue(supabase);
    vi.mocked(fetch)
      .mockResolvedValueOnce(buildJsonResponse({ prepared: true }))
      .mockResolvedValueOnce(buildJsonResponse({ status: "merged" }));

    const auth = renderAuthHook();

    await waitFor(() => {
      expect(auth.result.current.sessionReady).toBe(true);
    });

    const result = await auth.result.current.signInWithPassword(
      "user@example.com",
      "Password!123"
    );

    expect(result?.error).toBeNull();
    expect(signInWithPassword).toHaveBeenCalledWith({
      email: "user@example.com",
      password: "Password!123",
    });
    expect(fetch).toHaveBeenNthCalledWith(1, "/api/auth/prepare-merge", {
      method: "POST",
      credentials: "include",
      cache: "no-store",
    });
    expect(fetch).toHaveBeenNthCalledWith(2, "/auth/callback", {
      method: "POST",
      credentials: "include",
      cache: "no-store",
    });
  });

  it("signInWithGoogle forwards current path through callback redirect", async () => {
    const { supabase, signInWithOAuth } = createSupabaseMock({
      getUserUser: { id: "anon-user", is_anonymous: true },
    });
    mockCreateClient.mockReturnValue(supabase);
    vi.mocked(fetch).mockResolvedValueOnce(buildJsonResponse({ prepared: true }));

    window.history.replaceState({}, "", "/s/E2ESMOKE1?filter=mine");

    const auth = renderAuthHook();

    await waitFor(() => {
      expect(auth.result.current.sessionReady).toBe(true);
    });

    const result = await auth.result.current.signInWithGoogle();

    expect(result?.error).toBeNull();
    expect(mockGetAuthCallbackUrl).toHaveBeenCalledWith("/s/E2ESMOKE1?filter=mine");
    expect(signInWithOAuth).toHaveBeenCalledWith({
      provider: "google",
      options: {
        redirectTo:
          "https://example.com/auth/callback?next=%2Fs%2FE2ESMOKE1%3Ffilter%3Dmine",
      },
    });
  });

  it("retries merge finalization after pending_auth auth-state callback", async () => {
    const { supabase } = createSupabaseMock({
      initialSessionUser: null,
    });
    mockCreateClient.mockReturnValue(supabase);
    vi.mocked(fetch)
      .mockResolvedValueOnce(buildJsonResponse({ status: "pending_auth" }))
      .mockResolvedValueOnce(buildJsonResponse({ status: "merged" }));

    const mergedListener = vi.fn();
    window.addEventListener("quran-circle:identity-merged", mergedListener as EventListener);

    const auth = renderAuthHook();

    await waitFor(() => {
      expect(auth.result.current.sessionReady).toBe(true);
    });

    vi.useFakeTimers();

    act(() => {
      authStateChangeHandler?.("SIGNED_IN", {
        user: { id: "auth-user", is_anonymous: false },
      });
    });

    await vi.advanceTimersByTimeAsync(350);
    await Promise.resolve();

    expect(fetch).toHaveBeenCalledTimes(2);
    expect(fetch).toHaveBeenNthCalledWith(1, "/auth/callback", {
      method: "POST",
      credentials: "include",
      cache: "no-store",
    });
    expect(fetch).toHaveBeenNthCalledWith(2, "/auth/callback", {
      method: "POST",
      credentials: "include",
      cache: "no-store",
    });
    expect(mergedListener).toHaveBeenCalledTimes(1);

    window.removeEventListener(
      "quran-circle:identity-merged",
      mergedListener as EventListener
    );
    vi.useRealTimers();
  });

  it("retries finalize when fetch returns non-ok and eventually succeeds", async () => {
    const { supabase } = createSupabaseMock({ initialSessionUser: null });
    mockCreateClient.mockReturnValue(supabase);
    vi.mocked(fetch)
      .mockResolvedValueOnce(buildJsonResponse({}, { status: 500 }))
      .mockResolvedValueOnce(buildJsonResponse({ status: "merged" }));

    const auth = renderAuthHook();

    await waitFor(() => {
      expect(auth.result.current.sessionReady).toBe(true);
    });

    vi.useFakeTimers();

    act(() => {
      authStateChangeHandler?.("SIGNED_IN", {
        user: { id: "auth-user", is_anonymous: false },
      });
    });

    await vi.advanceTimersByTimeAsync(400);
    await Promise.resolve();

    expect(fetch).toHaveBeenCalledTimes(2);
    vi.useRealTimers();
  });

  it("retries finalize when response is missing status field", async () => {
    const { supabase } = createSupabaseMock({ initialSessionUser: null });
    mockCreateClient.mockReturnValue(supabase);
    vi.mocked(fetch)
      .mockResolvedValueOnce(buildJsonResponse({ unexpected: true }))
      .mockResolvedValueOnce(buildJsonResponse({ status: "no_merge_required" }));

    const mergedListener = vi.fn();
    window.addEventListener("quran-circle:identity-merged", mergedListener as EventListener);

    const auth = renderAuthHook();

    await waitFor(() => {
      expect(auth.result.current.sessionReady).toBe(true);
    });

    vi.useFakeTimers();

    act(() => {
      authStateChangeHandler?.("SIGNED_IN", {
        user: { id: "auth-user", is_anonymous: false },
      });
    });

    await vi.advanceTimersByTimeAsync(400);
    await Promise.resolve();

    expect(fetch).toHaveBeenCalledTimes(2);
    expect(mergedListener).toHaveBeenCalledTimes(1);

    window.removeEventListener("quran-circle:identity-merged", mergedListener as EventListener);
    vi.useRealTimers();
  });

  it("retries finalize when fetch throws and eventually succeeds", async () => {
    const { supabase } = createSupabaseMock({ initialSessionUser: null });
    mockCreateClient.mockReturnValue(supabase);
    vi.mocked(fetch)
      .mockRejectedValueOnce(new Error("network error"))
      .mockResolvedValueOnce(buildJsonResponse({ status: "merged" }));

    const auth = renderAuthHook();

    await waitFor(() => {
      expect(auth.result.current.sessionReady).toBe(true);
    });

    vi.useFakeTimers();

    act(() => {
      authStateChangeHandler?.("SIGNED_IN", {
        user: { id: "auth-user", is_anonymous: false },
      });
    });

    await vi.advanceTimersByTimeAsync(400);
    await Promise.resolve();

    expect(fetch).toHaveBeenCalledTimes(2);
    vi.useRealTimers();
  });

  it("does not emit merge event for no_pending_merge status", async () => {
    const { supabase } = createSupabaseMock({ initialSessionUser: null });
    mockCreateClient.mockReturnValue(supabase);
    vi.mocked(fetch).mockResolvedValueOnce(
      buildJsonResponse({ status: "no_pending_merge" })
    );

    const mergedListener = vi.fn();
    window.addEventListener("quran-circle:identity-merged", mergedListener as EventListener);

    const auth = renderAuthHook();

    await waitFor(() => {
      expect(auth.result.current.sessionReady).toBe(true);
    });

    act(() => {
      authStateChangeHandler?.("SIGNED_IN", {
        user: { id: "auth-user", is_anonymous: false },
      });
    });

    await waitFor(() => {
      expect(fetch).toHaveBeenCalledTimes(1);
    });

    expect(mergedListener).not.toHaveBeenCalled();

    window.removeEventListener("quran-circle:identity-merged", mergedListener as EventListener);
  });

  it("emits merge event for invalid_merge_state status", async () => {
    const { supabase } = createSupabaseMock({ initialSessionUser: null });
    mockCreateClient.mockReturnValue(supabase);
    vi.mocked(fetch).mockResolvedValueOnce(
      buildJsonResponse({ status: "invalid_merge_state" })
    );

    const mergedListener = vi.fn();
    window.addEventListener("quran-circle:identity-merged", mergedListener as EventListener);

    const auth = renderAuthHook();

    await waitFor(() => {
      expect(auth.result.current.sessionReady).toBe(true);
    });

    act(() => {
      authStateChangeHandler?.("SIGNED_IN", {
        user: { id: "auth-user", is_anonymous: false },
      });
    });

    await waitFor(() => {
      expect(fetch).toHaveBeenCalledTimes(1);
    });

    expect(mergedListener).toHaveBeenCalledTimes(1);
    expect(
      (mergedListener.mock.calls[0][0] as CustomEvent).detail.status
    ).toBe("invalid_merge_state");

    window.removeEventListener("quran-circle:identity-merged", mergedListener as EventListener);
  });

  it("returns MergePreparationError when prepare-merge fetch throws", async () => {
    const { supabase, signInWithPassword } = createSupabaseMock({
      getUserUser: { id: "anon-user", is_anonymous: true },
    });
    mockCreateClient.mockReturnValue(supabase);
    vi.mocked(fetch).mockRejectedValueOnce(new Error("network down"));

    const auth = renderAuthHook();

    await waitFor(() => {
      expect(auth.result.current.sessionReady).toBe(true);
    });

    const result = await auth.result.current.signInWithPassword(
      "user@example.com",
      "Password!123"
    );

    expect(result?.error?.name).toBe("MergePreparationError");
    expect(signInWithPassword).not.toHaveBeenCalled();
  });

  it("handles signInAnonymously failure gracefully", async () => {
    const { supabase } = createSupabaseMock();
    supabase.auth.signInAnonymously = vi.fn().mockResolvedValue({
      data: { user: null },
      error: { message: "anon auth disabled" },
    });
    mockCreateClient.mockReturnValue(supabase);

    const auth = renderAuthHook();

    await waitFor(() => {
      expect(auth.result.current.sessionReady).toBe(true);
    });

    let ensuredUser: MockUser | null | undefined;
    await act(async () => {
      ensuredUser = (await auth.result.current.ensureSession()) as MockUser | null;
    });

    expect(ensuredUser).toBeNull();
    expect(supabase.auth.signInAnonymously).toHaveBeenCalledTimes(1);
  });

  it("signUp finalizes merge state for authenticated sessions", async () => {
    const { supabase } = createSupabaseMock({
      getUserUser: { id: "anon-user", is_anonymous: true },
    });
    // Override signUp to return a session with an authenticated user
    supabase.auth.signUp = vi.fn().mockResolvedValue({
      data: {
        session: { user: { id: "new-user", is_anonymous: false } },
      },
      error: null,
    });
    mockCreateClient.mockReturnValue(supabase);
    vi.mocked(fetch)
      .mockResolvedValueOnce(buildJsonResponse({ prepared: true }))
      .mockResolvedValueOnce(buildJsonResponse({ status: "merged" }));

    const auth = renderAuthHook();

    await waitFor(() => {
      expect(auth.result.current.sessionReady).toBe(true);
    });

    const result = await auth.result.current.signUp(
      "user@example.com",
      "Password!123",
      "testuser"
    );

    expect(result?.error).toBeNull();
    expect(supabase.auth.signUp).toHaveBeenCalledWith({
      email: "user@example.com",
      password: "Password!123",
      options: {
        data: { username: "testuser" },
        emailRedirectTo: "https://example.com/auth/callback",
      },
    });
    expect(fetch).toHaveBeenNthCalledWith(1, "/api/auth/prepare-merge", {
      method: "POST",
      credentials: "include",
      cache: "no-store",
    });
    expect(fetch).toHaveBeenNthCalledWith(2, "/auth/callback", {
      method: "POST",
      credentials: "include",
      cache: "no-store",
    });
  });

  it("signOut clears user state", async () => {
    const { supabase } = createSupabaseMock({
      initialSessionUser: { id: "auth-user", is_anonymous: false },
    });
    mockCreateClient.mockReturnValue(supabase);
    vi.mocked(fetch).mockResolvedValueOnce(
      buildJsonResponse({ status: "no_pending_merge" })
    );

    const auth = renderAuthHook();

    await waitFor(() => {
      expect(auth.result.current.sessionReady).toBe(true);
      expect(auth.result.current.user).not.toBeNull();
      expect(fetch).toHaveBeenCalledTimes(1);
    });

    await act(async () => {
      await auth.result.current.signOut();
    });

    expect(auth.result.current.user).toBeNull();
    expect(supabase.auth.signOut).toHaveBeenCalled();
  });

  it("resetPassword calls resetPasswordForEmail with redirect URL", async () => {
    const { supabase } = createSupabaseMock();
    mockCreateClient.mockReturnValue(supabase);

    const auth = renderAuthHook();

    await waitFor(() => {
      expect(auth.result.current.sessionReady).toBe(true);
    });

    const result = await auth.result.current.resetPassword("user@example.com");

    expect(result?.error).toBeNull();
    expect(supabase.auth.resetPasswordForEmail).toHaveBeenCalledWith(
      "user@example.com",
      {
        redirectTo: "https://example.com/auth/callback?next=%2Freset-password",
      }
    );
  });

  it("does not finalize merge for anonymous users on auth state change", async () => {
    const { supabase } = createSupabaseMock({ initialSessionUser: null });
    mockCreateClient.mockReturnValue(supabase);

    const auth = renderAuthHook();

    await waitFor(() => {
      expect(auth.result.current.sessionReady).toBe(true);
    });

    act(() => {
      authStateChangeHandler?.("SIGNED_IN", {
        user: { id: "anon-user", is_anonymous: true },
      });
    });

    // No merge finalization fetch should be triggered for anonymous users
    expect(fetch).not.toHaveBeenCalled();
  });

  it("does not finalize merge for TOKEN_REFRESHED with anonymous user", async () => {
    const { supabase } = createSupabaseMock({ initialSessionUser: null });
    mockCreateClient.mockReturnValue(supabase);

    const auth = renderAuthHook();

    await waitFor(() => {
      expect(auth.result.current.sessionReady).toBe(true);
    });

    act(() => {
      authStateChangeHandler?.("TOKEN_REFRESHED", {
        user: { id: "anon-user", is_anonymous: true },
      });
    });

    expect(fetch).not.toHaveBeenCalled();
  });

  it("retries finalize on merge_retryable_error then reaches terminal state", async () => {
    const { supabase } = createSupabaseMock({ initialSessionUser: null });
    mockCreateClient.mockReturnValue(supabase);
    vi.mocked(fetch)
      .mockResolvedValueOnce(buildJsonResponse({ status: "merge_retryable_error" }))
      .mockResolvedValueOnce(buildJsonResponse({ status: "merged" }));

    const mergedListener = vi.fn();
    window.addEventListener("quran-circle:identity-merged", mergedListener as EventListener);

    const auth = renderAuthHook();

    await waitFor(() => {
      expect(auth.result.current.sessionReady).toBe(true);
    });

    vi.useFakeTimers();

    act(() => {
      authStateChangeHandler?.("SIGNED_IN", {
        user: { id: "auth-user", is_anonymous: false },
      });
    });

    await vi.advanceTimersByTimeAsync(400);
    await Promise.resolve();

    expect(fetch).toHaveBeenCalledTimes(2);
    expect(mergedListener).toHaveBeenCalledTimes(1);

    window.removeEventListener("quran-circle:identity-merged", mergedListener as EventListener);
    vi.useRealTimers();
  });

  it("skips merge prep when user is not anonymous", async () => {
    const { supabase, signInWithPassword } = createSupabaseMock({
      getUserUser: { id: "auth-user", is_anonymous: false },
      signInWithPasswordUser: { id: "auth-user", is_anonymous: false },
    });
    mockCreateClient.mockReturnValue(supabase);
    // Each call to fetch needs a fresh Response (body can only be read once)
    vi.mocked(fetch).mockImplementation(() =>
      Promise.resolve(buildJsonResponse({ status: "no_pending_merge" }))
    );

    const auth = renderAuthHook();

    await waitFor(() => {
      expect(auth.result.current.sessionReady).toBe(true);
    });

    const result = await auth.result.current.signInWithPassword(
      "user@example.com",
      "Password!123"
    );

    expect(result?.error).toBeNull();
    expect(signInWithPassword).toHaveBeenCalled();
    // prepare-merge should not have been called since user is not anonymous
    expect(fetch).not.toHaveBeenCalledWith("/api/auth/prepare-merge", expect.anything());
  });

  it("uses email prefix as default username when signUp username is omitted", async () => {
    const { supabase } = createSupabaseMock({
      getUserUser: { id: "anon-user", is_anonymous: true },
    });
    supabase.auth.signUp = vi.fn().mockResolvedValue({
      data: { session: null },
      error: null,
    });
    mockCreateClient.mockReturnValue(supabase);
    vi.mocked(fetch).mockResolvedValueOnce(buildJsonResponse({ prepared: true }));

    const auth = renderAuthHook();

    await waitFor(() => {
      expect(auth.result.current.sessionReady).toBe(true);
    });

    await auth.result.current.signUp("john@example.com", "Password!123");

    expect(supabase.auth.signUp).toHaveBeenCalledWith({
      email: "john@example.com",
      password: "Password!123",
      options: {
        data: { username: "john" },
        emailRedirectTo: "https://example.com/auth/callback",
      },
    });
  });
});
