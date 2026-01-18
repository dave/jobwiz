/**
 * Company/role data loading and validation
 */

import searchVolumeData from "../../../data/search_volume.json";
import type {
  SearchVolumeData,
  CompanyData,
  CompanyRole,
  RouteValidationResult,
} from "./types";

const data = searchVolumeData as SearchVolumeData;

/**
 * Get all companies
 */
export function getAllCompanies(): CompanyData[] {
  return data.companies;
}

/**
 * Get a company by slug (case-insensitive)
 */
export function getCompanyBySlug(slug: string): CompanyData | undefined {
  const normalizedSlug = slug.toLowerCase();
  return data.companies.find((c) => c.slug === normalizedSlug);
}

/**
 * Get a role for a company by slug (case-insensitive)
 */
export function getRoleBySlug(
  company: CompanyData,
  roleSlug: string
): CompanyRole | undefined {
  const normalizedSlug = roleSlug.toLowerCase();
  return company.roles.find((r) => r.slug === normalizedSlug);
}

/**
 * Get all company/role combinations for static generation
 * Returns top N by priority score
 */
export function getTopCompanyRoleCombos(limit: number = 100): Array<{
  companySlug: string;
  roleSlug: string;
  score: number;
}> {
  return data.priority_list
    .filter((item) => item.role !== null)
    .slice(0, limit)
    .map((item) => ({
      companySlug: item.company,
      roleSlug: item.role as string,
      score: item.score,
    }));
}

/**
 * Get all company slugs for static generation
 */
export function getAllCompanySlugs(): string[] {
  return data.companies.map((c) => c.slug);
}

/**
 * Validate a company route and determine if redirect is needed
 */
export function validateCompanyRoute(
  companySlug: string
): RouteValidationResult {
  const company = getCompanyBySlug(companySlug);

  if (!company) {
    return {
      isValid: false,
      company: null,
      role: null,
      canonicalPath: null,
      needsRedirect: false,
    };
  }

  const canonicalPath = `/${company.slug}`;
  const needsRedirect = companySlug !== company.slug;

  return {
    isValid: true,
    company,
    role: null,
    canonicalPath,
    needsRedirect,
  };
}

/**
 * Validate a company/role route and determine if redirect is needed
 */
export function validateCompanyRoleRoute(
  companySlug: string,
  roleSlug: string
): RouteValidationResult {
  const company = getCompanyBySlug(companySlug);

  if (!company) {
    return {
      isValid: false,
      company: null,
      role: null,
      canonicalPath: null,
      needsRedirect: false,
    };
  }

  const role = getRoleBySlug(company, roleSlug);

  if (!role) {
    return {
      isValid: false,
      company,
      role: null,
      canonicalPath: null,
      needsRedirect: false,
    };
  }

  const canonicalPath = `/${company.slug}/${role.slug}`;
  const needsRedirect =
    companySlug !== company.slug || roleSlug !== role.slug;

  return {
    isValid: true,
    company,
    role,
    canonicalPath,
    needsRedirect,
  };
}

/**
 * Normalize a slug (lowercase, preserve hyphens)
 */
export function normalizeSlug(slug: string): string {
  return slug.toLowerCase().trim();
}
