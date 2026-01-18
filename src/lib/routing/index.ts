/**
 * Routing utilities for company/role pages
 */

export type {
  CompanyData,
  CompanyRole,
  SearchVolumeData,
  RouteValidationResult,
} from "./types";

export {
  getAllCompanies,
  getCompanyBySlug,
  getRoleBySlug,
  getTopCompanyRoleCombos,
  getAllCompanySlugs,
  validateCompanyRoute,
  validateCompanyRoleRoute,
  normalizeSlug,
} from "./data";
