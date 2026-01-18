/**
 * Content storage functions for Supabase
 * Provides CRUD operations for modules, content blocks, and generation runs
 */

import type { SupabaseClient } from "@supabase/supabase-js";
import type {
  DbModule,
  DbContentBlock,
  DbGenerationRun,
  CreateModuleInput,
  CreateContentBlockInput,
  CreateGenerationRunInput,
  ModuleSearchResult,
  ModuleStatus,
} from "./types";

/**
 * Create a new module
 */
export async function createModule(
  supabase: SupabaseClient,
  input: CreateModuleInput
): Promise<DbModule> {
  const { data, error } = await supabase
    .from("modules")
    .insert({
      slug: input.slug,
      type: input.type,
      title: input.title,
      description: input.description ?? null,
      company_slug: input.company_slug ?? null,
      role_slug: input.role_slug ?? null,
      industry: input.industry ?? null,
      is_premium: input.is_premium ?? false,
      display_order: input.display_order ?? 0,
    })
    .select()
    .single();

  if (error) {
    throw new Error(`Failed to create module: ${error.message}`);
  }

  return data as DbModule;
}

/**
 * Get a module by slug
 */
export async function getModuleBySlug(
  supabase: SupabaseClient,
  slug: string
): Promise<DbModule | null> {
  const { data, error } = await supabase
    .from("modules")
    .select("*")
    .eq("slug", slug)
    .single();

  if (error) {
    if (error.code === "PGRST116") {
      return null; // Not found
    }
    throw new Error(`Failed to get module: ${error.message}`);
  }

  return data as DbModule;
}

/**
 * Get modules by company slug
 */
export async function getModulesByCompany(
  supabase: SupabaseClient,
  companySlug: string
): Promise<DbModule[]> {
  const { data, error } = await supabase
    .from("modules")
    .select("*")
    .eq("company_slug", companySlug)
    .order("display_order", { ascending: true });

  if (error) {
    throw new Error(`Failed to get modules by company: ${error.message}`);
  }

  return data as DbModule[];
}

/**
 * Get modules by role slug
 */
export async function getModulesByRole(
  supabase: SupabaseClient,
  roleSlug: string
): Promise<DbModule[]> {
  const { data, error } = await supabase
    .from("modules")
    .select("*")
    .eq("role_slug", roleSlug)
    .order("display_order", { ascending: true });

  if (error) {
    throw new Error(`Failed to get modules by role: ${error.message}`);
  }

  return data as DbModule[];
}

/**
 * Update module status
 */
export async function updateModuleStatus(
  supabase: SupabaseClient,
  moduleId: string,
  status: ModuleStatus,
  reviewerNotes?: string,
  reviewedBy?: string
): Promise<DbModule> {
  const updateData: Record<string, unknown> = { status };

  if (status === "reviewed" || status === "published") {
    updateData.reviewed_at = new Date().toISOString();
    if (reviewerNotes) updateData.reviewer_notes = reviewerNotes;
    if (reviewedBy) updateData.reviewed_by = reviewedBy;
  }

  const { data, error } = await supabase
    .from("modules")
    .update(updateData)
    .eq("id", moduleId)
    .select()
    .single();

  if (error) {
    throw new Error(`Failed to update module status: ${error.message}`);
  }

  return data as DbModule;
}

/**
 * Update module quality scores
 */
export async function updateModuleQualityScores(
  supabase: SupabaseClient,
  moduleId: string,
  qualityScore: number,
  readabilityScore: number
): Promise<DbModule> {
  const { data, error } = await supabase
    .from("modules")
    .update({
      quality_score: qualityScore,
      readability_score: readabilityScore,
    })
    .eq("id", moduleId)
    .select()
    .single();

  if (error) {
    throw new Error(`Failed to update quality scores: ${error.message}`);
  }

  return data as DbModule;
}

/**
 * Search modules using full-text search
 */
export async function searchModules(
  supabase: SupabaseClient,
  query: string,
  limit = 10
): Promise<ModuleSearchResult[]> {
  const { data, error } = await supabase
    .from("modules")
    .select(
      `
      id, slug, type, title, description, company_slug, role_slug
    `
    )
    .textSearch("search_vector", query, {
      type: "websearch",
      config: "english",
    })
    .eq("status", "published")
    .limit(limit);

  if (error) {
    throw new Error(`Failed to search modules: ${error.message}`);
  }

  // Add rank based on position in results
  return (data as DbModule[]).map((row, index) => ({
    id: row.id,
    slug: row.slug,
    type: row.type,
    title: row.title,
    description: row.description,
    company_slug: row.company_slug,
    role_slug: row.role_slug,
    rank: index + 1,
  }));
}

/**
 * Create a content block
 */
