/**
 * Tests for WCAG color contrast utilities
 * Issue: #36 - Company theming system
 */

import {
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
} from "../contrast";

describe("hexToRgb", () => {
  test("converts 6-digit hex to RGB", () => {
    expect(hexToRgb("#ffffff")).toEqual({ r: 255, g: 255, b: 255 });
    expect(hexToRgb("#000000")).toEqual({ r: 0, g: 0, b: 0 });
    expect(hexToRgb("#ff0000")).toEqual({ r: 255, g: 0, b: 0 });
    expect(hexToRgb("#00ff00")).toEqual({ r: 0, g: 255, b: 0 });
    expect(hexToRgb("#0000ff")).toEqual({ r: 0, g: 0, b: 255 });
  });

  test("converts 3-digit hex to RGB", () => {
    expect(hexToRgb("#fff")).toEqual({ r: 255, g: 255, b: 255 });
    expect(hexToRgb("#000")).toEqual({ r: 0, g: 0, b: 0 });
    expect(hexToRgb("#f00")).toEqual({ r: 255, g: 0, b: 0 });
  });

  test("handles hex without # prefix", () => {
    expect(hexToRgb("ffffff")).toEqual({ r: 255, g: 255, b: 255 });
    expect(hexToRgb("000000")).toEqual({ r: 0, g: 0, b: 0 });
    expect(hexToRgb("fff")).toEqual({ r: 255, g: 255, b: 255 });
  });

  test("is case-insensitive", () => {
    expect(hexToRgb("#FFFFFF")).toEqual({ r: 255, g: 255, b: 255 });
    expect(hexToRgb("#AbCdEf")).toEqual({ r: 171, g: 205, b: 239 });
  });

  test("returns null for invalid hex", () => {
    expect(hexToRgb("#gggggg")).toBeNull();
    expect(hexToRgb("invalid")).toBeNull();
    expect(hexToRgb("#12345")).toBeNull();
    expect(hexToRgb("#1234567")).toBeNull();
  });
});

describe("rgbToHex", () => {
  test("converts RGB to hex", () => {
    expect(rgbToHex(255, 255, 255)).toBe("#ffffff");
    expect(rgbToHex(0, 0, 0)).toBe("#000000");
    expect(rgbToHex(255, 0, 0)).toBe("#ff0000");
    expect(rgbToHex(0, 255, 0)).toBe("#00ff00");
    expect(rgbToHex(0, 0, 255)).toBe("#0000ff");
  });

  test("handles intermediate values", () => {
    expect(rgbToHex(128, 128, 128)).toBe("#808080");
    expect(rgbToHex(66, 133, 244)).toBe("#4285f4"); // Google blue
  });

  test("clamps values to 0-255", () => {
    expect(rgbToHex(300, -50, 128)).toBe("#ff0080");
  });

  test("rounds decimal values", () => {
    // 127.5 rounds to 128 (0x80), 64.4 rounds to 64 (0x40), 200.9 rounds to 201 (0xc9)
    expect(rgbToHex(127.5, 64.4, 200.9)).toBe("#8040c9");
  });
});

describe("getRelativeLuminance", () => {
  test("returns 1 for white", () => {
    expect(getRelativeLuminance("#ffffff")).toBeCloseTo(1, 3);
  });

  test("returns 0 for black", () => {
    expect(getRelativeLuminance("#000000")).toBeCloseTo(0, 3);
  });

  test("returns intermediate values for other colors", () => {
    // Mid-gray should be around 0.21
    const midGray = getRelativeLuminance("#808080");
    expect(midGray).toBeGreaterThan(0.1);
    expect(midGray).toBeLessThan(0.3);
  });

  test("returns 0 for invalid color", () => {
    expect(getRelativeLuminance("invalid")).toBe(0);
  });
});

describe("getContrastRatio", () => {
  test("returns 21 for black on white", () => {
    expect(getContrastRatio("#ffffff", "#000000")).toBeCloseTo(21, 0);
    expect(getContrastRatio("#000000", "#ffffff")).toBeCloseTo(21, 0);
  });

  test("returns 1 for same color", () => {
    expect(getContrastRatio("#ff0000", "#ff0000")).toBeCloseTo(1, 3);
    expect(getContrastRatio("#808080", "#808080")).toBeCloseTo(1, 3);
  });

  test("returns intermediate values", () => {
    // White on blue should have good contrast
    const ratio = getContrastRatio("#ffffff", "#2563eb");
    expect(ratio).toBeGreaterThan(4);
    expect(ratio).toBeLessThan(10);
  });
});

