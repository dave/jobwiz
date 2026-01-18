/**
 * Tests for theme storage utilities
 * Issue: #36 - Company theming system
 */

import {
  resolveTheme,
} from "../storage";
import { DEFAULT_THEME, type CompanyTheme } from "../types";

// Note: getCompanyTheme, getCompanyThemes, upsertCompanyTheme, deleteCompanyTheme, and getResolvedTheme
// are async functions that interact with Supabase. Testing them requires a more sophisticated
// mock setup that mirrors the chained API. For now, we test the synchronous resolveTheme function
// which contains the core logic.

describe("resolveTheme", () => {
  test("resolves theme with data", () => {
    const theme: CompanyTheme = {
      id: "123",
      company_slug: "google",
      logo_url: "https://example.com/logo.png",
      primary_color: "#4285f4",
      secondary_color: "#34a853",
      industry_category: "Big Tech",
      created_at: "2026-01-18T00:00:00Z",
      updated_at: "2026-01-18T00:00:00Z",
    };

    const result = resolveTheme("google", theme);

    expect(result.companySlug).toBe("google");
    expect(result.primaryColor).toBe("#4285f4");
    expect(result.secondaryColor).toBe("#34a853");
    expect(result.logoUrl).toBe("https://example.com/logo.png");
    expect(result.industryCategory).toBe("Big Tech");
    expect(result.isDefault).toBe(false);
  });

  test("returns default theme when null", () => {
    const result = resolveTheme("unknown", null);

    expect(result.companySlug).toBe("unknown");
    expect(result.primaryColor).toBe(DEFAULT_THEME.primaryColor);
    expect(result.secondaryColor).toBe(DEFAULT_THEME.secondaryColor);
    expect(result.logoUrl).toBeNull();
    expect(result.industryCategory).toBeNull();
    expect(result.isDefault).toBe(true);
  });

  test("uses default for invalid hex colors", () => {
    const theme: CompanyTheme = {
      id: "123",
      company_slug: "test",
      logo_url: null,
      primary_color: "invalid",
      secondary_color: "also-invalid",
      industry_category: null,
      created_at: "2026-01-18T00:00:00Z",
      updated_at: "2026-01-18T00:00:00Z",
    };

    const result = resolveTheme("test", theme);

    expect(result.primaryColor).toBe(DEFAULT_THEME.primaryColor);
    expect(result.secondaryColor).toBe(DEFAULT_THEME.secondaryColor);
    expect(result.isDefault).toBe(false); // Still not default because theme exists
  });

  test("preserves valid colors from theme", () => {
    const theme: CompanyTheme = {
      id: "123",
      company_slug: "apple",
      logo_url: null,
      primary_color: "#000000",
      secondary_color: "#86868b",
      industry_category: "Big Tech",
      created_at: "2026-01-18T00:00:00Z",
      updated_at: "2026-01-18T00:00:00Z",
    };

    const result = resolveTheme("apple", theme);

    expect(result.primaryColor).toBe("#000000");
    expect(result.secondaryColor).toBe("#86868b");
  });

  test("handles 3-digit hex colors", () => {
    const theme: CompanyTheme = {
      id: "123",
      company_slug: "test",
      logo_url: null,
      primary_color: "#fff",
      secondary_color: "#000",
      industry_category: null,
      created_at: "2026-01-18T00:00:00Z",
      updated_at: "2026-01-18T00:00:00Z",
    };

    const result = resolveTheme("test", theme);

    expect(result.primaryColor).toBe("#fff");
    expect(result.secondaryColor).toBe("#000");
  });

  test("handles mixed valid/invalid colors", () => {
    const theme: CompanyTheme = {
      id: "123",
      company_slug: "test",
      logo_url: null,
      primary_color: "#4285f4", // valid
      secondary_color: "red", // invalid (not hex)
      industry_category: null,
      created_at: "2026-01-18T00:00:00Z",
      updated_at: "2026-01-18T00:00:00Z",
    };

    const result = resolveTheme("test", theme);

    expect(result.primaryColor).toBe("#4285f4");
    expect(result.secondaryColor).toBe(DEFAULT_THEME.secondaryColor);
  });

  test("preserves logo URL", () => {
    const theme: CompanyTheme = {
      id: "123",
      company_slug: "google",
      logo_url: "https://example.com/google-logo.svg",
      primary_color: "#4285f4",
      secondary_color: "#34a853",
      industry_category: null,
      created_at: "2026-01-18T00:00:00Z",
      updated_at: "2026-01-18T00:00:00Z",
    };

    const result = resolveTheme("google", theme);

    expect(result.logoUrl).toBe("https://example.com/google-logo.svg");
  });

  test("preserves industry category", () => {
    const theme: CompanyTheme = {
      id: "123",
      company_slug: "google",
      logo_url: null,
      primary_color: "#4285f4",
      secondary_color: "#34a853",
      industry_category: "Big Tech",
      created_at: "2026-01-18T00:00:00Z",
      updated_at: "2026-01-18T00:00:00Z",
    };

    const result = resolveTheme("google", theme);

    expect(result.industryCategory).toBe("Big Tech");
  });
});

describe("DEFAULT_THEME", () => {
  test("has valid primary color", () => {
    expect(DEFAULT_THEME.primaryColor).toMatch(/^#[0-9a-fA-F]{6}$/);
  });

  test("has valid secondary color", () => {
    expect(DEFAULT_THEME.secondaryColor).toMatch(/^#[0-9a-fA-F]{6}$/);
  });

  test("has null logo URL", () => {
    expect(DEFAULT_THEME.logoUrl).toBeNull();
  });

  test("has null industry category", () => {
    expect(DEFAULT_THEME.industryCategory).toBeNull();
  });
});
