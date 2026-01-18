"use client";

/**
 * Auth Context
 * Issue: #57 - Protected route middleware
 *
 * Provides authentication state to the entire application
 */

import {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
  type ReactNode,
} from "react";
import type { Session, AuthError } from "@supabase/supabase-js";
import { createBrowserClient } from "@/lib/supabase/client";
import type { AuthUser, AuthState } from "./types";
import { transformUser } from "./types";

interface AuthContextValue extends AuthState {
  signOut: () => Promise<void>;
  refreshSession: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

interface AuthProviderProps {
  children: ReactNode;
  /** Initial session from server (optional) */
  initialSession?: Session | null;
}

/**
 * Auth provider component
 * Wraps the app and provides authentication state
 */
export function AuthProvider({ children, initialSession }: AuthProviderProps) {
  const [user, setUser] = useState<AuthUser | null>(
    initialSession ? transformUser(initialSession.user) : null
  );
  const [session, setSession] = useState<Session | null>(initialSession ?? null);
  const [loading, setLoading] = useState(!initialSession);
  const [error, setError] = useState<Error | null>(null);

  const supabase = createBrowserClient();

  // Refresh session from Supabase
  const refreshSession = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const { data, error: sessionError } = await supabase.auth.getSession();

      if (sessionError) {
        throw sessionError;
      }

      setSession(data.session);
      setUser(transformUser(data.session?.user ?? null));
    } catch (err) {
      setError(err instanceof Error ? err : new Error("Failed to refresh session"));
      setSession(null);
      setUser(null);
    } finally {
      setLoading(false);
    }
  }, [supabase]);

  // Sign out
  const signOut = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const { error: signOutError } = await supabase.auth.signOut();

      if (signOutError) {
        throw signOutError;
      }

      setSession(null);
      setUser(null);
    } catch (err) {
      setError(err instanceof Error ? err : new Error("Failed to sign out"));
      throw err;
    } finally {
      setLoading(false);
    }
  }, [supabase]);

  // Initialize session on mount
  useEffect(() => {
    if (!initialSession) {
      refreshSession();
    }
  }, [initialSession, refreshSession]);

  // Listen for auth state changes
  useEffect(() => {
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (event, newSession) => {
      // Handle various auth events
      switch (event) {
        case "SIGNED_IN":
        case "TOKEN_REFRESHED":
          setSession(newSession);
          setUser(transformUser(newSession?.user ?? null));
          setLoading(false);
          break;

        case "SIGNED_OUT":
          setSession(null);
          setUser(null);
          setLoading(false);
          break;

        case "USER_UPDATED":
          setSession(newSession);
          setUser(transformUser(newSession?.user ?? null));
          break;

        default:
          // INITIAL_SESSION and other events
          if (newSession) {
            setSession(newSession);
            setUser(transformUser(newSession.user));
          }
          setLoading(false);
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, [supabase]);

  const value: AuthContextValue = {
    user,
    session,
    loading,
    error,
    signOut,
    refreshSession,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

/**
 * Hook to access auth context
 * Throws if used outside AuthProvider
 */
export function useAuthContext(): AuthContextValue {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuthContext must be used within an AuthProvider");
  }
  return context;
}
