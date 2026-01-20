/**
 * Theme storage and retrieval from Supabase
 * Issue: #36 - Company theming system
 */

import type { SupabaseClient } from "@supabase/supabase-js";
import type { CompanyTheme, CompanyThemeInput, ResolvedTheme } from "./types";
import { DEFAULT_THEME } from "./types";
import { ensureValidHex } from "./contrast";

/**
 * Get theme for a company from Supabase
 */
export async function getCompanyTheme(
  supabase: SupabaseClient,
  companySlug: string
): Promise<CompanyTheme | null> {
  const { data, error } = await supabase
    .from("company_themes")
    .select("*")
    .eq("company_slug", companySlug)
    .single();

  if (error || !data) {
    return null;
  }

  return data as CompanyTheme;
}

/**
 * Get themes for multiple companies
 */
export async function getCompanyThemes(
  supabase: SupabaseClient,
  companySlugs: string[]
): Promise<Map<string, CompanyTheme>> {
  const { data, error } = await supabase
    .from("company_themes")
    .select("*")
    .in("company_slug", companySlugs);

  if (error || !data) {
    return new Map();
  }

  const themes = new Map<string, CompanyTheme>();
  for (const theme of data as CompanyTheme[]) {
    themes.set(theme.company_slug, theme);
  }
  return themes;
}

/**
 * Create or update a company theme
 */
export async function upsertCompanyTheme(
  supabase: SupabaseClient,
  input: CompanyThemeInput
): Promise<CompanyTheme | null> {
  const { data, error } = await supabase
    .from("company_themes")
    .upsert(
      {
        company_slug: input.company_slug,
        logo_url: input.logo_url ?? null,
        primary_color: ensureValidHex(
          input.primary_color ?? DEFAULT_THEME.primaryColor,
          DEFAULT_THEME.primaryColor
        ),
        secondary_color: ensureValidHex(
          input.secondary_color ?? DEFAULT_THEME.secondaryColor,
          DEFAULT_THEME.secondaryColor
        ),
        industry_category: input.industry_category ?? null,
      },
      {
        onConflict: "company_slug",
      }
    )
    .select()
    .single();

  if (error || !data) {
    return null;
  }

  return data as CompanyTheme;
}

/**
 * Delete a company theme
 */
export async function deleteCompanyTheme(
  supabase: SupabaseClient,
  companySlug: string
): Promise<boolean> {
  const { error } = await supabase
    .from("company_themes")
    .delete()
    .eq("company_slug", companySlug);

  return !error;
}

/**
 * Companies that only have PNG logos (no SVG available)
 */
const PNG_ONLY_COMPANIES = new Set(["cerner", "zoom"]);

/**
 * Get logo URL for a company (stored in public/logos/)
 * Prefers SVG for crisp scaling, falls back to PNG for companies without SVG
 */
function getLogoUrl(companySlug: string): string {
  const extension = PNG_ONLY_COMPANIES.has(companySlug) ? "png" : "svg";
  return `/logos/${companySlug}.${extension}`;
}

/**
 * Resolve a theme with fallback to defaults
 */
export function resolveTheme(
  companySlug: string,
  theme: CompanyTheme | null
): ResolvedTheme {
  // Use Clearbit for high-quality logos
  const logoUrl = getLogoUrl(companySlug);

  if (theme) {
    return {
      companySlug,
      logoUrl,
      primaryColor: ensureValidHex(theme.primary_color, DEFAULT_THEME.primaryColor),
      secondaryColor: ensureValidHex(theme.secondary_color, DEFAULT_THEME.secondaryColor),
      industryCategory: theme.industry_category,
      isDefault: false,
    };
  }

  // Return default theme with local logo
  return {
    companySlug,
    logoUrl,
    primaryColor: DEFAULT_THEME.primaryColor,
    secondaryColor: DEFAULT_THEME.secondaryColor,
    industryCategory: DEFAULT_THEME.industryCategory,
    isDefault: true,
  };
}

/**
 * Get resolved theme for a company (fetches from Supabase and applies fallbacks)
 */
export async function getResolvedTheme(
  supabase: SupabaseClient,
  companySlug: string
): Promise<ResolvedTheme> {
  const theme = await getCompanyTheme(supabase, companySlug);
  return resolveTheme(companySlug, theme);
}
