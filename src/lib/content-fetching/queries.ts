/**
 * Content fetching queries for landing pages
 * Provides server-side data fetching with caching
 */

import type { SupabaseClient } from "@supabase/supabase-js";
import type { Module, ModuleSection, ContentBlock } from "@/types/module";
import type { CompanyData, CompanyRole } from "@/lib/routing/types";
import type {
  PreviewContent,
  FullContent,
  TruncatedSection,
  ContentFetchOptions,
  AccessCheckResult,
  TransformedBlock,
} from "./types";
import {
  getCompanyBySlug as getCompanyFromData,
  getRoleBySlug as getRoleFromData,
} from "@/lib/routing/data";

// Re-export routing functions with consistent naming
export { getCompanyBySlug, getRoleBySlug };

/**
 * Get company data by slug (case-insensitive)
 * Uses local JSON data, not Supabase
 */
function getCompanyBySlug(slug: string): CompanyData | null {
  return getCompanyFromData(slug) ?? null;
}

/**
 * Get role data by slug for a company (case-insensitive)
 * Uses local JSON data, not Supabase
 */
function getRoleBySlug(companySlug: string, roleSlug: string): CompanyRole | null {
  const company = getCompanyBySlug(companySlug);
  if (!company) return null;
  return getRoleFromData(company, roleSlug) ?? null;
}

/**
 * Get all modules for a company/role position from Supabase
 * Returns modules in correct order: universal → industry → role → company → company-role
 */
export async function getModulesForPosition(
  supabase: SupabaseClient,
  companySlug: string,
  roleSlug: string,
  options: ContentFetchOptions = {}
): Promise<Module[]> {
  const { includeDrafts = false, limit, moduleTypes } = options;

  // Build query for modules matching this position
  let query = supabase
    .from("modules")
    .select("*")
    .order("display_order", { ascending: true });

  // Filter by status
  if (!includeDrafts) {
    query = query.eq("status", "published");
  }

  // Get modules that apply to this position
  // We need to fetch multiple types and combine them
  const { data: modules, error } = await query;

  if (error) {
    console.error("Error fetching modules:", error);
    return [];
  }

  if (!modules) return [];

  // Filter to modules that apply to this company/role combination
  const applicableModules = filterModulesForPosition(
    modules as DbModuleRow[],
    companySlug,
    roleSlug
  );

  // Apply module type filter if specified
  let filteredModules = applicableModules;
  if (moduleTypes && moduleTypes.length > 0) {
    filteredModules = applicableModules.filter((m) =>
      moduleTypes.includes(m.type as Module["type"])
    );
  }

  // Apply limit if specified
  if (limit && limit > 0) {
    filteredModules = filteredModules.slice(0, limit);
  }

  // Transform to Module type (without sections - those are fetched separately)
  return filteredModules.map((m) => transformDbModuleToModule(m));
}

/**
 * Get preview content for a position (free content only)
 * Premium blocks are removed and truncated sections are tracked
 */
