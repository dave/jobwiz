/**
 * User ID Module
 * Issue: #41 - User bucketing system
 *
 * Handles user ID generation and retrieval for AB testing
 * - Anonymous users: UUID stored in cookie
 * - Logged in users: Supabase user ID
 */

import type { UserId, UserIdResult, UserIdSource } from "./types";
import {
  USER_ID_COOKIE_NAME,
  USER_ID_COOKIE_EXPIRY_MS,
  USER_ID_COOKIE_EXPIRY_SECONDS,
} from "./types";

/**
 * Generate a random UUID v4
 * Uses crypto.randomUUID if available, otherwise falls back to manual generation
 */
export function generateUUID(): string {
  // Use native crypto.randomUUID if available (modern browsers and Node 14.17+)
  if (typeof crypto !== "undefined" && crypto.randomUUID) {
    return crypto.randomUUID();
  }

  // Fallback for older environments
  const randomBytes = new Uint8Array(16);

  if (typeof crypto !== "undefined" && crypto.getRandomValues) {
    crypto.getRandomValues(randomBytes);
  } else {
    // Last resort fallback using Math.random
    for (let i = 0; i < 16; i++) {
      randomBytes[i] = Math.floor(Math.random() * 256);
    }
  }

  // Set version (4) and variant bits
  randomBytes[6] = (randomBytes[6]! & 0x0f) | 0x40; // Version 4
  randomBytes[8] = (randomBytes[8]! & 0x3f) | 0x80; // Variant 1

  // Convert to hex string
  const hex = Array.from(randomBytes)
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");

  // Format as UUID
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
}

/**
 * Validate UUID format
 */
export function isValidUUID(value: string): boolean {
  const uuidRegex =
    /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  return uuidRegex.test(value);
}

/**
 * Parse cookies from document.cookie string
 */
export function parseCookies(cookieString: string): Record<string, string> {
  const cookies: Record<string, string> = {};

  if (!cookieString) {
    return cookies;
  }

  const pairs = cookieString.split(";");
  for (const pair of pairs) {
    const [name, ...valueParts] = pair.split("=");
    if (name) {
      const trimmedName = name.trim();
      const value = valueParts.join("=").trim();
      if (trimmedName) {
        cookies[trimmedName] = decodeURIComponent(value);
      }
    }
  }

  return cookies;
}

/**
 * Set a cookie (client-side only)
 */
export function setCookie(name: string, value: string, expiryMs: number): void {
  if (typeof document === "undefined") {
    return;
  }

  const expires = new Date(Date.now() + expiryMs).toUTCString();
  document.cookie = `${name}=${encodeURIComponent(value)}; expires=${expires}; path=/; SameSite=Lax`;
}

/**
 * Get a cookie value (client-side only)
 */
export function getCookie(name: string): string | null {
  if (typeof document === "undefined") {
    return null;
  }

  const cookies = parseCookies(document.cookie);
  return cookies[name] ?? null;
}

/**
 * Get user ID from cookie
 */
export function getUserIdFromCookie(): UserId | null {
  const cookieValue = getCookie(USER_ID_COOKIE_NAME);
  if (cookieValue && isValidUUID(cookieValue)) {
    return cookieValue;
  }
  return null;
}

/**
 * Save user ID to cookie
 */
export function saveUserIdToCookie(userId: UserId): void {
  setCookie(USER_ID_COOKIE_NAME, userId, USER_ID_COOKIE_EXPIRY_MS);
}

/**
 * Get or create anonymous user ID
 *
 * Checks for existing cookie, creates new UUID if not found
 * @returns UserIdResult with userId and source
 */
export function getOrCreateAnonymousId(): UserIdResult {
  // Try to get from cookie first
  const existingId = getUserIdFromCookie();
  if (existingId) {
    return {
      userId: existingId,
      source: "cookie",
    };
  }

  // Generate new UUID
  const newId = generateUUID();

  // Save to cookie
  saveUserIdToCookie(newId);

  return {
    userId: newId,
    source: "generated",
  };
}

/**
 * Get user ID for bucketing
 *
 * Priority:
 * 1. Logged in user ID (from auth)
 * 2. Anonymous ID from cookie
 * 3. Generate new anonymous ID
 *
 * @param authUserId - Optional auth user ID if logged in
 * @returns UserIdResult with userId and source
 */
export function getUserId(authUserId?: string | null): UserIdResult {
  // If logged in, use auth user ID
  if (authUserId) {
    return {
      userId: authUserId,
      source: "auth",
    };
  }

  // Otherwise, get or create anonymous ID
  return getOrCreateAnonymousId();
}

/**
 * Cookie options for server-side response headers
 */
export interface CookieOptions {
  name: string;
  value: string;
  path: string;
  maxAge: number;
  sameSite: "Lax" | "Strict" | "None";
  httpOnly: boolean;
  secure: boolean;
}

/**
 * Get cookie options for setting user ID (for server-side)
 */
export function getUserIdCookieOptions(
  userId: UserId,
  secure = true
): CookieOptions {
  return {
    name: USER_ID_COOKIE_NAME,
    value: userId,
    path: "/",
    maxAge: USER_ID_COOKIE_EXPIRY_SECONDS,
    sameSite: "Lax",
    httpOnly: false, // Need to be accessible from client JS for bucketing
    secure,
  };
}

/**
 * Format cookie options as Set-Cookie header value
 */
export function formatCookieHeader(options: CookieOptions): string {
  const parts = [
    `${options.name}=${encodeURIComponent(options.value)}`,
    `Path=${options.path}`,
    `Max-Age=${options.maxAge}`,
    `SameSite=${options.sameSite}`,
  ];

  if (options.httpOnly) {
    parts.push("HttpOnly");
  }

  if (options.secure) {
    parts.push("Secure");
  }

  return parts.join("; ");
}

/**
 * Parse user ID from request cookies (server-side)
 */
export function getUserIdFromRequest(
  cookieString: string | null
): UserId | null {
  if (!cookieString) {
    return null;
  }

  const cookies = parseCookies(cookieString);
  const userId = cookies[USER_ID_COOKIE_NAME];

  if (userId && isValidUUID(userId)) {
    return userId;
  }

  return null;
}

// Re-export constants for convenience
export {
  USER_ID_COOKIE_NAME,
  USER_ID_COOKIE_EXPIRY_MS,
  USER_ID_COOKIE_EXPIRY_SECONDS,
};
