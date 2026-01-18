/**
 * Experiments Storage Module
 * Issue: #42 - Variant assignment + storage
 *
 * Functions for managing AB test experiments in Supabase
 */

import type { SupabaseClient } from "@supabase/supabase-js";
import type {
  Experiment,
  ExperimentRow,
  ExperimentStatus,
  CreateExperimentInput,
  TrafficSplit,
  VariantName,
} from "./types";

/**
 * Transform database row to Experiment type
 */
export function transformExperimentRow(row: ExperimentRow): Experiment {
  return {
    id: row.id,
    name: row.name,
    description: row.description,
    variants: row.variants,
    trafficSplit: row.traffic_split,
    status: row.status as ExperimentStatus,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

/**
 * Validate traffic split sums to 100
 */
export function validateTrafficSplit(split: TrafficSplit): boolean {
  const total = Object.values(split).reduce((a, b) => a + b, 0);
  return total === 100;
}

/**
 * Validate variants match traffic split keys
 */
export function validateVariantsMatchSplit(
  variants: VariantName[],
  split: TrafficSplit
): boolean {
  const splitKeys = Object.keys(split).sort();
  const sortedVariants = [...variants].sort();

  if (splitKeys.length !== sortedVariants.length) {
    return false;
  }

  return splitKeys.every((key, i) => key === sortedVariants[i]);
}

/**
 * Get experiment by name
 */
export async function getExperiment(
  supabase: SupabaseClient,
  name: string
): Promise<Experiment | null> {
  const { data, error } = await supabase
    .from("experiments")
    .select("*")
    .eq("name", name)
    .single();

  if (error) {
    if (error.code === "PGRST116") {
      // No rows returned
      return null;
    }
    throw new Error(`Failed to get experiment: ${error.message}`);
  }

  return transformExperimentRow(data as ExperimentRow);
}

/**
 * Get experiment by ID
 */
export async function getExperimentById(
  supabase: SupabaseClient,
  id: string
): Promise<Experiment | null> {
  const { data, error } = await supabase
    .from("experiments")
    .select("*")
    .eq("id", id)
    .single();

  if (error) {
    if (error.code === "PGRST116") {
      return null;
    }
    throw new Error(`Failed to get experiment: ${error.message}`);
  }

  return transformExperimentRow(data as ExperimentRow);
}

/**
 * Get all experiments
 */
export async function getAllExperiments(
  supabase: SupabaseClient,
  status?: ExperimentStatus
): Promise<Experiment[]> {
  let query = supabase.from("experiments").select("*");

  if (status) {
    query = query.eq("status", status);
  }

  const { data, error } = await query.order("created_at", { ascending: false });

  if (error) {
    throw new Error(`Failed to get experiments: ${error.message}`);
  }

  return (data as ExperimentRow[]).map(transformExperimentRow);
}

/**
 * Get all running experiments
 */
export async function getRunningExperiments(
  supabase: SupabaseClient
): Promise<Experiment[]> {
  return getAllExperiments(supabase, "running");
}

/**
 * Create a new experiment
 */
export async function createExperiment(
  supabase: SupabaseClient,
  input: CreateExperimentInput
): Promise<Experiment> {
  // Validate traffic split
  if (!validateTrafficSplit(input.trafficSplit)) {
    throw new Error("Traffic split must sum to 100");
  }

  // Validate variants match split
  if (!validateVariantsMatchSplit(input.variants, input.trafficSplit)) {
    throw new Error("Variants must match traffic split keys");
  }

  const { data, error } = await supabase
    .from("experiments")
    .insert({
      name: input.name,
      description: input.description ?? null,
      variants: input.variants,
      traffic_split: input.trafficSplit,
      status: input.status ?? "draft",
    })
    .select()
    .single();

  if (error) {
    throw new Error(`Failed to create experiment: ${error.message}`);
  }

  return transformExperimentRow(data as ExperimentRow);
}

/**
 * Update experiment status
 */
export async function updateExperimentStatus(
  supabase: SupabaseClient,
  name: string,
  status: ExperimentStatus
): Promise<Experiment> {
  const { data, error } = await supabase
    .from("experiments")
    .update({ status })
    .eq("name", name)
    .select()
    .single();

  if (error) {
    throw new Error(`Failed to update experiment status: ${error.message}`);
  }

  return transformExperimentRow(data as ExperimentRow);
}

/**
 * Update experiment traffic split
 */
export async function updateExperimentTrafficSplit(
  supabase: SupabaseClient,
  name: string,
  trafficSplit: TrafficSplit
): Promise<Experiment> {
  // Validate traffic split
  if (!validateTrafficSplit(trafficSplit)) {
    throw new Error("Traffic split must sum to 100");
  }

  // Get current experiment to validate variants
  const experiment = await getExperiment(supabase, name);
  if (!experiment) {
    throw new Error(`Experiment not found: ${name}`);
  }

  // Validate variants match
  if (!validateVariantsMatchSplit(experiment.variants, trafficSplit)) {
    throw new Error("Traffic split keys must match existing variants");
  }

  const { data, error } = await supabase
    .from("experiments")
    .update({ traffic_split: trafficSplit })
    .eq("name", name)
    .select()
    .single();

  if (error) {
    throw new Error(`Failed to update traffic split: ${error.message}`);
  }

  return transformExperimentRow(data as ExperimentRow);
}

/**
 * Delete experiment (for testing/cleanup)
 */
export async function deleteExperiment(
  supabase: SupabaseClient,
  name: string
): Promise<void> {
  const { error } = await supabase.from("experiments").delete().eq("name", name);

  if (error) {
    throw new Error(`Failed to delete experiment: ${error.message}`);
  }
}

/**
 * Check if experiment exists
 */
export async function experimentExists(
  supabase: SupabaseClient,
  name: string
): Promise<boolean> {
  const { data, error } = await supabase
    .from("experiments")
    .select("id")
    .eq("name", name)
    .single();

  if (error) {
    if (error.code === "PGRST116") {
      return false;
    }
    throw new Error(`Failed to check experiment: ${error.message}`);
  }

  return !!data;
}
