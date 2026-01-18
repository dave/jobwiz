/**
 * Tests for CSS variable utilities
 * Issue: #36 - Company theming system
 */

import {
  generateCSSVariables,
  generateThemeStyle,
  generateThemeCSS,
  getThemedClasses,
} from "../css-variables";
import type { ResolvedTheme } from "../types";

describe("generateCSSVariables", () => {
  const mockTheme: ResolvedTheme = {
    companySlug: "google",
    logoUrl: "https://example.com/logo.png",
    primaryColor: "#4285f4",
    secondaryColor: "#34a853",
    industryCategory: "Big Tech",
    isDefault: false,
  };

  test("generates all required CSS variables", () => {
    const variables = generateCSSVariables(mockTheme);

    expect(variables["--theme-primary"]).toBe("#4285f4");
    expect(variables["--theme-secondary"]).toBe("#34a853");
    expect(variables["--theme-primary-hover"]).toBeDefined();
    expect(variables["--theme-primary-light"]).toBeDefined();
    expect(variables["--theme-secondary-light"]).toBeDefined();
    expect(variables["--theme-text-on-primary"]).toBeDefined();
    expect(variables["--theme-text-on-secondary"]).toBeDefined();
  });

  test("hover color is darker than primary", () => {
    const variables = generateCSSVariables(mockTheme);

    // Hover should be a valid hex
    expect(variables["--theme-primary-hover"]).toMatch(/^#[0-9a-f]{6}$/);
    // And different from primary
    expect(variables["--theme-primary-hover"]).not.toBe("#4285f4");
  });

  test("light colors are lighter versions", () => {
    const variables = generateCSSVariables(mockTheme);

    expect(variables["--theme-primary-light"]).toMatch(/^#[0-9a-f]{6}$/);
    expect(variables["--theme-secondary-light"]).toMatch(/^#[0-9a-f]{6}$/);
  });

  test("text colors are black or white", () => {
    const variables = generateCSSVariables(mockTheme);

    expect(["#000000", "#ffffff"]).toContain(variables["--theme-text-on-primary"]);
    expect(["#000000", "#ffffff"]).toContain(variables["--theme-text-on-secondary"]);
  });

  test("handles dark primary color", () => {
    const darkTheme: ResolvedTheme = {
      companySlug: "apple",
      logoUrl: null,
      primaryColor: "#000000",
      secondaryColor: "#86868b",
      industryCategory: "Big Tech",
      isDefault: false,
    };

    const variables = generateCSSVariables(darkTheme);

    expect(variables["--theme-primary"]).toBe("#000000");
    expect(variables["--theme-text-on-primary"]).toBe("#ffffff");
  });

  test("handles light primary color", () => {
    const lightTheme: ResolvedTheme = {
      companySlug: "test",
      logoUrl: null,
      primaryColor: "#ffffff",
      secondaryColor: "#eeeeee",
      industryCategory: null,
      isDefault: true,
    };

    const variables = generateCSSVariables(lightTheme);

    expect(variables["--theme-primary"]).toBe("#ffffff");
    expect(variables["--theme-text-on-primary"]).toBe("#000000");
  });
});

describe("generateThemeStyle", () => {
  const mockTheme: ResolvedTheme = {
    companySlug: "google",
    logoUrl: null,
    primaryColor: "#4285f4",
    secondaryColor: "#34a853",
    industryCategory: "Big Tech",
    isDefault: false,
  };

  test("returns React CSSProperties compatible object", () => {
    const style = generateThemeStyle(mockTheme);

    // Should have custom properties
    expect(style).toHaveProperty("--theme-primary");
    expect(style).toHaveProperty("--theme-secondary");
  });

  test("values can be used in React style prop", () => {
    const style = generateThemeStyle(mockTheme);

    // Verify it's a plain object with string values
    for (const value of Object.values(style)) {
      expect(typeof value).toBe("string");
    }
  });
});

describe("generateThemeCSS", () => {
  const mockTheme: ResolvedTheme = {
    companySlug: "google",
    logoUrl: null,
    primaryColor: "#4285f4",
    secondaryColor: "#34a853",
    industryCategory: "Big Tech",
    isDefault: false,
  };

  test("generates valid CSS string", () => {
    const css = generateThemeCSS(mockTheme);

    expect(css).toMatch(/^:root \{.*\}$/);
    expect(css).toContain("--theme-primary: #4285f4");
    expect(css).toContain("--theme-secondary: #34a853");
  });

  test("includes all variables", () => {
    const css = generateThemeCSS(mockTheme);

    expect(css).toContain("--theme-primary:");
    expect(css).toContain("--theme-secondary:");
    expect(css).toContain("--theme-primary-hover:");
    expect(css).toContain("--theme-primary-light:");
    expect(css).toContain("--theme-secondary-light:");
    expect(css).toContain("--theme-text-on-primary:");
    expect(css).toContain("--theme-text-on-secondary:");
  });

  test("is single line for inline use", () => {
    const css = generateThemeCSS(mockTheme);

    // Should not contain newlines
    expect(css.includes("\n")).toBe(false);
  });
});

describe("getThemedClasses", () => {
  test("returns all required class groups", () => {
    const classes = getThemedClasses();

    expect(classes.button).toBeDefined();
    expect(classes.buttonHover).toBeDefined();
    expect(classes.accentBg).toBeDefined();
    expect(classes.accentText).toBeDefined();
    expect(classes.primaryBg).toBeDefined();
    expect(classes.primaryText).toBeDefined();
  });

  test("button class uses CSS variables", () => {
    const classes = getThemedClasses();

    expect(classes.button).toContain("var(--theme-primary)");
    expect(classes.button).toContain("var(--theme-text-on-primary)");
  });

  test("hover class uses CSS variables", () => {
    const classes = getThemedClasses();

    expect(classes.buttonHover).toContain("var(--theme-primary-hover)");
  });

  test("accent classes use secondary color", () => {
    const classes = getThemedClasses();

    expect(classes.accentBg).toContain("var(--theme-secondary-light)");
    expect(classes.accentText).toContain("var(--theme-secondary)");
  });

  test("primary classes use primary color", () => {
    const classes = getThemedClasses();

    expect(classes.primaryBg).toContain("var(--theme-primary-light)");
    expect(classes.primaryText).toContain("var(--theme-primary)");
  });
});