export async function createContentBlock(
  supabase: SupabaseClient,
  input: CreateContentBlockInput
): Promise<DbContentBlock> {
  const { data, error } = await supabase
    .from("content_blocks")
    .insert({
      module_id: input.module_id,
      section_id: input.section_id,
      section_title: input.section_title,
      block_type: input.block_type,
      content: input.content,
      section_order: input.section_order,
      block_order: input.block_order,
      is_premium: input.is_premium ?? false,
    })
    .select()
    .single();

  if (error) {
    throw new Error(`Failed to create content block: ${error.message}`);
  }

  return data as DbContentBlock;
}

/**
 * Create multiple content blocks in a batch
 */
export async function createContentBlocksBatch(
  supabase: SupabaseClient,
  blocks: CreateContentBlockInput[]
): Promise<DbContentBlock[]> {
  if (blocks.length === 0) return [];

  const { data, error } = await supabase
    .from("content_blocks")
    .insert(
      blocks.map((input) => ({
        module_id: input.module_id,
        section_id: input.section_id,
        section_title: input.section_title,
        block_type: input.block_type,
        content: input.content,
        section_order: input.section_order,
        block_order: input.block_order,
        is_premium: input.is_premium ?? false,
      }))
    )
    .select();

  if (error) {
    throw new Error(`Failed to create content blocks: ${error.message}`);
  }

  return data as DbContentBlock[];
}

/**
 * Get content blocks for a module
 */
export async function getContentBlocksForModule(
  supabase: SupabaseClient,
  moduleId: string
): Promise<DbContentBlock[]> {
  const { data, error } = await supabase
    .from("content_blocks")
    .select("*")
    .eq("module_id", moduleId)
    .order("section_order", { ascending: true })
    .order("block_order", { ascending: true });

  if (error) {
    throw new Error(`Failed to get content blocks: ${error.message}`);
  }

  return data as DbContentBlock[];
}

/**
 * Create a generation run
 */
export async function createGenerationRun(
  supabase: SupabaseClient,
  input: CreateGenerationRunInput
): Promise<DbGenerationRun> {
  const { data, error } = await supabase
    .from("generation_runs")
    .insert({
      module_id: input.module_id ?? null,
      company_slug: input.company_slug ?? null,
      role_slug: input.role_slug ?? null,
      module_type: input.module_type ?? null,
      generator_version: input.generator_version ?? null,
      prompt_version: input.prompt_version ?? null,
      model_used: input.model_used ?? null,
      status: "started",
    })
    .select()
    .single();

  if (error) {
    throw new Error(`Failed to create generation run: ${error.message}`);
  }

  return data as DbGenerationRun;
}

/**
 * Complete a generation run
 */
export async function completeGenerationRun(
  supabase: SupabaseClient,
  runId: string,
  result: {
    moduleId?: string;
    blocksGenerated: number;
    qualityScore?: number;
    tokensUsed?: number;
    estimatedCost?: number;
  }
): Promise<DbGenerationRun> {
  const startedRun = await supabase
    .from("generation_runs")
    .select("started_at")
    .eq("id", runId)
    .single();

  const startedAt = startedRun.data?.started_at
    ? new Date(startedRun.data.started_at)
    : new Date();
  const completedAt = new Date();
  const durationMs = completedAt.getTime() - startedAt.getTime();

  const { data, error } = await supabase
    .from("generation_runs")
    .update({
      module_id: result.moduleId ?? null,
      status: "completed",
      blocks_generated: result.blocksGenerated,
      quality_score: result.qualityScore ?? null,
      completed_at: completedAt.toISOString(),
      duration_ms: durationMs,
      tokens_used: result.tokensUsed ?? null,
      estimated_cost: result.estimatedCost ?? null,
    })
    .eq("id", runId)
    .select()
    .single();

  if (error) {
    throw new Error(`Failed to complete generation run: ${error.message}`);
  }

  return data as DbGenerationRun;
}

/**
 * Fail a generation run
 */
export async function failGenerationRun(
  supabase: SupabaseClient,
  runId: string,
  errorMessage: string
): Promise<DbGenerationRun> {
  const { data, error } = await supabase
    .from("generation_runs")
    .update({
      status: "failed",
      error_message: errorMessage,
      completed_at: new Date().toISOString(),
    })
    .eq("id", runId)
    .select()
    .single();

  if (error) {
    throw new Error(`Failed to fail generation run: ${error.message}`);
  }

  return data as DbGenerationRun;
}

/**
 * Check if a module already exists for company/role combination
 */
export async function moduleExists(
  supabase: SupabaseClient,
  companySlug: string | null,
  roleSlug: string | null,
  type: string
): Promise<boolean> {
  let query = supabase.from("modules").select("id").eq("type", type);

  if (companySlug) {
    query = query.eq("company_slug", companySlug);
  } else {
    query = query.is("company_slug", null);
  }

  if (roleSlug) {
    query = query.eq("role_slug", roleSlug);
  } else {
    query = query.is("role_slug", null);
  }

  const { data, error } = await query.single();

  if (error) {
    if (error.code === "PGRST116") {
      return false; // Not found
    }
    throw new Error(`Failed to check module existence: ${error.message}`);
  }

  return !!data;
}