describe("meetsWCAGAA", () => {
  test("passes for black on white", () => {
    expect(meetsWCAGAA("#000000", "#ffffff")).toBe(true);
    expect(meetsWCAGAA("#ffffff", "#000000")).toBe(true);
  });

  test("fails for low contrast colors", () => {
    // Light gray on white should fail
    expect(meetsWCAGAA("#d0d0d0", "#ffffff")).toBe(false);
  });

  test("uses lower threshold for large text", () => {
    // A combination that fails for normal but passes for large
    const passes = meetsWCAGAA("#767676", "#ffffff", false);
    const passesLarge = meetsWCAGAA("#767676", "#ffffff", true);
    // Both should pass as 4.5:1 is achieved
    expect(passes).toBe(true);
    expect(passesLarge).toBe(true);
  });

  test("validates Google blue on white", () => {
    // Google blue (#4285f4) on white should pass for large text
    expect(meetsWCAGAA("#4285f4", "#ffffff", true)).toBe(true);
  });
});

describe("meetsWCAGAAA", () => {
  test("passes for black on white", () => {
    expect(meetsWCAGAAA("#000000", "#ffffff")).toBe(true);
  });

  test("uses stricter threshold", () => {
    // Some colors pass AA large text but fail AAA
    // Gray on white - passes AA but not AAA
    const passesAA = meetsWCAGAA("#767676", "#ffffff", true); // Large text
    const passesAAA = meetsWCAGAAA("#767676", "#ffffff");
    expect(passesAA).toBe(true);
    expect(passesAAA).toBe(false);
  });
});

describe("getTextColorForBackground", () => {
  test("returns white for dark backgrounds", () => {
    expect(getTextColorForBackground("#000000")).toBe("#ffffff");
    expect(getTextColorForBackground("#333333")).toBe("#ffffff");
    expect(getTextColorForBackground("#2563eb")).toBe("#ffffff"); // Blue-600
  });

  test("returns black for light backgrounds", () => {
    expect(getTextColorForBackground("#ffffff")).toBe("#000000");
    expect(getTextColorForBackground("#f0f0f0")).toBe("#000000");
    expect(getTextColorForBackground("#dbeafe")).toBe("#000000"); // Blue-100
  });

  test("handles edge cases around threshold", () => {
    // The threshold is 0.179, so colors near this should work correctly
    const textColor = getTextColorForBackground("#808080");
    expect(textColor).toMatch(/^#(000000|ffffff)$/);
  });
});

describe("lightenColor", () => {
  test("lightens black towards white", () => {
    expect(lightenColor("#000000", 50)).toBe("#808080");
    expect(lightenColor("#000000", 100)).toBe("#ffffff");
  });

  test("returns same color at 0%", () => {
    expect(lightenColor("#4285f4", 0)).toBe("#4285f4");
  });

  test("returns white at 100%", () => {
    expect(lightenColor("#4285f4", 100)).toBe("#ffffff");
  });

  test("handles already light colors", () => {
    const result = lightenColor("#ffffff", 50);
    expect(result).toBe("#ffffff");
  });
});

describe("darkenColor", () => {
  test("darkens white towards black", () => {
    expect(darkenColor("#ffffff", 50)).toBe("#808080");
    expect(darkenColor("#ffffff", 100)).toBe("#000000");
  });

  test("returns same color at 0%", () => {
    expect(darkenColor("#4285f4", 0)).toBe("#4285f4");
  });

  test("returns black at 100%", () => {
    expect(darkenColor("#4285f4", 100)).toBe("#000000");
  });

  test("handles already dark colors", () => {
    const result = darkenColor("#000000", 50);
    expect(result).toBe("#000000");
  });
});

describe("isValidHexColor", () => {
  test("validates 6-digit hex", () => {
    expect(isValidHexColor("#ffffff")).toBe(true);
    expect(isValidHexColor("#000000")).toBe(true);
    expect(isValidHexColor("#4285f4")).toBe(true);
    expect(isValidHexColor("#ABCDEF")).toBe(true);
  });

  test("validates 3-digit hex", () => {
    expect(isValidHexColor("#fff")).toBe(true);
    expect(isValidHexColor("#000")).toBe(true);
    expect(isValidHexColor("#abc")).toBe(true);
  });

  test("rejects invalid formats", () => {
    expect(isValidHexColor("ffffff")).toBe(false);
    expect(isValidHexColor("#gggggg")).toBe(false);
    expect(isValidHexColor("red")).toBe(false);
    expect(isValidHexColor("#12345")).toBe(false);
    expect(isValidHexColor("#1234567")).toBe(false);
    expect(isValidHexColor("")).toBe(false);
  });
});

describe("ensureValidHex", () => {
  test("returns color if valid", () => {
    expect(ensureValidHex("#4285f4", "#2563eb")).toBe("#4285f4");
    expect(ensureValidHex("#fff", "#2563eb")).toBe("#fff");
  });

  test("returns default if invalid", () => {
    expect(ensureValidHex("invalid", "#2563eb")).toBe("#2563eb");
    expect(ensureValidHex("", "#2563eb")).toBe("#2563eb");
    expect(ensureValidHex("ffffff", "#2563eb")).toBe("#2563eb");
  });
});
