/**
 * Statistical Analysis Module
 * Issue: #44 - AB test dashboard
 *
 * Chi-square test and statistical significance calculation
 */

import type {
  SignificanceResult,
  ConversionData,
  VariantMetrics,
} from "./dashboard-types";
import type { VariantName } from "./types";

/**
 * Calculate the chi-square statistic for AB test data
 *
 * Uses the chi-square test for independence to determine if there's
 * a statistically significant difference in conversion rates between variants.
 *
 * @param data - Array of conversion data per variant
 * @returns Chi-square statistic
 */
export function calculateChiSquare(data: ConversionData[]): number {
  const totalSamples = data.reduce((sum, d) => sum + d.total, 0);
  const totalConversions = data.reduce((sum, d) => sum + d.conversions, 0);
  const totalNonConversions = totalSamples - totalConversions;

  if (totalSamples === 0) {
    return 0;
  }

  let chiSquare = 0;

  for (const variant of data) {
    // Expected values under null hypothesis (no difference)
    const expectedConversions =
      (variant.total * totalConversions) / totalSamples;
    const expectedNonConversions =
      (variant.total * totalNonConversions) / totalSamples;

    // Chi-square contribution from conversions
    if (expectedConversions > 0) {
      chiSquare +=
        Math.pow(variant.conversions - expectedConversions, 2) /
        expectedConversions;
    }

    // Chi-square contribution from non-conversions
    if (expectedNonConversions > 0) {
      chiSquare +=
        Math.pow(variant.nonConversions - expectedNonConversions, 2) /
        expectedNonConversions;
    }
  }

  return chiSquare;
}

/**
 * Calculate degrees of freedom for chi-square test
 * df = (rows - 1) * (columns - 1) = (variants - 1) * (2 - 1) = variants - 1
 */
export function calculateDegreesOfFreedom(numVariants: number): number {
  return Math.max(numVariants - 1, 1);
}

/**
 * Approximate p-value from chi-square statistic using the gamma function
 *
 * Uses the regularized incomplete gamma function to calculate the p-value.
 * This is an approximation suitable for AB testing purposes.
 */
export function calculatePValue(chiSquare: number, df: number): number {
  if (chiSquare <= 0 || df <= 0) {
    return 1;
  }

  // Use the upper incomplete gamma function approximation
  // P(X > chi-square) = 1 - P(X <= chi-square)
  return 1 - gammaCDF(chiSquare, df);
}

/**
 * Gamma CDF (cumulative distribution function) approximation
 * Using the regularized incomplete gamma function
 */
function gammaCDF(x: number, k: number): number {
  // k = df, lambda = 2 for chi-square
  // chi-square with k df is Gamma(k/2, 1/2)
  const a = k / 2;
  const halfX = x / 2;

  return lowerIncompleteGamma(a, halfX) / gamma(a);
}

/**
 * Gamma function approximation using Lanczos approximation
 */
function gamma(z: number): number {
  if (z < 0.5) {
    // Reflection formula
    return Math.PI / (Math.sin(Math.PI * z) * gamma(1 - z));
  }

  z -= 1;

  // Lanczos approximation coefficients
  const g = 7;
  const c = [
    0.99999999999980993, 676.5203681218851, -1259.1392167224028,
    771.32342877765313, -176.61502916214059, 12.507343278686905,
    -0.13857109526572012, 9.9843695780195716e-6, 1.5056327351493116e-7,
  ];

  let x = c[0]!;
  for (let i = 1; i < g + 2; i++) {
    x += c[i]! / (z + i);
  }

  const t = z + g + 0.5;
  return Math.sqrt(2 * Math.PI) * Math.pow(t, z + 0.5) * Math.exp(-t) * x;
}

/**
 * Lower incomplete gamma function using series expansion
 */
function lowerIncompleteGamma(a: number, x: number): number {
  if (x < 0 || a <= 0) {
    return 0;
  }

  if (x === 0) {
    return 0;
  }

  // Use series expansion for small x
  if (x < a + 1) {
    return gammaSeriesExpansion(a, x);
  }

  // Use continued fraction for larger x
  return gamma(a) - upperIncompleteGammaCF(a, x);
}

/**
 * Series expansion for lower incomplete gamma
 */
function gammaSeriesExpansion(a: number, x: number): number {
  const maxIterations = 100;
  const epsilon = 1e-10;

  let sum = 1 / a;
  let term = 1 / a;

  for (let n = 1; n < maxIterations; n++) {
    term *= x / (a + n);
    sum += term;

    if (Math.abs(term) < epsilon * Math.abs(sum)) {
      break;
    }
  }

  return Math.exp(-x + a * Math.log(x)) * sum;
}

/**
 * Upper incomplete gamma using continued fraction (Lentz's algorithm)
 */
