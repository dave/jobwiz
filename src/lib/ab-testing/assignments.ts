/**
 * Variant Assignments Storage Module
 * Issue: #42 - Variant assignment + storage
 *
 * Functions for managing variant assignments in Supabase
 */

import type { SupabaseClient } from "@supabase/supabase-js";
import type {
  UserId,
  ExperimentName,
  VariantName,
  BucketNumber,
  VariantAssignmentRecord,
  VariantAssignmentRow,
  CreateVariantAssignmentInput,
  AssignmentSource,
  GetVariantResult,
  Experiment,
  TrafficSplit,
} from "./types";
import { getExperiment } from "./experiments";
import { getBucket } from "./bucketing";
import { createVariantAssigner } from "./sticky-bucketing";

/**
 * Transform database row to VariantAssignmentRecord
 */
export function transformAssignmentRow(
  row: VariantAssignmentRow
): VariantAssignmentRecord {
  return {
    id: row.id,
    userId: row.user_id,
    experimentId: row.experiment_id,
    experimentName: row.experiment_name,
    variant: row.variant,
    bucket: row.bucket,
    source: row.source as AssignmentSource,
    assignedAt: row.assigned_at,
  };
}

/**
 * Get existing assignment for user and experiment
 */
export async function getAssignment(
  supabase: SupabaseClient,
  userId: UserId,
  experimentId: string
): Promise<VariantAssignmentRecord | null> {
  const { data, error } = await supabase
    .from("variant_assignments")
    .select("*")
    .eq("user_id", userId)
    .eq("experiment_id", experimentId)
    .single();

  if (error) {
    if (error.code === "PGRST116") {
      // No rows returned
      return null;
    }
    throw new Error(`Failed to get assignment: ${error.message}`);
  }

  return transformAssignmentRow(data as VariantAssignmentRow);
}

/**
 * Get assignment by experiment name instead of ID
 */
export async function getAssignmentByName(
  supabase: SupabaseClient,
  userId: UserId,
  experimentName: ExperimentName
): Promise<VariantAssignmentRecord | null> {
  const { data, error } = await supabase
    .from("variant_assignments")
    .select("*")
    .eq("user_id", userId)
    .eq("experiment_name", experimentName)
    .single();

  if (error) {
    if (error.code === "PGRST116") {
      return null;
    }
    throw new Error(`Failed to get assignment: ${error.message}`);
  }

  return transformAssignmentRow(data as VariantAssignmentRow);
}

/**
 * Get all assignments for a user
 */
export async function getUserAssignments(
  supabase: SupabaseClient,
  userId: UserId
): Promise<VariantAssignmentRecord[]> {
  const { data, error } = await supabase
    .from("variant_assignments")
    .select("*")
    .eq("user_id", userId)
    .order("assigned_at", { ascending: false });

  if (error) {
    throw new Error(`Failed to get user assignments: ${error.message}`);
  }

  return (data as VariantAssignmentRow[]).map(transformAssignmentRow);
}

/**
 * Create a new variant assignment
 */
export async function createAssignment(
  supabase: SupabaseClient,
  input: CreateVariantAssignmentInput
): Promise<VariantAssignmentRecord> {
  const { data, error } = await supabase
    .from("variant_assignments")
    .insert({
      user_id: input.userId,
      experiment_id: input.experimentId,
      experiment_name: input.experimentName,
      variant: input.variant,
      bucket: input.bucket,
      source: input.source ?? "calculated",
    })
    .select()
    .single();

  if (error) {
    // Handle duplicate assignment attempt
    if (error.code === "23505") {
      // Unique violation - assignment already exists
      const existing = await getAssignment(
        supabase,
        input.userId,
        input.experimentId
      );
      if (existing) {
        return existing;
      }
    }
    throw new Error(`Failed to create assignment: ${error.message}`);
  }

  return transformAssignmentRow(data as VariantAssignmentRow);
}

/**
 * Upsert variant assignment (create or update)
 */
export async function upsertAssignment(
  supabase: SupabaseClient,
  input: CreateVariantAssignmentInput
): Promise<VariantAssignmentRecord> {
  const { data, error } = await supabase
    .from("variant_assignments")
    .upsert(
      {
        user_id: input.userId,
        experiment_id: input.experimentId,
        experiment_name: input.experimentName,
        variant: input.variant,
        bucket: input.bucket,
        source: input.source ?? "calculated",
      },
      {
        onConflict: "user_id,experiment_id",
      }
    )
    .select()
    .single();

  if (error) {
    throw new Error(`Failed to upsert assignment: ${error.message}`);
  }

  return transformAssignmentRow(data as VariantAssignmentRow);
}

/**
 * Delete assignment (for testing)
 */
export async function deleteAssignment(
  supabase: SupabaseClient,
  userId: UserId,
  experimentId: string
): Promise<void> {
  const { error } = await supabase
    .from("variant_assignments")
    .delete()
    .eq("user_id", userId)
    .eq("experiment_id", experimentId);

  if (error) {
    throw new Error(`Failed to delete assignment: ${error.message}`);
  }
}

/**
 * Assign variant based on traffic split
 */
function assignVariantFromSplit(
  bucket: BucketNumber,
  trafficSplit: TrafficSplit
): VariantName {
  const assigner = createVariantAssigner(trafficSplit);
  return assigner(bucket);
}

