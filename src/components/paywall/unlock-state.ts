/**
 * Paywall unlock state management
 * Handles localStorage persistence for unlock status
 */

/** Storage key prefix for unlock state */
const STORAGE_KEY_PREFIX = "paywall-unlock-";

/** Get storage key for a specific journey */
export function getUnlockStorageKey(journeyId: string): string {
  return `${STORAGE_KEY_PREFIX}${journeyId}`;
}

/** Check if content is unlocked for a journey */
export function isUnlocked(journeyId: string): boolean {
  if (typeof window === "undefined") return false;

  try {
    const value = localStorage.getItem(getUnlockStorageKey(journeyId));
    return value === "true";
  } catch {
    return false;
  }
}

/** Set unlock status for a journey */
export function setUnlocked(journeyId: string, unlocked: boolean): void {
  if (typeof window === "undefined") return;

  try {
    const key = getUnlockStorageKey(journeyId);
    if (unlocked) {
      localStorage.setItem(key, "true");
    } else {
      localStorage.removeItem(key);
    }
  } catch {
    // Ignore storage errors (quota exceeded, etc.)
  }
}

/** Clear unlock status for a journey */
export function clearUnlock(journeyId: string): void {
  setUnlocked(journeyId, false);
}
