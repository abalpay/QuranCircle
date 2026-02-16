"use client";

import {
  createContext,
  ReactNode,
  useContext,
  useEffect,
  useState,
} from "react";
import { createClient } from "@/lib/supabase/client";
import { getAuthCallbackUrl } from "@/lib/supabase/auth-urls";
import type { User } from "@supabase/supabase-js";

type AuthContextType = {
  user: User | null;
  isLoading: boolean;
  signInWithPassword: (email: string, password: string) => Promise<{ error: Error | null }>;
  signUp: (email: string, password: string, username?: string) => Promise<{ error: Error | null }>;
  signInWithGoogle: () => Promise<{ error: Error | null }>;
  signOut: () => Promise<void>;
  resetPassword: (email: string) => Promise<{ error: Error | null }>;
};

export const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const supabase = createClient();

  useEffect(() => {
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
      setIsLoading(false);
    });

    supabase.auth.getUser().then(({ data: { user } }) => {
      setUser(user ?? null);
      setIsLoading(false);
    });

    return () => subscription.unsubscribe();
  }, [supabase.auth]);

  const signInWithPassword = async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    return { error: error as Error | null };
  };

  const signUp = async (
    email: string,
    password: string,
    username?: string
  ) => {
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { username: username || email.split("@")[0] },
        emailRedirectTo: getAuthCallbackUrl(),
      },
    });
    return { error: error as Error | null };
  };

  const signInWithGoogle = async () => {
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
  };

  const resetPassword = async (email: string) => {
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: getAuthCallbackUrl("/reset-password"),
    });
    return { error: error as Error | null };
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        isLoading,
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