/**
 * Get variant for user - main function that handles all experiment states
 *
 * This function:
 * 1. Checks if experiment exists and its status
 * 2. For draft experiments, returns null (no assignments)
 * 3. For running experiments, returns existing or creates new assignment
 * 4. For concluded experiments, returns existing assignment only
 *
 * @param supabase - Supabase client
 * @param userId - User ID (anonymous or auth)
 * @param experimentName - Name of the experiment
 * @returns GetVariantResult with variant and metadata
 */
export async function getVariantForUser(
  supabase: SupabaseClient,
  userId: UserId,
  experimentName: ExperimentName
): Promise<GetVariantResult> {
  try {
    // Get experiment configuration
    const experiment = await getExperiment(supabase, experimentName);

    if (!experiment) {
      return {
        variant: null,
        assignment: null,
        experiment: null,
        isNew: false,
        error: `Experiment not found: ${experimentName}`,
      };
    }

    // Check experiment status
    if (experiment.status === "draft") {
      return {
        variant: null,
        assignment: null,
        experiment,
        isNew: false,
        error: "Experiment is in draft status",
      };
    }

    // Check for existing assignment
    const existingAssignment = await getAssignmentByName(
      supabase,
      userId,
      experimentName
    );

    if (existingAssignment) {
      return {
        variant: existingAssignment.variant,
        assignment: existingAssignment,
        experiment,
        isNew: false,
      };
    }

    // For concluded experiments, no new assignments
    if (experiment.status === "concluded") {
      return {
        variant: null,
        assignment: null,
        experiment,
        isNew: false,
        error: "Experiment is concluded, no new assignments",
      };
    }

    // Running experiment - create new assignment
    const bucket = getBucket(userId, experimentName);
    const variant = assignVariantFromSplit(bucket, experiment.trafficSplit);

    const newAssignment = await createAssignment(supabase, {
      userId,
      experimentId: experiment.id,
      experimentName: experiment.name,
      variant,
      bucket,
      source: "calculated",
    });

    return {
      variant,
      assignment: newAssignment,
      experiment,
      isNew: true,
    };
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return {
      variant: null,
      assignment: null,
      experiment: null,
      isNew: false,
      error: message,
    };
  }
}

/**
 * Force assign a specific variant (for testing or overrides)
 */
export async function forceAssignVariant(
  supabase: SupabaseClient,
  userId: UserId,
  experimentName: ExperimentName,
  variant: VariantName
): Promise<GetVariantResult> {
  try {
    const experiment = await getExperiment(supabase, experimentName);

    if (!experiment) {
      return {
        variant: null,
        assignment: null,
        experiment: null,
        isNew: false,
        error: `Experiment not found: ${experimentName}`,
      };
    }

    // Validate variant is valid for experiment
    if (!experiment.variants.includes(variant)) {
      return {
        variant: null,
        assignment: null,
        experiment,
        isNew: false,
        error: `Invalid variant: ${variant}. Valid variants: ${experiment.variants.join(", ")}`,
      };
    }

    // Upsert with forced source
    const assignment = await upsertAssignment(supabase, {
      userId,
      experimentId: experiment.id,
      experimentName: experiment.name,
      variant,
      bucket: -1, // -1 indicates forced
      source: "forced",
    });

    return {
      variant,
      assignment,
      experiment,
      isNew: true,
    };
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return {
      variant: null,
      assignment: null,
      experiment: null,
      isNew: false,
      error: message,
    };
  }
}

/**
 * Sync local assignment to Supabase
 * Used when user logs in to persist anonymous assignments
 */
export async function syncLocalAssignment(
  supabase: SupabaseClient,
  userId: UserId,
  experimentName: ExperimentName,
  variant: VariantName,
  bucket: BucketNumber
): Promise<GetVariantResult> {
  try {
    const experiment = await getExperiment(supabase, experimentName);

    if (!experiment) {
      return {
        variant: null,
        assignment: null,
        experiment: null,
        isNew: false,
        error: `Experiment not found: ${experimentName}`,
      };
    }

    // Check for existing DB assignment (takes precedence)
    const existing = await getAssignmentByName(supabase, userId, experimentName);

    if (existing) {
      // DB assignment takes precedence
      return {
        variant: existing.variant,
        assignment: existing,
        experiment,
        isNew: false,
      };
    }

    // Create assignment from localStorage data
    const assignment = await createAssignment(supabase, {
      userId,
      experimentId: experiment.id,
      experimentName: experiment.name,
      variant,
      bucket,
      source: "localStorage",
    });

    return {
      variant,
      assignment,
      experiment,
      isNew: true,
    };
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return {
      variant: null,
      assignment: null,
      experiment: null,
      isNew: false,
      error: message,
    };
  }
}

/**
 * Get statistics for an experiment
 */
export async function getExperimentStats(
  supabase: SupabaseClient,
  experimentName: ExperimentName
): Promise<{ variant: string; count: number }[]> {
  const { data, error } = await supabase
    .from("variant_assignments")
    .select("variant")
    .eq("experiment_name", experimentName);

  if (error) {
    throw new Error(`Failed to get experiment stats: ${error.message}`);
  }

  // Count by variant
  const counts: Record<string, number> = {};
  for (const row of data) {
    const v = row.variant as string;
    counts[v] = (counts[v] ?? 0) + 1;
  }

  return Object.entries(counts).map(([variant, count]) => ({
    variant,
    count,
  }));
}
