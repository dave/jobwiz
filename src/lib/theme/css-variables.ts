/**
 * CSS variable utilities for dynamic theming
 * Issue: #36 - Company theming system
 */

import type { ResolvedTheme, ThemeCSSVariables } from "./types";
import { lightenColor, darkenColor, getTextColorForBackground } from "./contrast";

/**
 * Generate CSS variables object from a resolved theme
 */
export function generateCSSVariables(theme: ResolvedTheme): ThemeCSSVariables {
  return {
    "--theme-primary": theme.primaryColor,
    "--theme-secondary": theme.secondaryColor,
    "--theme-primary-hover": darkenColor(theme.primaryColor, 10),
    "--theme-primary-light": lightenColor(theme.primaryColor, 90),
    "--theme-secondary-light": lightenColor(theme.secondaryColor, 90),
    "--theme-text-on-primary": getTextColorForBackground(theme.primaryColor),
    "--theme-text-on-secondary": getTextColorForBackground(theme.secondaryColor),
  };
}

/**
 * Generate inline style object for CSS variable injection
 * Can be used with React style prop
 */
export function generateThemeStyle(
  theme: ResolvedTheme
): React.CSSProperties {
  const variables = generateCSSVariables(theme);
  return variables as unknown as React.CSSProperties;
}

/**
 * Generate CSS string for server-side rendering
 */
export function generateThemeCSS(theme: ResolvedTheme): string {
  const variables = generateCSSVariables(theme);
  const declarations = Object.entries(variables)
    .map(([key, value]) => `${key}: ${value};`)
    .join(" ");
  return `:root { ${declarations} }`;
}

/**
 * Generate Tailwind-compatible class names from theme
 * Returns classes that use CSS variables
 */
export function getThemedClasses(): {
  button: string;
  buttonHover: string;
  accentBg: string;
  accentText: string;
  primaryBg: string;
  primaryText: string;
} {
  return {
    button: "bg-[var(--theme-primary)] text-[var(--theme-text-on-primary)]",
    buttonHover: "hover:bg-[var(--theme-primary-hover)]",
    accentBg: "bg-[var(--theme-secondary-light)]",
    accentText: "text-[var(--theme-secondary)]",
    primaryBg: "bg-[var(--theme-primary-light)]",
    primaryText: "text-[var(--theme-primary)]",
  };
}
