/**
 * Content fetching queries for landing pages
 * Provides server-side data fetching
 *
 * Note: Module content is now loaded from JSON files by the carousel loader.
 * See src/lib/carousel/load-modules.ts for module loading.
 */

import type { SupabaseClient } from "@supabase/supabase-js";
import type { CompanyData, CompanyRole } from "@/lib/routing/types";
import type { AccessCheckResult } from "./types";
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
 * Check if a user has access to premium content for a position
 * Checks access_grants table for valid grant
 */
export async function checkUserAccess(
  supabase: SupabaseClient,
  userId: string,
  companySlug: string,
  roleSlug: string
): Promise<AccessCheckResult> {
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
