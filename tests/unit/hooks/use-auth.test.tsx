import {
  act,
  render,
  waitFor,
} from "@testing-library/react";
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

    let latestAuth: ReturnType<typeof useAuth> | null = null;
    function CaptureAuth() {
      latestAuth = useAuth();
      return null;
    }

    render(
      <AuthProvider>
        <CaptureAuth />
      </AuthProvider>
    );

    await waitFor(() => {
      expect(latestAuth?.sessionReady).toBe(true);
    });

    let ensuredUser: MockUser | null | undefined;
    await act(async () => {
      ensuredUser = (await latestAuth?.ensureSession()) as MockUser | null;
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

    let latestAuth: ReturnType<typeof useAuth> | null = null;
    function CaptureAuth() {
      latestAuth = useAuth();
      return null;
    }

    render(
      <AuthProvider>
        <CaptureAuth />
      </AuthProvider>
    );

    await waitFor(() => {
      expect(latestAuth?.sessionReady).toBe(true);
    });

    const result = await latestAuth?.signInWithPassword(
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

    let latestAuth: ReturnType<typeof useAuth> | null = null;
    function CaptureAuth() {
      latestAuth = useAuth();
      return null;
    }

    render(
      <AuthProvider>
        <CaptureAuth />
      </AuthProvider>
    );

    await waitFor(() => {
      expect(latestAuth?.sessionReady).toBe(true);
    });

    const result = await latestAuth?.signInWithPassword(
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

    let latestAuth: ReturnType<typeof useAuth> | null = null;
    function CaptureAuth() {
      latestAuth = useAuth();
      return null;
    }

    render(
      <AuthProvider>
        <CaptureAuth />
      </AuthProvider>
    );

    await waitFor(() => {
      expect(latestAuth?.sessionReady).toBe(true);
    });

    const result = await latestAuth?.signInWithGoogle();

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

    let latestAuth: ReturnType<typeof useAuth> | null = null;
    function CaptureAuth() {
      latestAuth = useAuth();
      return null;
    }

    render(
      <AuthProvider>
        <CaptureAuth />
      </AuthProvider>
    );

    await waitFor(() => {
      expect(latestAuth?.sessionReady).toBe(true);
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
});
