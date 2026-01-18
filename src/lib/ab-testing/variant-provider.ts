/**
 * Variant Provider Module
 * Issue: #42 - Variant assignment + storage
 *
 * Provides a unified interface for getting variants that:
 * 1. Checks localStorage first (client-side sticky bucketing)
 * 2. Falls back to Supabase when logged in
 * 3. Syncs localStorage to Supabase when user logs in
 */

import type { SupabaseClient } from "@supabase/supabase-js";
import type {
  UserId,
  ExperimentName,
  VariantName,
  GetVariantResult,
} from "./types";
import {
  getStoredVariant,
  storeVariant,
  getOrAssignVariant as getLocalVariant,
} from "./sticky-bucketing";
import {
  getVariantForUser,
  syncLocalAssignment,
} from "./assignments";
import { getExperiment } from "./experiments";
import { createVariantAssigner } from "./sticky-bucketing";

/**
 * Options for getting variant
 */
export interface GetVariantOptions {
  /** Supabase client (optional - only needed for DB persistence) */
  supabase?: SupabaseClient | null;
  /** Whether to sync localStorage to Supabase */
  syncToSupabase?: boolean;
}

/**
 * Result of unified variant fetch
 */
export interface UnifiedVariantResult {
  /** The assigned variant */
  variant: VariantName | null;
  /** Whether this is a new assignment */
  isNew: boolean;
  /** Source of the variant (localStorage, supabase, or calculated) */
  source: "localStorage" | "supabase" | "calculated";
  /** Any error that occurred */
  error?: string;
}

/**
 * Get variant for user with unified localStorage + Supabase handling
 *
 * Priority:
 * 1. Check localStorage for existing assignment
 * 2. If logged in with Supabase, check/create DB assignment
 * 3. Calculate new assignment and store in localStorage
 *
 * @param userId - User ID (anonymous or auth)
 * @param experimentName - Name of the experiment
 * @param options - Configuration options
 */
export async function getUnifiedVariant(
  userId: UserId,
  experimentName: ExperimentName,
  options: GetVariantOptions = {}
): Promise<UnifiedVariantResult> {
  const { supabase, syncToSupabase = true } = options;

  // 1. Check localStorage first (fastest, works offline)
  const storedVariant = getStoredVariant(experimentName);

  if (storedVariant) {
    // Found in localStorage
    if (supabase && syncToSupabase) {
      // Sync to Supabase in background (don't block)
      syncLocalAssignment(
        supabase,
        userId,
        experimentName,
        storedVariant.variant,
        storedVariant.bucket
      ).catch(() => {
        // Silently ignore sync errors
      });
    }

    return {
      variant: storedVariant.variant,
      isNew: false,
      source: "localStorage",
    };
  }

  // 2. Check Supabase if available
  if (supabase) {
    try {
      const result = await getVariantForUser(supabase, userId, experimentName);

      if (result.variant) {
        // Found in Supabase - store to localStorage for future quick access
        storeVariant(
          experimentName,
          result.variant,
          result.assignment?.bucket ?? -1
        );

        return {
          variant: result.variant,
          isNew: result.isNew,
          source: result.isNew ? "calculated" : "supabase",
        };
      }

      // Supabase returned null (draft/concluded experiment)
      if (result.error) {
        return {
          variant: null,
          isNew: false,
          source: "supabase",
          error: result.error,
        };
      }
    } catch (err) {
      // Supabase error - fall back to local calculation
      console.error("Supabase error, falling back to local:", err);
    }
  }

  // 3. Calculate locally using localStorage
  const localResult = getLocalVariant(userId, experimentName);

  return {
    variant: localResult.variant,
    isNew: localResult.isNew,
    source: localResult.isNew ? "calculated" : "localStorage",
  };
}

/**
 * Get variant for anonymous user (no Supabase, localStorage only)
 */
export function getVariantForAnonymous(
  userId: UserId,
  experimentName: ExperimentName
): UnifiedVariantResult {
  // Check localStorage
  const storedVariant = getStoredVariant(experimentName);

  if (storedVariant) {
    return {
      variant: storedVariant.variant,
      isNew: false,
      source: "localStorage",
    };
  }

  // Calculate and store
  const result = getLocalVariant(userId, experimentName);

  return {
    variant: result.variant,
    isNew: result.isNew,
    source: result.isNew ? "calculated" : "localStorage",
  };
}

/**
 * Sync all localStorage variants to Supabase
 * Call this when user logs in to persist anonymous assignments
 */
export async function syncAllVariantsToSupabase(
  supabase: SupabaseClient,
  userId: UserId,
  experimentNames: ExperimentName[]
): Promise<Map<ExperimentName, UnifiedVariantResult>> {
  const results = new Map<ExperimentName, UnifiedVariantResult>();

  for (const experimentName of experimentNames) {
    const storedVariant = getStoredVariant(experimentName);

    if (storedVariant) {
      try {
        const syncResult = await syncLocalAssignment(
          supabase,
          userId,
          experimentName,
          storedVariant.variant,
          storedVariant.bucket
        );

        results.set(experimentName, {
          variant: syncResult.variant,
          isNew: syncResult.isNew,
          source: "supabase",
          error: syncResult.error,
        });
      } catch (err) {
        results.set(experimentName, {
          variant: storedVariant.variant,
          isNew: false,
          source: "localStorage",
          error: err instanceof Error ? err.message : "Sync failed",
        });
      }
    }
  }

  return results;
}

/**
 * Get variant with custom traffic split (for experiments not in DB)
 *
 * Useful for:
 * - Testing locally without Supabase
 * - Running experiments defined in code
 */
export function getVariantWithSplit(
  userId: UserId,
  experimentName: ExperimentName,
  trafficSplit: Record<VariantName, number>
): UnifiedVariantResult {
  // Check localStorage first
  const storedVariant = getStoredVariant(experimentName);

  if (storedVariant) {
    return {
      variant: storedVariant.variant,
      isNew: false,
      source: "localStorage",
    };
  }

  // Calculate with custom assigner
  const assigner = createVariantAssigner(trafficSplit);
  const result = getLocalVariant(userId, experimentName, assigner);

  return {
    variant: result.variant,
    isNew: result.isNew,
    source: result.isNew ? "calculated" : "localStorage",
  };
}

/**
 * Preload experiment config for faster variant fetching
 */
export async function preloadExperiment(
  supabase: SupabaseClient,
  experimentName: ExperimentName
): Promise<boolean> {
  try {
    const experiment = await getExperiment(supabase, experimentName);
    return !!experiment;
  } catch {
    return false;
  }
}
