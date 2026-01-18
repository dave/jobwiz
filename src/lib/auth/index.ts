/**
 * Auth Library Exports
 * Issue: #57 - Protected route middleware
 */

// Context and Provider
export { AuthProvider, useAuthContext } from "./context";

// Hooks
export { useAuth, useAccess, useRequireAuth, useRequireAccess } from "./hooks";

// Types
export type {
  AuthUser,
  AuthState,
  AccessState,
  RouteProtectionLevel,
  RouteConfig,
} from "./types";

export { transformUser } from "./types";