export async function getPreviewContent(
  supabase: SupabaseClient,
  companySlug: string,
  roleSlug: string,
  options: ContentFetchOptions = {}
): Promise<PreviewContent | null> {
  const company = getCompanyBySlug(companySlug);
  const role = getRoleBySlug(companySlug, roleSlug);

  if (!company || !role) {
    return null;
  }

  // Get all modules for this position
  const modules = await getModulesForPosition(
    supabase,
    companySlug,
    roleSlug,
    options
  );

  // Get content blocks for each module
  const modulesWithBlocks: Module[] = [];
  const truncatedSections: TruncatedSection[] = [];

  let premiumModuleCount = 0;
  let freeModuleCount = 0;

  for (const mod of modules) {
    if (mod.isPremium) {
      premiumModuleCount++;
      // For preview, skip premium modules entirely but track them
      continue;
    }

    freeModuleCount++;

    // Fetch content blocks for this module
    const { data: blocks, error } = await supabase
      .from("content_blocks")
      .select("*")
      .eq("module_id", mod.id)
      .order("section_order", { ascending: true })
      .order("block_order", { ascending: true });

    if (error) {
      console.error("Error fetching blocks for module:", mod.id, error);
      continue;
    }

    // Transform blocks and filter out premium ones
    const transformedBlocks = transformDbBlocksToSections(
      blocks as DbContentBlockRow[],
      false // Don't include premium blocks
    );

    // Track truncated sections
    const premiumBlocks = (blocks as DbContentBlockRow[]).filter(
      (b) => b.is_premium
    );
    if (premiumBlocks.length > 0) {
      // Group by section
      const premiumBySection = new Map<string, DbContentBlockRow[]>();
      for (const block of premiumBlocks) {
        const existing = premiumBySection.get(block.section_id) ?? [];
        existing.push(block);
        premiumBySection.set(block.section_id, existing);
      }

      for (const [sectionId, sectionBlocks] of premiumBySection) {
        truncatedSections.push({
          moduleId: mod.id,
          moduleTitle: mod.title,
          sectionId,
          sectionTitle: sectionBlocks[0]?.section_title ?? sectionId,
          hiddenBlockCount: sectionBlocks.length,
        });
      }
    }

    modulesWithBlocks.push({
      ...mod,
      sections: transformedBlocks,
    });
  }

  return {
    company,
    role,
    modules: modulesWithBlocks,
    hasPremiumAccess: false,
    premiumModuleCount,
    freeModuleCount,
    truncatedSections,
  };
}

/**
 * Get full content for a position (includes premium content)
 * Requires valid access grant for the user
 */
export async function getFullContent(
  supabase: SupabaseClient,
  companySlug: string,
  roleSlug: string,
  userId: string,
  options: ContentFetchOptions = {}
): Promise<FullContent | null> {
  const company = getCompanyBySlug(companySlug);
  const role = getRoleBySlug(companySlug, roleSlug);

  if (!company || !role) {
    return null;
  }

  // Check if user has access to premium content
  const accessCheck = await checkUserAccess(supabase, userId, companySlug, roleSlug);
  if (!accessCheck.hasAccess) {
    return null;
  }

  // Get all modules for this position
  const modules = await getModulesForPosition(
    supabase,
    companySlug,
    roleSlug,
    options
  );

  // Get content blocks for each module (including premium)
  const modulesWithBlocks: Module[] = [];
  let premiumModuleCount = 0;
  let freeModuleCount = 0;

  for (const mod of modules) {
    if (mod.isPremium) {
      premiumModuleCount++;
    } else {
      freeModuleCount++;
    }

    // Fetch all content blocks for this module
    const { data: blocks, error } = await supabase
      .from("content_blocks")
      .select("*")
      .eq("module_id", mod.id)
      .order("section_order", { ascending: true })
      .order("block_order", { ascending: true });

    if (error) {
      console.error("Error fetching blocks for module:", mod.id, error);
      continue;
    }

    // Transform blocks (include premium)
    const transformedBlocks = transformDbBlocksToSections(
      blocks as DbContentBlockRow[],
      true // Include premium blocks
    );

    modulesWithBlocks.push({
      ...mod,
      sections: transformedBlocks,
    });
  }

  return {
    company,
    role,
    modules: modulesWithBlocks,
    hasPremiumAccess: true,
    premiumModuleCount,
    freeModuleCount,
  };
}

/**
 * Check if a user has access to premium content for a position
 * Checks access_grants table for valid grant
 */
export async function checkUserAccess(
  supabase: SupabaseClient,
  userId: string,
  companySlug: string,
  roleSlug: string
): Promise<AccessCheckResult> {
  // For now, check access_grants table (will be created in #40)
  // This is a placeholder that returns false until purchases are implemented
  const { data, error } = await supabase
    .from("access_grants")
    .select("id, expires_at")
    .eq("user_id", userId)
    .or(`company_slug.eq.${companySlug},company_slug.is.null`)
    .or(`role_slug.eq.${roleSlug},role_slug.is.null`)
    .gte("expires_at", new Date().toISOString())
    .maybeSingle();

  if (error) {
    // Table may not exist yet - return no access
    return { hasAccess: false };
  }

  if (!data) {
    return { hasAccess: false };
  }

  return {
    hasAccess: true,
    userId,
    purchaseId: data.id,
    expiresAt: data.expires_at,
  };
}

