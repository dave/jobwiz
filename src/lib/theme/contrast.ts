/**
 * WCAG color contrast utilities
 * Issue: #36 - Company theming system
 */

/**
 * Parse a hex color string to RGB values
 */
export function hexToRgb(hex: string): { r: number; g: number; b: number } | null {
  // Remove # if present
  const cleanHex = hex.replace(/^#/, "");

  // Handle 3-character hex
  let fullHex = cleanHex;
  if (cleanHex.length === 3) {
    fullHex = cleanHex
      .split("")
      .map((c) => c + c)
      .join("");
  }

  // Validate hex format
  if (!/^[0-9a-fA-F]{6}$/.test(fullHex)) {
    return null;
  }

  const r = parseInt(fullHex.slice(0, 2), 16);
  const g = parseInt(fullHex.slice(2, 4), 16);
  const b = parseInt(fullHex.slice(4, 6), 16);

  return { r, g, b };
}

/**
 * Convert RGB to hex
 */
export function rgbToHex(r: number, g: number, b: number): string {
  const toHex = (n: number) => {
    const hex = Math.max(0, Math.min(255, Math.round(n))).toString(16);
    return hex.length === 1 ? "0" + hex : hex;
  };
  return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
}

/**
 * Calculate relative luminance of a color (WCAG 2.1 formula)
 * https://www.w3.org/WAI/GL/wiki/Relative_luminance
 */
export function getRelativeLuminance(hex: string): number {
  const rgb = hexToRgb(hex);
  if (!rgb) return 0;

  const { r, g, b } = rgb;

  // Convert to sRGB
  const rsrgb = r / 255;
  const gsrgb = g / 255;
  const bsrgb = b / 255;

  // Apply gamma correction
  const rLinear =
    rsrgb <= 0.03928 ? rsrgb / 12.92 : Math.pow((rsrgb + 0.055) / 1.055, 2.4);
  const gLinear =
    gsrgb <= 0.03928 ? gsrgb / 12.92 : Math.pow((gsrgb + 0.055) / 1.055, 2.4);
  const bLinear =
    bsrgb <= 0.03928 ? bsrgb / 12.92 : Math.pow((bsrgb + 0.055) / 1.055, 2.4);

  // Calculate relative luminance
  return 0.2126 * rLinear + 0.7152 * gLinear + 0.0722 * bLinear;
}

/**
 * Calculate contrast ratio between two colors (WCAG 2.1 formula)
 * Returns a value between 1 and 21
 */
export function getContrastRatio(color1: string, color2: string): number {
  const l1 = getRelativeLuminance(color1);
  const l2 = getRelativeLuminance(color2);

  const lighter = Math.max(l1, l2);
  const darker = Math.min(l1, l2);

  return (lighter + 0.05) / (darker + 0.05);
}

/**
 * Check if contrast meets WCAG AA requirements
 * Normal text: 4.5:1
 * Large text (18pt+): 3:1
 */
export function meetsWCAGAA(
  foreground: string,
  background: string,
  isLargeText: boolean = false
): boolean {
  const ratio = getContrastRatio(foreground, background);
  return isLargeText ? ratio >= 3 : ratio >= 4.5;
}

/**
 * Check if contrast meets WCAG AAA requirements
 * Normal text: 7:1
 * Large text (18pt+): 4.5:1
 */
export function meetsWCAGAAA(
  foreground: string,
  background: string,
  isLargeText: boolean = false
): boolean {
  const ratio = getContrastRatio(foreground, background);
  return isLargeText ? ratio >= 4.5 : ratio >= 7;
}

/**
 * Get the best text color (black or white) for a given background
 * Based on contrast ratio
 */
export function getTextColorForBackground(backgroundColor: string): string {
  const luminance = getRelativeLuminance(backgroundColor);
  // Use white text for dark backgrounds, black for light
  return luminance > 0.179 ? "#000000" : "#ffffff";
}

/**
 * Lighten a color by a percentage
 */
export function lightenColor(hex: string, percent: number): string {
  const rgb = hexToRgb(hex);
  if (!rgb) return hex;

  const factor = percent / 100;
  const r = rgb.r + (255 - rgb.r) * factor;
  const g = rgb.g + (255 - rgb.g) * factor;
  const b = rgb.b + (255 - rgb.b) * factor;

  return rgbToHex(r, g, b);
}

/**
 * Darken a color by a percentage
 */
export function darkenColor(hex: string, percent: number): string {
  const rgb = hexToRgb(hex);
  if (!rgb) return hex;

  const factor = 1 - percent / 100;
  const r = rgb.r * factor;
  const g = rgb.g * factor;
  const b = rgb.b * factor;

  return rgbToHex(r, g, b);
}

/**
 * Validate a hex color string
 */
export function isValidHexColor(color: string): boolean {
  return /^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/.test(color);
}

/**
 * Ensure a color string is a valid hex color, return default if not
 */
export function ensureValidHex(color: string, defaultColor: string): string {
  return isValidHexColor(color) ? color : defaultColor;
}