function upperIncompleteGammaCF(a: number, x: number): number {
  const maxIterations = 100;
  const epsilon = 1e-10;
  const tiny = 1e-30;

  let b = x + 1 - a;
  let c = 1 / tiny;
  let d = 1 / b;
  let h = d;

  for (let i = 1; i < maxIterations; i++) {
    const an = -i * (i - a);
    b += 2;
    d = an * d + b;
    if (Math.abs(d) < tiny) d = tiny;
    c = b + an / c;
    if (Math.abs(c) < tiny) c = tiny;
    d = 1 / d;
    const delta = d * c;
    h *= delta;

    if (Math.abs(delta - 1) < epsilon) {
      break;
    }
  }

  return Math.exp(-x + a * Math.log(x)) * h;
}

/**
 * Convert p-value to confidence level percentage
 */
export function pValueToConfidenceLevel(pValue: number): number {
  return Math.round((1 - pValue) * 100 * 100) / 100;
}

/**
 * Check if result is statistically significant at given threshold
 */
export function isStatisticallySignificant(
  pValue: number,
  threshold: number = 0.05
): boolean {
  return pValue < threshold;
}

/**
 * Calculate minimum sample size per variant for desired power
 * Uses simplified formula: n = 16 * p * (1-p) / (d^2)
 * where p is baseline conversion rate and d is minimum detectable effect
 */
export function calculateMinimumSampleSize(
  baselineConversionRate: number,
  minimumDetectableEffect: number = 0.05,
  power: number = 0.8
): number {
  const p = baselineConversionRate;
  const d = minimumDetectableEffect;

  if (p <= 0 || p >= 1 || d <= 0) {
    return 100; // Default minimum
  }

  // Simplified formula (approximation)
  // For 80% power and 95% confidence: multiplier ~ 16
  const multiplier = power === 0.8 ? 16 : 21; // 0.8 power vs 0.9 power

  return Math.ceil((multiplier * p * (1 - p)) / (d * d));
}

/**
 * Find the winning variant based on conversion rate
 */
export function findWinningVariant(
  variantMetrics: VariantMetrics[]
): VariantName | null {
  if (variantMetrics.length === 0) {
    return null;
  }

  let maxRate = -1;
  let winner: VariantName | null = null;

  for (const metric of variantMetrics) {
    if (metric.conversionRate > maxRate) {
      maxRate = metric.conversionRate;
      winner = metric.variant;
    }
  }

  return winner;
}

/**
 * Calculate complete statistical significance result
 */
export function calculateSignificance(
  variantMetrics: VariantMetrics[],
  significanceThreshold: number = 0.05
): SignificanceResult {
  // Convert variant metrics to conversion data
  const conversionData: ConversionData[] = variantMetrics.map((m) => ({
    variant: m.variant,
    conversions: m.conversions,
    nonConversions: m.visitors - m.conversions,
    total: m.visitors,
  }));

  const chiSquare = calculateChiSquare(conversionData);
  const df = calculateDegreesOfFreedom(variantMetrics.length);
  const pValue = calculatePValue(chiSquare, df);
  const confidenceLevel = pValueToConfidenceLevel(pValue);
  const isSignificant = isStatisticallySignificant(pValue, significanceThreshold);

  // Calculate baseline conversion rate for sample size recommendation
  const totalVisitors = variantMetrics.reduce((sum, m) => sum + m.visitors, 0);
  const totalConversions = variantMetrics.reduce(
    (sum, m) => sum + m.conversions,
    0
  );
  const baselineRate = totalVisitors > 0 ? totalConversions / totalVisitors : 0;
  const minimumSampleSize = calculateMinimumSampleSize(baselineRate);

  // Find winning variant only if significant
  const winningVariant = isSignificant
    ? findWinningVariant(variantMetrics)
    : null;

  return {
    chiSquare: Math.round(chiSquare * 1000) / 1000,
    degreesOfFreedom: df,
    pValue: Math.round(pValue * 10000) / 10000,
    confidenceLevel,
    isSignificant,
    winningVariant,
    minimumSampleSize,
  };
}

/**
 * Format confidence level for display
 */
export function formatConfidenceLevel(confidenceLevel: number): string {
  if (confidenceLevel >= 99) {
    return "99%+";
  }
  return `${confidenceLevel.toFixed(1)}%`;
}

/**
 * Get significance status text
 */
export function getSignificanceStatus(result: SignificanceResult): string {
  if (result.isSignificant) {
    return `Significant at ${formatConfidenceLevel(result.confidenceLevel)} confidence`;
  }

  if (result.confidenceLevel >= 90) {
    return `Trending (${formatConfidenceLevel(result.confidenceLevel)} confidence)`;
  }

  return "Not yet significant";
}
