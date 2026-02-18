"use client";

import {
  createContext,
  ReactNode,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from "react";
import { createClient } from "@/lib/supabase/client";
import { getAuthCallbackUrl } from "@/lib/supabase/auth-urls";
import type { User } from "@supabase/supabase-js";

const ENABLE_ANONYMOUS_AUTH =
  process.env.NEXT_PUBLIC_ENABLE_ANONYMOUS_AUTH !== "false";
const MERGE_COMPLETE_EVENT = "quran-circle:identity-merged";
const MERGE_RETRY_WINDOW_MS = 20_000;
const MERGE_PREPARATION_BLOCK_MESSAGE =
  "Could not secure claim transfer, retry required.";

type MergeFinalizeStatus =
  | "pending_auth"
  | "merge_retryable_error"
  | "no_pending_merge"
  | "merged"
  | "no_merge_required"
  | "invalid_merge_state";

type AuthContextType = {
  user: User | null;
  isLoading: boolean;
  isAnonymous: boolean;
  isAuthenticatedUser: boolean;
  sessionReady: boolean;
  ensureSession: () => Promise<User | null>;
  signInWithPassword: (email: string, password: string) => Promise<{ error: Error | null }>;
  signUp: (email: string, password: string, username?: string) => Promise<{ error: Error | null }>;
  signInWithGoogle: () => Promise<{ error: Error | null }>;
  signOut: () => Promise<void>;
  resetPassword: (email: string) => Promise<{ error: Error | null }>;
};

export const AuthContext = createContext<AuthContextType | null>(null);

function isAnonymousUser(user: User | null | undefined) {
  return Boolean(user?.is_anonymous);
}

function wait(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function buildMergePreparationError() {
  const error = new Error(MERGE_PREPARATION_BLOCK_MESSAGE);
  error.name = "MergePreparationError";
  return error;
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [sessionReady, setSessionReady] = useState(false);
  const [supabase] = useState(() => createClient());
  const ensureSessionRef = useRef<Promise<User | null> | null>(null);
  const finalizeMergeRef = useRef<Promise<MergeFinalizeStatus | null> | null>(null);

  const emitMergeComplete = useCallback((status: MergeFinalizeStatus) => {
    if (typeof window === "undefined") return;
    if (status === "no_pending_merge") return;

    window.dispatchEvent(
      new CustomEvent(MERGE_COMPLETE_EVENT, {
        detail: { status },
      })
    );
  }, []);

  const prepareAnonymousMergeState = useCallback(async (): Promise<boolean> => {
    const {
      data: { user: currentUser },
    } = await supabase.auth.getUser();

    if (!currentUser || !isAnonymousUser(currentUser)) {
      return true;
    }

    for (let attempt = 0; attempt < 5; attempt++) {
      try {
        const response = await fetch("/api/auth/prepare-merge", {
          method: "POST",
          credentials: "include",
          cache: "no-store",
        });
        if (!response.ok) {
          console.error("[auth] prepare merge state failed:", response.status);
          return false;
        }

        const payload = (await response.json()) as {
          prepared?: boolean;
          reason?: string;
        };
        if (payload.prepared) {
          return true;
        }

        if (process.env.NODE_ENV !== "production") {
          console.warn(
            "[auth] merge state not prepared yet",
            payload.reason ?? "unknown_reason",
            `(attempt ${attempt + 1}/5)`
          );
        }
      } catch (error) {
        console.error("[auth] prepare merge state failed:", error);
        return false;
      }

      await wait(Math.min(250 * 2 ** attempt, 2000));
    }

    console.warn("[auth] merge state cookie was not prepared.");
    return false;
  }, [supabase]);

  const finalizeAnonymousMergeState = useCallback(async () => {
    if (finalizeMergeRef.current) {
      return finalizeMergeRef.current;
    }

    finalizeMergeRef.current = (async () => {
      const start = Date.now();
      let attempt = 0;
      let lastStatus: MergeFinalizeStatus | null = null;

      while (Date.now() - start < MERGE_RETRY_WINDOW_MS) {
        attempt++;
        try {
          const response = await fetch("/auth/callback", {
            method: "POST",
            credentials: "include",
            cache: "no-store",
          });
          if (!response.ok) {
            console.error("[auth] finalize merge state failed:", response.status);
            lastStatus = "merge_retryable_error";
            await wait(Math.min(300 * 2 ** (attempt - 1), 3000));
            continue;
          }

          const payload = (await response.json()) as { status?: MergeFinalizeStatus };
          if (!payload.status) {
            console.warn("[auth] finalize merge state response missing status");
            lastStatus = "merge_retryable_error";
            await wait(Math.min(300 * 2 ** (attempt - 1), 3000));
            continue;
          }

          lastStatus = payload.status;
          if (
            payload.status !== "pending_auth" &&
            payload.status !== "merge_retryable_error"
          ) {
            emitMergeComplete(payload.status);
            return payload.status;
          }
        } catch (error) {
          console.error("[auth] finalize merge state failed:", error);
          lastStatus = "merge_retryable_error";
          await wait(Math.min(300 * 2 ** (attempt - 1), 3000));
          continue;
        }

        await wait(Math.min(300 * 2 ** (attempt - 1), 3000));
      }

      if (
        lastStatus === "pending_auth" ||
        lastStatus === "merge_retryable_error"
      ) {
        console.warn("[auth] merge finalize timed out before terminal state", {
          lastStatus,
        });
      }
      return lastStatus;
    })();

    try {
      return await finalizeMergeRef.current;
    } finally {
      finalizeMergeRef.current = null;
    }
  }, [emitMergeComplete]);

  const ensureSession = useCallback(async (): Promise<User | null> => {
    if (ensureSessionRef.current) {
      return ensureSessionRef.current;
    }

    ensureSessionRef.current = (async () => {
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (session?.user) {
        setUser(session.user);
        if (!isAnonymousUser(session.user)) {
          void finalizeAnonymousMergeState();
        }
        return session.user;
      }

      if (!ENABLE_ANONYMOUS_AUTH) {
        setUser(null);
        return null;
      }

      const { data, error } = await supabase.auth.signInAnonymously();
      if (error) {
        console.error("[auth] signInAnonymously failed:", error.message);
        setUser(null);
        return null;
      }

      const anonUser = data.user ?? null;
      setUser(anonUser);
      return anonUser;
    })();

    try {
      return await ensureSessionRef.current;
    } finally {
      ensureSessionRef.current = null;
      setIsLoading(false);
      setSessionReady(true);
    }
  }, [finalizeAnonymousMergeState, supabase]);

  useEffect(() => {
    let mounted = true;

    (async () => {
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (!mounted) return;
      const initialUser = session?.user ?? null;
      setUser(initialUser);
      setIsLoading(false);
      setSessionReady(true);

      if (initialUser && !isAnonymousUser(initialUser)) {
        void finalizeAnonymousMergeState();
      }
    })();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      const nextUser = session?.user ?? null;
      setUser(nextUser);
      setIsLoading(false);
      setSessionReady(true);

      if (
        nextUser &&
        !isAnonymousUser(nextUser) &&
        (event === "SIGNED_IN" || event === "TOKEN_REFRESHED" || event === "USER_UPDATED")
      ) {
        void finalizeAnonymousMergeState();
      }
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, [finalizeAnonymousMergeState, supabase]);

  const signInWithPassword = async (email: string, password: string) => {
    const prepared = await prepareAnonymousMergeState();
    if (!prepared) {
      return { error: buildMergePreparationError() };
    }

    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (!error) {
      const sessionUser =
        data.session?.user ??
        (await supabase.auth.getSession()).data.session?.user ??
        null;

      if (sessionUser && !isAnonymousUser(sessionUser)) {
        await finalizeAnonymousMergeState();
      }
    }

    return { error: error as Error | null };
  };

  const signUp = async (
    email: string,
    password: string,
    username?: string
  ) => {
    const prepared = await prepareAnonymousMergeState();
    if (!prepared) {
      return { error: buildMergePreparationError() };
    }
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { username: username || email.split("@")[0] },
        emailRedirectTo: getAuthCallbackUrl(),
      },
    });

    if (!error) {
      const sessionUser =
        data.session?.user ??
        (await supabase.auth.getSession()).data.session?.user ??
        null;

      if (sessionUser && !isAnonymousUser(sessionUser)) {
        await finalizeAnonymousMergeState();
      }
    }

    return { error: error as Error | null };
  };

  const signInWithGoogle = async () => {
    const prepared = await prepareAnonymousMergeState();
    if (!prepared) {
      return { error: buildMergePreparationError() };
    }

    const nextPath = `${window.location.pathname}${window.location.search}`;
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: getAuthCallbackUrl(nextPath),
      },
    });
    return { error: error as Error | null };
  };

  const signOut = async () => {
    await supabase.auth.signOut();
    setUser(null);
    setIsLoading(false);
    setSessionReady(true);
  };

  const resetPassword = async (email: string) => {
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: getAuthCallbackUrl("/reset-password"),
    });
    return { error: error as Error | null };
  };

  const isAnonymous = isAnonymousUser(user);
  const isAuthenticatedUser = Boolean(user && !isAnonymous);

  return (
    <AuthContext.Provider
      value={{
        user,
        isLoading,
        isAnonymous,
        isAuthenticatedUser,
        sessionReady,
        ensureSession,
        signInWithPassword,
        signUp,
        signInWithGoogle,
        signOut,
        resetPassword,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