// ============================================================================
// Internal types for database rows
// ============================================================================

interface DbModuleRow {
  id: string;
  slug: string;
  type: string;
  title: string;
  description: string | null;
  company_slug: string | null;
  role_slug: string | null;
  industry: string | null;
  status: string;
  version: number;
  is_premium: boolean;
  display_order: number;
  created_at: string;
  updated_at: string;
}

interface DbContentBlockRow {
  id: string;
  module_id: string;
  section_id: string;
  section_title: string;
  block_type: string;
  content: Record<string, unknown>;
  section_order: number;
  block_order: number;
  is_premium: boolean;
  created_at: string;
}

// ============================================================================
// Internal helper functions
// ============================================================================

/** Module type order for sorting */
const MODULE_TYPE_ORDER = [
  "universal",
  "industry",
  "role",
  "company",
  "company-role",
];

/**
 * Filter modules to those that apply to a specific company/role position
 */
function filterModulesForPosition(
  modules: DbModuleRow[],
  companySlug: string,
  roleSlug: string
): DbModuleRow[] {
  return modules.filter((mod) => {
    switch (mod.type) {
      case "universal":
        // Universal modules apply to everyone
        return true;

      case "industry":
        // Industry modules - we'd need to know the company's industry
        // For now, include all industry modules (will be filtered by actual industry later)
        return true;

      case "role":
        // Role modules match by role_slug
        return mod.role_slug === roleSlug || mod.role_slug === null;

      case "company":
        // Company modules match by company_slug
        return mod.company_slug === companySlug;

      case "company-role":
        // Company-role modules must match both
        return mod.company_slug === companySlug && mod.role_slug === roleSlug;

      default:
        return false;
    }
  }).sort((a, b) => {
    // Sort by module type order first
    const orderA = MODULE_TYPE_ORDER.indexOf(a.type);
    const orderB = MODULE_TYPE_ORDER.indexOf(b.type);
    if (orderA !== orderB) {
      return orderA - orderB;
    }
    // Then by display_order within type
    return a.display_order - b.display_order;
  });
}

/**
 * Transform database module row to Module type
 */
function transformDbModuleToModule(row: DbModuleRow): Module {
  return {
    id: row.id,
    slug: row.slug,
    type: row.type as Module["type"],
    title: row.title,
    description: row.description ?? undefined,
    sections: [], // Will be populated separately
    isPremium: row.is_premium,
    order: row.display_order,
    industry: row.industry ?? undefined,
    companySlug: row.company_slug ?? undefined,
    roleSlug: row.role_slug ?? undefined,
  };
}

/**
 * Transform database content blocks to ModuleSection array
 */
function transformDbBlocksToSections(
  blocks: DbContentBlockRow[],
  includePremium: boolean
): ModuleSection[] {
  // Filter blocks based on premium access
  const filteredBlocks = includePremium
    ? blocks
    : blocks.filter((b) => !b.is_premium);

  // Group by section
  const sectionMap = new Map<string, { title: string; blocks: ContentBlock[] }>();

  for (const block of filteredBlocks) {
    const existing = sectionMap.get(block.section_id);
    const contentBlock = transformContentBlock(block);

    if (existing) {
      existing.blocks.push(contentBlock);
    } else {
      sectionMap.set(block.section_id, {
        title: block.section_title,
        blocks: [contentBlock],
      });
    }
  }

  // Convert to array
  return Array.from(sectionMap.entries()).map(([id, section]) => ({
    id,
    title: section.title,
    blocks: section.blocks,
  }));
}

/**
 * Transform a database content block to ContentBlock type
 */
function transformContentBlock(row: DbContentBlockRow): ContentBlock {
  // The content field should already contain the block data
  // We just need to ensure it has the correct id and type
  const baseBlock = {
    id: row.id,
    type: row.block_type as ContentBlock["type"],
    ...row.content,
  };

  // Return as ContentBlock (the content already has the type-specific fields)
  return baseBlock as ContentBlock;
}
