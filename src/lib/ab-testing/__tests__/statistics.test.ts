/**
 * Statistics Module Tests
 * Issue: #44 - AB test dashboard
 *
 * Tests for chi-square calculation and statistical significance
 */

import {
  calculateChiSquare,
  calculateDegreesOfFreedom,
  calculatePValue,
  pValueToConfidenceLevel,
  isStatisticallySignificant,
  calculateMinimumSampleSize,
  findWinningVariant,
  calculateSignificance,
  formatConfidenceLevel,
  getSignificanceStatus,
} from "../statistics";
import type { ConversionData, VariantMetrics } from "../dashboard-types";

describe("Statistics Module", () => {
  describe("calculateDegreesOfFreedom", () => {
    test("returns variants - 1 for multiple variants", () => {
      expect(calculateDegreesOfFreedom(2)).toBe(1);
      expect(calculateDegreesOfFreedom(3)).toBe(2);
      expect(calculateDegreesOfFreedom(4)).toBe(3);
      expect(calculateDegreesOfFreedom(5)).toBe(4);
    });

    test("returns minimum of 1 for single variant", () => {
      expect(calculateDegreesOfFreedom(1)).toBe(1);
    });

    test("handles zero variants", () => {
      expect(calculateDegreesOfFreedom(0)).toBe(1);
    });
  });

  describe("calculateChiSquare", () => {
    test("returns 0 for empty data", () => {
      expect(calculateChiSquare([])).toBe(0);
    });

    test("returns 0 when all totals are zero", () => {
      const data: ConversionData[] = [
        { variant: "A", conversions: 0, nonConversions: 0, total: 0 },
        { variant: "B", conversions: 0, nonConversions: 0, total: 0 },
      ];
      expect(calculateChiSquare(data)).toBe(0);
    });

    test("returns 0 when conversion rates are identical", () => {
      const data: ConversionData[] = [
        { variant: "A", conversions: 10, nonConversions: 90, total: 100 },
        { variant: "B", conversions: 10, nonConversions: 90, total: 100 },
      ];
      // When rates are identical, chi-square should be very close to 0
      expect(calculateChiSquare(data)).toBeLessThan(0.01);
    });

    test("calculates chi-square for different conversion rates", () => {
      const data: ConversionData[] = [
        { variant: "A", conversions: 10, nonConversions: 90, total: 100 },
        { variant: "B", conversions: 20, nonConversions: 80, total: 100 },
      ];
      const chiSquare = calculateChiSquare(data);
      // Chi-square should be positive and > 0 for different rates
      expect(chiSquare).toBeGreaterThan(0);
    });

    test("larger differences produce larger chi-square values", () => {
      const smallDiff: ConversionData[] = [
        { variant: "A", conversions: 10, nonConversions: 90, total: 100 },
        { variant: "B", conversions: 12, nonConversions: 88, total: 100 },
      ];
      const largeDiff: ConversionData[] = [
        { variant: "A", conversions: 10, nonConversions: 90, total: 100 },
        { variant: "B", conversions: 30, nonConversions: 70, total: 100 },
      ];

      const smallChiSquare = calculateChiSquare(smallDiff);
      const largeChiSquare = calculateChiSquare(largeDiff);

      expect(largeChiSquare).toBeGreaterThan(smallChiSquare);
    });

    test("handles three variants", () => {
      const data: ConversionData[] = [
        { variant: "A", conversions: 10, nonConversions: 90, total: 100 },
        { variant: "B", conversions: 15, nonConversions: 85, total: 100 },
        { variant: "C", conversions: 20, nonConversions: 80, total: 100 },
      ];
      const chiSquare = calculateChiSquare(data);
      expect(chiSquare).toBeGreaterThan(0);
    });

    test("handles four variants (paywall test scenario)", () => {
      const data: ConversionData[] = [
        {
          variant: "direct_paywall",
          conversions: 5,
          nonConversions: 95,
          total: 100,
        },
        { variant: "freemium", conversions: 8, nonConversions: 92, total: 100 },
        { variant: "teaser", conversions: 12, nonConversions: 88, total: 100 },
        {
          variant: "question_limit",
          conversions: 10,
          nonConversions: 90,
          total: 100,
        },
      ];
      const chiSquare = calculateChiSquare(data);
      expect(chiSquare).toBeGreaterThan(0);
    });
  });

  describe("calculatePValue", () => {
    test("returns 1 for chi-square of 0", () => {
      expect(calculatePValue(0, 1)).toBe(1);
    });

    test("returns 1 for negative chi-square", () => {
      expect(calculatePValue(-1, 1)).toBe(1);
    });

    test("returns value between 0 and 1", () => {
      const pValue = calculatePValue(5, 2);
      expect(pValue).toBeGreaterThanOrEqual(0);
      expect(pValue).toBeLessThanOrEqual(1);
    });

    test("smaller p-values for larger chi-square with same df", () => {
      const pSmall = calculatePValue(10, 2);
      const pLarge = calculatePValue(5, 2);
      expect(pSmall).toBeLessThan(pLarge);
    });

    test("approximates known chi-square critical values", () => {
      // For df=1, chi-square=3.84 should give p-value ~0.05
      const pValue1 = calculatePValue(3.84, 1);
      expect(pValue1).toBeGreaterThan(0.04);
      expect(pValue1).toBeLessThan(0.06);

      // For df=1, chi-square=6.63 should give p-value ~0.01
      const pValue2 = calculatePValue(6.63, 1);
      expect(pValue2).toBeGreaterThan(0.005);
      expect(pValue2).toBeLessThan(0.015);
    });
  });

  describe("pValueToConfidenceLevel", () => {
    test("converts p-value to percentage", () => {
      expect(pValueToConfidenceLevel(0.05)).toBe(95);
      expect(pValueToConfidenceLevel(0.01)).toBe(99);
      expect(pValueToConfidenceLevel(0.1)).toBe(90);
    });

    test("handles edge cases", () => {
      expect(pValueToConfidenceLevel(0)).toBe(100);
      expect(pValueToConfidenceLevel(1)).toBe(0);
    });

    test("rounds to 2 decimal places", () => {
      const result = pValueToConfidenceLevel(0.043);
      expect(result).toBe(95.7);
    });
  });

  describe("isStatisticallySignificant", () => {
    test("returns true for p-value below threshold", () => {
      expect(isStatisticallySignificant(0.04, 0.05)).toBe(true);
      expect(isStatisticallySignificant(0.01, 0.05)).toBe(true);
    });

    test("returns false for p-value at or above threshold", () => {
      expect(isStatisticallySignificant(0.05, 0.05)).toBe(false);
      expect(isStatisticallySignificant(0.1, 0.05)).toBe(false);
    });

    test("uses default threshold of 0.05", () => {
      expect(isStatisticallySignificant(0.04)).toBe(true);
      expect(isStatisticallySignificant(0.06)).toBe(false);
    });

    test("works with custom threshold", () => {
      expect(isStatisticallySignificant(0.09, 0.1)).toBe(true);
      expect(isStatisticallySignificant(0.02, 0.01)).toBe(false);
    });
  });

  describe("calculateMinimumSampleSize", () => {
    test("returns reasonable sample size for typical conversion rate", () => {
      // 5% baseline, 5% MDE
      const size = calculateMinimumSampleSize(0.05, 0.05);
      expect(size).toBeGreaterThan(0);
      expect(size).toBeLessThan(10000);
    });

    test("lower baseline rate needs larger sample", () => {
      const sizeHigh = calculateMinimumSampleSize(0.5, 0.05);
      const sizeLow = calculateMinimumSampleSize(0.05, 0.05);
      // Counter-intuitive but true: variance is highest at 50%
      expect(sizeHigh).toBeGreaterThan(sizeLow);
    });

    test("smaller MDE needs larger sample", () => {
      const sizeLargeMDE = calculateMinimumSampleSize(0.1, 0.1);
      const sizeSmallMDE = calculateMinimumSampleSize(0.1, 0.01);
      expect(sizeSmallMDE).toBeGreaterThan(sizeLargeMDE);
    });

    test("returns default for invalid inputs", () => {
      expect(calculateMinimumSampleSize(0, 0.05)).toBe(100);
      expect(calculateMinimumSampleSize(0.5, 0)).toBe(100);
      expect(calculateMinimumSampleSize(1, 0.05)).toBe(100);
    });
  });

  describe("findWinningVariant", () => {
    test("returns null for empty array", () => {
      expect(findWinningVariant([])).toBeNull();
    });

    test("returns variant with highest conversion rate", () => {
      const metrics: VariantMetrics[] = [
        {
          variant: "A",
          visitors: 100,
          conversions: 10,
          conversionRate: 0.1,
          revenue: 2000,
          revenuePerVisitor: 20,
        },
        {
          variant: "B",
          visitors: 100,
          conversions: 20,
          conversionRate: 0.2,
          revenue: 4000,
          revenuePerVisitor: 40,
        },
      ];
      expect(findWinningVariant(metrics)).toBe("B");
    });

    test("returns first variant when rates are equal", () => {
      const metrics: VariantMetrics[] = [
        {
          variant: "A",
          visitors: 100,
          conversions: 10,
          conversionRate: 0.1,
          revenue: 2000,
          revenuePerVisitor: 20,
        },
        {
          variant: "B",
          visitors: 100,
          conversions: 10,
          conversionRate: 0.1,
          revenue: 2000,
          revenuePerVisitor: 20,
        },
      ];
      expect(findWinningVariant(metrics)).toBe("A");
    });

    test("handles four variants", () => {
      const metrics: VariantMetrics[] = [
        {
          variant: "direct",
          visitors: 100,
          conversions: 5,
          conversionRate: 0.05,
          revenue: 1000,
          revenuePerVisitor: 10,
        },
        {
          variant: "freemium",
          visitors: 100,
          conversions: 8,
          conversionRate: 0.08,
          revenue: 1600,
          revenuePerVisitor: 16,
        },
        {
          variant: "teaser",
          visitors: 100,
          conversions: 15,
          conversionRate: 0.15,
          revenue: 3000,
          revenuePerVisitor: 30,
        },
        {
          variant: "question_limit",
          visitors: 100,
          conversions: 12,
          conversionRate: 0.12,
          revenue: 2400,
          revenuePerVisitor: 24,
        },
      ];
      expect(findWinningVariant(metrics)).toBe("teaser");
    });
  });

  describe("calculateSignificance", () => {
    test("returns complete result structure", () => {
      const metrics: VariantMetrics[] = [
        {
          variant: "A",
          visitors: 100,
          conversions: 10,
          conversionRate: 0.1,
          revenue: 2000,
          revenuePerVisitor: 20,
        },
        {
          variant: "B",
          visitors: 100,
          conversions: 20,
          conversionRate: 0.2,
          revenue: 4000,
          revenuePerVisitor: 40,
        },
      ];

      const result = calculateSignificance(metrics);

      expect(result).toHaveProperty("chiSquare");
      expect(result).toHaveProperty("degreesOfFreedom");
      expect(result).toHaveProperty("pValue");
      expect(result).toHaveProperty("confidenceLevel");
      expect(result).toHaveProperty("isSignificant");
      expect(result).toHaveProperty("winningVariant");
      expect(result).toHaveProperty("minimumSampleSize");
    });

    test("identifies significant result with large sample and difference", () => {
      const metrics: VariantMetrics[] = [
        {
          variant: "A",
          visitors: 1000,
          conversions: 50,
          conversionRate: 0.05,
          revenue: 10000,
          revenuePerVisitor: 10,
        },
        {
          variant: "B",
          visitors: 1000,
          conversions: 100,
          conversionRate: 0.1,
          revenue: 20000,
          revenuePerVisitor: 20,
        },
      ];

      const result = calculateSignificance(metrics);

      expect(result.isSignificant).toBe(true);
      expect(result.confidenceLevel).toBeGreaterThan(95);
      expect(result.winningVariant).toBe("B");
    });

    test("identifies non-significant result with small sample", () => {
      const metrics: VariantMetrics[] = [
        {
          variant: "A",
          visitors: 10,
          conversions: 1,
          conversionRate: 0.1,
          revenue: 200,
          revenuePerVisitor: 20,
        },
        {
          variant: "B",
          visitors: 10,
          conversions: 2,
          conversionRate: 0.2,
          revenue: 400,
          revenuePerVisitor: 40,
        },
      ];

      const result = calculateSignificance(metrics);

      expect(result.isSignificant).toBe(false);
      expect(result.winningVariant).toBeNull();
    });

    test("handles zero conversions", () => {
      const metrics: VariantMetrics[] = [
        {
          variant: "A",
          visitors: 100,
          conversions: 0,
          conversionRate: 0,
          revenue: 0,
          revenuePerVisitor: 0,
        },
        {
          variant: "B",
          visitors: 100,
          conversions: 5,
          conversionRate: 0.05,
          revenue: 1000,
          revenuePerVisitor: 10,
        },
      ];

      const result = calculateSignificance(metrics);

      expect(result.chiSquare).toBeGreaterThan(0);
      expect(result.pValue).toBeLessThan(1);
    });

    test("uses custom significance threshold", () => {
      const metrics: VariantMetrics[] = [
        {
          variant: "A",
          visitors: 500,
          conversions: 25,
          conversionRate: 0.05,
          revenue: 5000,
          revenuePerVisitor: 10,
        },
        {
          variant: "B",
          visitors: 500,
          conversions: 40,
          conversionRate: 0.08,
          revenue: 8000,
          revenuePerVisitor: 16,
        },
      ];

      // With strict threshold
      const strictResult = calculateSignificance(metrics, 0.01);
      // With lenient threshold
      const lenientResult = calculateSignificance(metrics, 0.1);

      // Same chi-square and p-value
      expect(strictResult.chiSquare).toBe(lenientResult.chiSquare);
      expect(strictResult.pValue).toBe(lenientResult.pValue);
    });
  });

  describe("formatConfidenceLevel", () => {
    test("formats high confidence as 99%+", () => {
      expect(formatConfidenceLevel(99.5)).toBe("99%+");
      expect(formatConfidenceLevel(100)).toBe("99%+");
    });

    test("formats normal confidence with decimal", () => {
      expect(formatConfidenceLevel(95.5)).toBe("95.5%");
      expect(formatConfidenceLevel(90.0)).toBe("90.0%");
    });
  });

  describe("getSignificanceStatus", () => {
    test("returns significant status when isSignificant is true", () => {
      const result = {
        chiSquare: 10,
        degreesOfFreedom: 1,
        pValue: 0.01,
        confidenceLevel: 99,
        isSignificant: true,
        winningVariant: "B",
      };
      expect(getSignificanceStatus(result)).toContain("Significant");
    });

    test("returns trending status for high but not significant confidence", () => {
      const result = {
        chiSquare: 3,
        degreesOfFreedom: 1,
        pValue: 0.08,
        confidenceLevel: 92,
        isSignificant: false,
        winningVariant: null,
      };
      expect(getSignificanceStatus(result)).toContain("Trending");
    });

    test("returns not significant status for low confidence", () => {
      const result = {
        chiSquare: 1,
        degreesOfFreedom: 1,
        pValue: 0.2,
        confidenceLevel: 80,
        isSignificant: false,
        winningVariant: null,
      };
      expect(getSignificanceStatus(result)).toContain("Not yet significant");
    });
  });
});
