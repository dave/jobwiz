"use client";

/**
 * Auth Hooks
 * Issue: #57 - Protected route middleware
 *
 * Provides hooks for auth state, access checks, and route protection
 */

import { useState, useEffect, useCallback } from "react";
import { useRouter, usePathname } from "next/navigation";
import { createBrowserClient } from "@/lib/supabase/client";
import { useAuthContext } from "./context";
import type { AuthState, AccessState } from "./types";

/**
 * Hook to get current auth state
 * Returns { user, loading, error }
 */
export function useAuth(): AuthState {
  const { user, session, loading, error } = useAuthContext();
  return { user, session, loading, error };
}

/**
 * Hook to check if user has access to a company/role position
 * Returns { hasAccess, loading, error }
 */
export function useAccess(company: string, role: string): AccessState {
  const { user, loading: authLoading } = useAuth();
  const [accessState, setAccessState] = useState<AccessState>({
    hasAccess: false,
    loading: true,
    error: null,
  });

  useEffect(() => {
    async function checkAccess() {
      // If auth is still loading, wait
      if (authLoading) {
        return;
      }

      // If no user, no access
      if (!user) {
        setAccessState({
          hasAccess: false,
          loading: false,
          error: null,
        });
        return;
      }

      try {
        const supabase = createBrowserClient();

        // Check access_grants table for valid grant
        const { data, error } = await supabase
          .from("access_grants")
          .select("id, expires_at")
          .eq("user_id", user.id)
          .or(`company_slug.eq.${company},company_slug.is.null`)
          .or(`role_slug.eq.${role},role_slug.is.null`)
          .gte("expires_at", new Date().toISOString())
          .maybeSingle();

        if (error) {
          // Table may not exist yet - return no access
          setAccessState({
            hasAccess: false,
            loading: false,
            error: null,
          });
          return;
        }

        if (!data) {
          setAccessState({
            hasAccess: false,
            loading: false,
            error: null,
          });
          return;
        }

        setAccessState({
          hasAccess: true,
          loading: false,
          error: null,
          purchaseId: data.id,
          expiresAt: data.expires_at,
        });
      } catch (err) {
        setAccessState({
          hasAccess: false,
          loading: false,
          error: err instanceof Error ? err : new Error("Failed to check access"),
        });
      }
    }

    checkAccess();
  }, [user, company, role, authLoading]);

  return accessState;
}

/**
 * Hook that redirects to login if not authenticated
 * Returns { user, loading, error }
 */
export function useRequireAuth(redirectTo?: string): AuthState {
  const auth = useAuth();
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    // Wait until auth check completes
    if (auth.loading) {
      return;
    }

    // If not authenticated, redirect to login
    if (!auth.user) {
      const loginUrl = new URL("/login", window.location.origin);
      // Use provided redirect or current path
      loginUrl.searchParams.set("redirectTo", redirectTo ?? pathname);
      router.push(loginUrl.toString());
    }
  }, [auth.user, auth.loading, router, pathname, redirectTo]);

  return auth;
}

/**
 * Hook that redirects to paywall if user doesn't have access
 * Returns { hasAccess, loading, error }
 */
export function useRequireAccess(
  company: string,
  role: string,
  options?: { redirectTo?: string }
): AccessState & { authLoading: boolean } {
  const auth = useAuth();
  const access = useAccess(company, role);
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    // Wait until both auth and access checks complete
    if (auth.loading || access.loading) {
      return;
    }

    // If not authenticated, redirect to login first
    if (!auth.user) {
      const loginUrl = new URL("/login", window.location.origin);
      loginUrl.searchParams.set("redirectTo", options?.redirectTo ?? pathname);
      router.push(loginUrl.toString());
      return;
    }

    // If authenticated but no access, redirect to paywall
    if (!access.hasAccess) {
      // Redirect to the landing page with paywall
      const landingUrl = `/${company}/${role}`;
      if (pathname !== landingUrl) {
        router.push(landingUrl);
      }
    }
  }, [
    auth.user,
    auth.loading,
    access.hasAccess,
    access.loading,
    router,
    pathname,
    company,
    role,
    options?.redirectTo,
  ]);

  return {
    ...access,
    authLoading: auth.loading,
  };
}
