/**
 * Content storage types for Supabase tables
 * Matches schema defined in: supabase/migrations/20260118000002_create_content_storage_tables.sql
 */

import type { ContentBlock, ModuleType } from "@/types/module";

/** Module status in the content pipeline */
export type ModuleStatus = "draft" | "reviewed" | "published";

/** Generation run status */
export type GenerationRunStatus = "started" | "completed" | "failed";

/** Database representation of a module */
export interface DbModule {
  id: string;
  slug: string;
  type: ModuleType;
  title: string;
  description: string | null;

  // Targeting
  company_slug: string | null;
  role_slug: string | null;
  industry: string | null;

  // Status and versioning
  status: ModuleStatus;
  version: number;

  // Quality control
  quality_score: number | null;
  readability_score: number | null;
  reviewer_notes: string | null;
  reviewed_at: string | null;
  reviewed_by: string | null;

  // Access control
  is_premium: boolean;
  display_order: number;

  // Timestamps
  created_at: string;
  updated_at: string;
}

/** Database representation of a content block */
export interface DbContentBlock {
  id: string;
  module_id: string;
  section_id: string;
  section_title: string;
  block_type: ContentBlock["type"];
  content: Record<string, unknown>;
  section_order: number;
  block_order: number;
  is_premium: boolean;
  created_at: string;
}

/** Database representation of a generation run */
export interface DbGenerationRun {
  id: string;
  module_id: string | null;
  company_slug: string | null;
  role_slug: string | null;
  module_type: string | null;
  generator_version: string | null;
  prompt_version: string | null;
  model_used: string | null;
  status: GenerationRunStatus;
  blocks_generated: number | null;
  quality_score: number | null;
  error_message: string | null;
  started_at: string;
  completed_at: string | null;
  duration_ms: number | null;
  tokens_used: number | null;
  estimated_cost: number | null;
}

/** Input for creating a new module */
export interface CreateModuleInput {
  slug: string;
  type: ModuleType;
  title: string;
  description?: string;
  company_slug?: string;
  role_slug?: string;
  industry?: string;
  is_premium?: boolean;
  display_order?: number;
}

/** Input for creating a content block */
export interface CreateContentBlockInput {
  module_id: string;
  section_id: string;
  section_title: string;
  block_type: ContentBlock["type"];
  content: Record<string, unknown>;
  section_order: number;
  block_order: number;
  is_premium?: boolean;
}

/** Input for creating a generation run */
export interface CreateGenerationRunInput {
  module_id?: string;
  company_slug?: string;
  role_slug?: string;
  module_type?: string;
  generator_version?: string;
  prompt_version?: string;
  model_used?: string;
}

/** Search result for modules */
export interface ModuleSearchResult {
  id: string;
  slug: string;
  type: ModuleType;
  title: string;
  description: string | null;
  company_slug: string | null;
  role_slug: string | null;
  rank: number;
}
