/**
 * Auth Types
 * Issue: #57 - Protected route middleware
 */

import type { User, Session } from "@supabase/supabase-js";

/**
 * User state returned by useAuth hook
 */
export interface AuthUser {
  id: string;
  email: string | null;
  displayName: string | null;
  avatarUrl: string | null;
}

/**
 * Auth state returned by useAuth hook
 */
export interface AuthState {
  user: AuthUser | null;
  session: Session | null;
  loading: boolean;
  error: Error | null;
}

/**
 * Access state for a specific company/role position
 */
export interface AccessState {
  hasAccess: boolean;
  loading: boolean;
  error: Error | null;
  purchaseId?: string;
  expiresAt?: string;
}

/**
 * Protected route levels
 */
export type RouteProtectionLevel = "public" | "authenticated" | "purchased";

/**
 * Route configuration for middleware
 */
export interface RouteConfig {
  path: string;
  level: RouteProtectionLevel;
  /** For purchased routes, the company/role to check */
  company?: string;
  role?: string;
}

/**
 * Transform Supabase User to AuthUser
 */
export function transformUser(user: User | null): AuthUser | null {
  if (!user) return null;

  return {
    id: user.id,
    email: user.email ?? null,
    displayName: user.user_metadata?.full_name ?? user.email?.split("@")[0] ?? null,
    avatarUrl: user.user_metadata?.avatar_url ?? null,
  };
}
