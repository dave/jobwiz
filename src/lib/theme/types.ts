/**
 * Types for company theming system
 * Issue: #36 - Company theming system
 */

/**
 * Company theme data from Supabase
 */
export interface CompanyTheme {
  id: string;
  company_slug: string;
  logo_url: string | null;
  primary_color: string;
  secondary_color: string;
  industry_category: string | null;
  created_at: string;
  updated_at: string;
}

/**
 * Resolved theme for rendering (includes fallback values)
 */
export interface ResolvedTheme {
  companySlug: string;
  logoUrl: string | null;
  primaryColor: string;
  secondaryColor: string;
  industryCategory: string | null;
  isDefault: boolean;
}

/**
 * CSS variable names for theming
 */
export type ThemeCSSVariable =
  | "--theme-primary"
  | "--theme-secondary"
  | "--theme-primary-hover"
  | "--theme-primary-light"
  | "--theme-secondary-light"
  | "--theme-text-on-primary"
  | "--theme-text-on-secondary";

/**
 * CSS variables object for injection
 */
export type ThemeCSSVariables = Record<ThemeCSSVariable, string>;

/**
 * Industry category for fallback imagery
 */
export type IndustryCategory =
  | "Big Tech"
  | "Finance"
  | "Healthcare"
  | "Consulting"
  | "Retail"
  | "Manufacturing"
  | "Other";

/**
 * Default theme constants
 */
export const DEFAULT_THEME = {
  primaryColor: "#2563eb", // blue-600
  secondaryColor: "#64748b", // slate-500
  logoUrl: null,
  industryCategory: null,
} as const;

/**
 * Company theme insert input (for creating new themes)
 */
export interface CompanyThemeInput {
  company_slug: string;
  logo_url?: string | null;
  primary_color?: string;
  secondary_color?: string;
  industry_category?: string | null;
}
