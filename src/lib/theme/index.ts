/**
 * Company theming system
 * Issue: #36 - Company theming system
 */

// Types
export type {
  CompanyTheme,
  ResolvedTheme,
  ThemeCSSVariable,
  ThemeCSSVariables,
  IndustryCategory,
  CompanyThemeInput,
} from "./types";

export { DEFAULT_THEME } from "./types";

// Contrast utilities
export {
  hexToRgb,
  rgbToHex,
  getRelativeLuminance,
  getContrastRatio,
  meetsWCAGAA,
  meetsWCAGAAA,
  getTextColorForBackground,
  lightenColor,
  darkenColor,
  isValidHexColor,
  ensureValidHex,
} from "./contrast";

// Storage utilities
export {
  getCompanyTheme,
  getCompanyThemes,
  upsertCompanyTheme,
  deleteCompanyTheme,
  resolveTheme,
  getResolvedTheme,
} from "./storage";

// CSS variable utilities
export {
  generateCSSVariables,
  generateThemeStyle,
  generateThemeCSS,
  getThemedClasses,
} from "./css-variables";
