/**
 * Sticky Bucketing Module
 * Issue: #41 - User bucketing system
 *
 * Ensures users always see the same variant for an experiment,
 * even if traffic splits change. Uses localStorage for persistence.
 */

import type {
  UserId,
  ExperimentName,
  VariantName,
  BucketNumber,
  StoredVariant,
  VariantAssignment,
} from "./types";
import { VARIANT_STORAGE_PREFIX } from "./types";
import { getBucket } from "./bucketing";

/**
 * Get localStorage key for an experiment
 */
export function getStorageKey(experimentName: ExperimentName): string {
  return `${VARIANT_STORAGE_PREFIX}${experimentName}`;
}

/**
 * Check if localStorage is available
 */
export function isLocalStorageAvailable(): boolean {
  if (typeof window === "undefined") {
    return false;
  }

  try {
    const testKey = "__ls_test__";
    localStorage.setItem(testKey, testKey);
    localStorage.removeItem(testKey);
    return true;
  } catch {
    return false;
  }
}

/**
 * Get stored variant from localStorage
 */
export function getStoredVariant(
  experimentName: ExperimentName
): StoredVariant | null {
  if (!isLocalStorageAvailable()) {
    return null;
  }

  try {
    const key = getStorageKey(experimentName);
    const stored = localStorage.getItem(key);

    if (!stored) {
      return null;
    }

    const parsed = JSON.parse(stored) as StoredVariant;

    // Validate structure
    if (
      typeof parsed.variant !== "string" ||
      typeof parsed.bucket !== "number" ||
      typeof parsed.assignedAt !== "string"
    ) {
      // Invalid data, remove it
      localStorage.removeItem(key);
      return null;
    }

    return parsed;
  } catch {
    // JSON parse error or other issue
    return null;
  }
}

/**
 * Store variant to localStorage
 */
export function storeVariant(
  experimentName: ExperimentName,
  variant: VariantName,
  bucket: BucketNumber
): void {
  if (!isLocalStorageAvailable()) {
    return;
  }

  try {
    const key = getStorageKey(experimentName);
    const data: StoredVariant = {
      variant,
      bucket,
      assignedAt: new Date().toISOString(),
    };

    localStorage.setItem(key, JSON.stringify(data));
  } catch {
    // localStorage full or other error - fail silently
  }
}

/**
 * Clear stored variant (for testing or admin purposes)
 */
export function clearStoredVariant(experimentName: ExperimentName): void {
  if (!isLocalStorageAvailable()) {
    return;
  }

  try {
    const key = getStorageKey(experimentName);
    localStorage.removeItem(key);
  } catch {
    // Fail silently
  }
}

/**
 * Clear all stored variants
 */
export function clearAllStoredVariants(): void {
  if (!isLocalStorageAvailable()) {
    return;
  }

  try {
    const keysToRemove: string[] = [];

    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && key.startsWith(VARIANT_STORAGE_PREFIX)) {
        keysToRemove.push(key);
      }
    }

    for (const key of keysToRemove) {
      localStorage.removeItem(key);
    }
  } catch {
    // Fail silently
  }
}

/**
 * Variant assignment function type
 */
export type VariantAssigner = (bucket: BucketNumber) => VariantName;

/**
 * Default variant assigner for 4 equal variants (25% each)
 */
export function defaultVariantAssigner(bucket: BucketNumber): VariantName {
  if (bucket < 25) return "direct_paywall";
  if (bucket < 50) return "freemium";
  if (bucket < 75) return "teaser";
  return "question_limit";
}

/**
 * Create a custom variant assigner based on traffic split
 *
 * @param splits - Object mapping variant name to percentage (0-100)
 * @returns VariantAssigner function
 *
 * @example
 * ```typescript
 * const assigner = createVariantAssigner({
 *   direct_paywall: 25,
 *   freemium: 25,
 *   teaser: 25,
 *   question_limit: 25,
 * });
 * ```
 */
export function createVariantAssigner(
  splits: Record<VariantName, number>
): VariantAssigner {
  // Validate splits sum to 100
  const total = Object.values(splits).reduce((a, b) => a + b, 0);
  if (total !== 100) {
    throw new Error(`Traffic splits must sum to 100, got ${total}`);
  }

  // Create sorted list of variants with cumulative thresholds
  const variants = Object.entries(splits).sort((a, b) => a[0].localeCompare(b[0]));
  const thresholds: Array<{ variant: VariantName; threshold: number }> = [];

  let cumulative = 0;
  for (const [variant, percentage] of variants) {
    cumulative += percentage;
    thresholds.push({ variant, threshold: cumulative });
  }

  return (bucket: BucketNumber): VariantName => {
    for (const { variant, threshold } of thresholds) {
      if (bucket < threshold) {
        return variant;
      }
    }
    // Fallback (should never happen if splits sum to 100)
    return thresholds[thresholds.length - 1]?.variant ?? "default";
  };
}

/**
 * Get or assign variant for a user and experiment
 *
 * This is the main function for sticky bucketing:
 * 1. Check localStorage for existing assignment
 * 2. If not found, calculate bucket and assign variant
 * 3. Store assignment for future consistency
 *
 * @param userId - User ID (anonymous or auth)
 * @param experimentName - Name of the experiment
 * @param assigner - Function to assign variant based on bucket (default: 25% each)
 * @returns VariantAssignment with variant and metadata
 */
export function getOrAssignVariant(
  userId: UserId,
  experimentName: ExperimentName,
  assigner: VariantAssigner = defaultVariantAssigner
): VariantAssignment {
  // Check for existing assignment
  const stored = getStoredVariant(experimentName);

  if (stored) {
    return {
      userId,
      experimentName,
      variant: stored.variant,
      bucket: stored.bucket,
      isNew: false,
    };
  }

  // Calculate bucket for this user + experiment
  const bucket = getBucket(userId, experimentName);

  // Assign variant based on bucket
  const variant = assigner(bucket);

  // Store for sticky bucketing
  storeVariant(experimentName, variant, bucket);

  return {
    userId,
    experimentName,
    variant,
    bucket,
    isNew: true,
  };
}

/**
 * Get variant without assigning (read-only)
 *
 * Returns null if no assignment exists yet
 */
export function getVariantIfAssigned(
  experimentName: ExperimentName
): VariantName | null {
  const stored = getStoredVariant(experimentName);
  return stored?.variant ?? null;
}

/**
 * Force assign a specific variant (for testing/override)
 *
 * WARNING: This bypasses normal bucketing. Use only for testing.
 */
export function forceAssignVariant(
  experimentName: ExperimentName,
  variant: VariantName
): void {
  storeVariant(experimentName, variant, -1); // -1 indicates forced assignment
}
