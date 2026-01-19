/**
 * Progress cookie utilities for SSR hydration
 *
 * Syncs key progress data to a cookie so server can render
 * correct initial state and prevent flicker.
 */

/** Progress data stored in cookie */
export interface ProgressCookieData {
  /** Whether user has any progress */
  hasProgress: boolean;
  /** Progress percentage (0-100) */
  percent: number;
  /** Current module index (for highlighting) */
  moduleIdx: number;
}

const COOKIE_PREFIX = "jw_progress_";
const COOKIE_EXPIRY_DAYS = 30;

/**
 * Get cookie name for a specific journey
 */
function getProgressCookieName(companySlug: string, roleSlug: string): string {
  return `${COOKIE_PREFIX}${companySlug}_${roleSlug}`;
}

/**
 * Set progress cookie (client-side only)
 */
export function setProgressCookie(
  companySlug: string,
  roleSlug: string,
  data: ProgressCookieData
): void {
  if (typeof document === "undefined") return;

  const name = getProgressCookieName(companySlug, roleSlug);
  const value = JSON.stringify(data);
  const expires = new Date();
  expires.setDate(expires.getDate() + COOKIE_EXPIRY_DAYS);

  document.cookie = `${name}=${encodeURIComponent(value)};path=/;expires=${expires.toUTCString()};SameSite=Lax`;
}

/**
 * Get progress cookie
 * Works on both server (pass cookieString) and client (reads document.cookie)
 */
export function getProgressCookie(
  companySlug: string,
  roleSlug: string,
  cookieString?: string
): ProgressCookieData | null {
  const cookies = cookieString ?? (typeof document !== "undefined" ? document.cookie : "");
  const name = getProgressCookieName(companySlug, roleSlug);

  const match = cookies
    .split(";")
    .map((c) => c.trim())
    .find((c) => c.startsWith(`${name}=`));

  if (!match) return null;

  try {
    const value = decodeURIComponent(match.substring(name.length + 1));
    return JSON.parse(value) as ProgressCookieData;
  } catch {
    return null;
  }
}

/**
 * Clear progress cookie (client-side only)
 */
export function clearProgressCookie(
  companySlug: string,
  roleSlug: string
): void {
  if (typeof document === "undefined") return;

  const name = getProgressCookieName(companySlug, roleSlug);
  document.cookie = `${name}=;path=/;expires=Thu, 01 Jan 1970 00:00:00 GMT`;
}
