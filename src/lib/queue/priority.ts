/**
 * Priority calculation for generation queue
 * Uses search volume data to rank companies/roles
 * Issue #32 - Generation priority queue system
 */

import { readFileSync } from "fs";
import { join } from "path";
import type {
  SearchVolumeData,
  PriorityEntry,
  AddQueueItemInput,
} from "./types";

// Path to search volume data
const SEARCH_VOLUME_PATH = join(process.cwd(), "data", "search_volume.json");

/**
 * Load search volume data from JSON file
 */
export function loadSearchVolumeData(): SearchVolumeData {
  try {
    const content = readFileSync(SEARCH_VOLUME_PATH, "utf-8");
    return JSON.parse(content) as SearchVolumeData;
  } catch (error) {
    throw new Error(
      `Failed to load search volume data: ${error instanceof Error ? error.message : String(error)}`
    );
  }
}

/**
 * Get priority score for a company/role combination
 * Returns 0 if not found
 */
export function getPriorityScore(
  companySlug: string,
  roleSlug?: string | null,
  data?: SearchVolumeData
): number {
  const searchData = data ?? loadSearchVolumeData();

  // Find matching entry in priority list
  const entry = searchData.priority_list.find((e) => {
    if (roleSlug) {
      // Looking for company+role combo
      return e.company === companySlug && e.role === roleSlug;
    } else {
      // Looking for company-only
      return e.company === companySlug && e.role === null;
    }
  });

  return entry?.score ?? 0;
}

/**
 * Get all priority entries for a company
 * Returns company-only and all role combinations
 */
export function getPriorityEntriesForCompany(
  companySlug: string,
  data?: SearchVolumeData
): PriorityEntry[] {
  const searchData = data ?? loadSearchVolumeData();
  return searchData.priority_list.filter((e) => e.company === companySlug);
}

/**
 * Build queue items for a company with calculated priorities
 * Returns items for company-only and all roles
 */
export function buildQueueItemsForCompany(
  companySlug: string,
  roles?: string[],
  data?: SearchVolumeData
): AddQueueItemInput[] {
  const searchData = data ?? loadSearchVolumeData();
  const items: AddQueueItemInput[] = [];

  // Find company in data
  const company = searchData.companies.find((c) => c.slug === companySlug);
  if (!company) {
    // Still create item but with 0 priority
    items.push({
      company_slug: companySlug,
      role_slug: null,
      priority_score: 0,
    });
    return items;
  }

  // Add company-only module
  items.push({
    company_slug: companySlug,
    role_slug: null,
    priority_score: company.interview_volume,
  });

  // Determine which roles to include
  const rolesToAdd = roles
    ? company.roles.filter((r) => roles.includes(r.slug))
    : company.roles;

  // Add company+role combinations
  for (const role of rolesToAdd) {
    items.push({
      company_slug: companySlug,
      role_slug: role.slug,
      priority_score: role.volume,
    });
  }

  return items;
}

/**
 * Build queue items for all companies in search volume data
 * Optionally filter by minimum priority score
 */
export function buildQueueItemsFromSearchVolume(
  minPriority = 0,
  data?: SearchVolumeData
): AddQueueItemInput[] {
  const searchData = data ?? loadSearchVolumeData();
  const items: AddQueueItemInput[] = [];

  for (const entry of searchData.priority_list) {
    if (entry.score >= minPriority) {
      items.push({
        company_slug: entry.company,
        role_slug: entry.role,
        priority_score: entry.score,
      });
    }
  }

  return items;
}

/**
 * Get list of all company slugs from search volume data
 */
export function getAllCompanySlugs(data?: SearchVolumeData): string[] {
  const searchData = data ?? loadSearchVolumeData();
  return searchData.companies.map((c) => c.slug);
}

/**
 * Get list of all role slugs from search volume data
 */
export function getAllRoleSlugs(data?: SearchVolumeData): string[] {
  const searchData = data ?? loadSearchVolumeData();
  const roles = new Set<string>();
  for (const company of searchData.companies) {
    for (const role of company.roles) {
      roles.add(role.slug);
    }
  }
  return Array.from(roles);
}

/**
 * Validate that a company slug exists in search volume data
 */
export function isValidCompanySlug(
  companySlug: string,
  data?: SearchVolumeData
): boolean {
  const searchData = data ?? loadSearchVolumeData();
  return searchData.companies.some((c) => c.slug === companySlug);
}

/**
 * Validate that a role slug exists for a company
 */
export function isValidRoleSlug(
  companySlug: string,
  roleSlug: string,
  data?: SearchVolumeData
): boolean {
  const searchData = data ?? loadSearchVolumeData();
  const company = searchData.companies.find((c) => c.slug === companySlug);
  if (!company) return false;
  return company.roles.some((r) => r.slug === roleSlug);
}

/**
 * Override priority for a specific company/role
 * Useful for manual priority adjustment
 */
export function createQueueItemWithPriority(
  companySlug: string,
  roleSlug: string | null,
  priorityOverride: number
): AddQueueItemInput {
  return {
    company_slug: companySlug,
    role_slug: roleSlug,
    priority_score: priorityOverride,
  };
}
