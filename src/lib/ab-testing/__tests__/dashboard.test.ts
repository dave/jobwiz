/**
 * Dashboard Data Module Tests
 * Issue: #44 - AB test dashboard
 *
 * Tests for dashboard data fetching and aggregation
 */

import {
  getDefaultDateRange,
  calculateVariantMetrics,
  metricsToCSV,
  formatCurrency,
  formatPercentage,
  formatDateRange,
  parseDateRange,
  getPresetDateRanges,
  prepareExportData,
} from "../dashboard";
import type {
  ExperimentMetrics,
  VariantMetrics,
  DateRange,
} from "../dashboard-types";
import type { VariantAssignmentRow } from "../types";
import type { PurchaseData } from "../dashboard-types";

describe("Dashboard Data Module", () => {
  describe("getDefaultDateRange", () => {
    test("returns date range with start and end", () => {
      const range = getDefaultDateRange();
      expect(range).toHaveProperty("start");
      expect(range).toHaveProperty("end");
    });

    test("start is 30 days before end", () => {
      const range = getDefaultDateRange();
      const start = new Date(range.start);
      const end = new Date(range.end);
      const diffDays = (end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24);
      expect(Math.round(diffDays)).toBe(30);
    });

    test("returns valid ISO strings", () => {
      const range = getDefaultDateRange();
      expect(() => new Date(range.start)).not.toThrow();
      expect(() => new Date(range.end)).not.toThrow();
    });
  });

  describe("calculateVariantMetrics", () => {
    const mockAssignments: VariantAssignmentRow[] = [
      {
        id: "1",
        user_id: "user1",
        experiment_id: "exp1",
        experiment_name: "test",
        variant: "A",
        bucket: 10,
        source: "calculated",
        assigned_at: "2024-01-01T00:00:00Z",
      },
      {
        id: "2",
        user_id: "user2",
        experiment_id: "exp1",
        experiment_name: "test",
        variant: "A",
        bucket: 20,
        source: "calculated",
        assigned_at: "2024-01-01T00:00:00Z",
      },
      {
        id: "3",
        user_id: "user3",
        experiment_id: "exp1",
        experiment_name: "test",
        variant: "B",
        bucket: 60,
        source: "calculated",
        assigned_at: "2024-01-01T00:00:00Z",
      },
    ];

    const mockPurchases: PurchaseData[] = [
      {
        id: "p1",
        user_id: "user1",
        amount: 20000,
        company_slug: "google",
        role_slug: "swe",
        created_at: "2024-01-02T00:00:00Z",
      },
    ];

    test("calculates metrics for variant with conversions", () => {
      const metrics = calculateVariantMetrics("A", mockAssignments, mockPurchases);

      expect(metrics.variant).toBe("A");
      expect(metrics.visitors).toBe(2);
      expect(metrics.conversions).toBe(1);
      expect(metrics.conversionRate).toBe(0.5);
      expect(metrics.revenue).toBe(20000);
      expect(metrics.revenuePerVisitor).toBe(10000);
    });

    test("calculates metrics for variant without conversions", () => {
      const metrics = calculateVariantMetrics("B", mockAssignments, mockPurchases);

      expect(metrics.variant).toBe("B");
      expect(metrics.visitors).toBe(1);
      expect(metrics.conversions).toBe(0);
      expect(metrics.conversionRate).toBe(0);
      expect(metrics.revenue).toBe(0);
      expect(metrics.revenuePerVisitor).toBe(0);
    });

    test("handles variant with no visitors", () => {
      const metrics = calculateVariantMetrics("C", mockAssignments, mockPurchases);

      expect(metrics.visitors).toBe(0);
      expect(metrics.conversions).toBe(0);
      expect(metrics.conversionRate).toBe(0);
      expect(metrics.revenue).toBe(0);
      expect(metrics.revenuePerVisitor).toBe(0);
    });

    test("handles empty assignments", () => {
      const metrics = calculateVariantMetrics("A", [], mockPurchases);

      expect(metrics.visitors).toBe(0);
      expect(metrics.conversions).toBe(0);
    });

    test("handles empty purchases", () => {
      const metrics = calculateVariantMetrics("A", mockAssignments, []);

      expect(metrics.visitors).toBe(2);
      expect(metrics.conversions).toBe(0);
      expect(metrics.revenue).toBe(0);
    });

    test("sums multiple purchases from same user correctly", () => {
      const purchasesMultiple: PurchaseData[] = [
        {
          id: "p1",
          user_id: "user1",
          amount: 10000,
          company_slug: "google",
          role_slug: "swe",
          created_at: "2024-01-02T00:00:00Z",
        },
        {
          id: "p2",
          user_id: "user1",
          amount: 15000,
          company_slug: "amazon",
          role_slug: "pm",
          created_at: "2024-01-03T00:00:00Z",
        },
      ];

      const metrics = calculateVariantMetrics(
        "A",
        mockAssignments,
        purchasesMultiple
      );

      expect(metrics.conversions).toBe(2); // Each purchase is a conversion
      expect(metrics.revenue).toBe(25000);
    });
  });

  describe("metricsToCSV", () => {
    const mockMetrics: ExperimentMetrics = {
      experiment: {
        id: "1",
        name: "paywall_test",
        description: "Test",
        variants: ["A", "B"],
        trafficSplit: { A: 50, B: 50 },
        status: "running",
        createdAt: "2024-01-01T00:00:00Z",
        updatedAt: "2024-01-01T00:00:00Z",
      },
      variantMetrics: [
        {
          variant: "A",
          visitors: 100,
          conversions: 10,
          conversionRate: 0.1,
          revenue: 20000,
          revenuePerVisitor: 200,
        },
        {
          variant: "B",
          visitors: 100,
          conversions: 15,
          conversionRate: 0.15,
          revenue: 30000,
          revenuePerVisitor: 300,
        },
      ],
      totalVisitors: 200,
      totalConversions: 25,
      totalRevenue: 50000,
      overallConversionRate: 0.125,
      significance: {
        chiSquare: 1.333,
        degreesOfFreedom: 1,
        pValue: 0.25,
        confidenceLevel: 75,
        isSignificant: false,
        winningVariant: null,
      },
      dateRange: {
        start: "2024-01-01T00:00:00Z",
        end: "2024-01-31T00:00:00Z",
      },
      lastUpdated: "2024-01-31T12:00:00Z",
    };

    test("generates CSV with header row", () => {
      const csv = metricsToCSV(mockMetrics);
      const lines = csv.split("\n");
      expect(lines[0]).toBe(
        "Variant,Visitors,Conversions,Conversion Rate,Revenue (cents),Revenue Per Visitor"
      );
    });

    test("includes variant rows", () => {
      const csv = metricsToCSV(mockMetrics);
      expect(csv).toContain("A,100,10,10.00%,20000,200.00");
      expect(csv).toContain("B,100,15,15.00%,30000,300.00");
    });

    test("includes total row", () => {
      const csv = metricsToCSV(mockMetrics);
      expect(csv).toContain("TOTAL,200,25,12.50%,50000,");
    });

    test("includes significance info", () => {
      const csv = metricsToCSV(mockMetrics);
      expect(csv).toContain("Statistical Significance");
      expect(csv).toContain("Chi-Square,1.333");
      expect(csv).toContain("P-Value,0.25");
      expect(csv).toContain("Confidence Level,75.0%");
      expect(csv).toContain("Significant,No");
    });

    test("includes winning variant when significant", () => {
      const metricsWithWinner = {
        ...mockMetrics,
        significance: {
          ...mockMetrics.significance,
          isSignificant: true,
          winningVariant: "B",
        },
      };
      const csv = metricsToCSV(metricsWithWinner);
      expect(csv).toContain("Significant,Yes");
      expect(csv).toContain("Winning Variant,B");
    });
  });

  describe("formatCurrency", () => {
    test("formats cents to dollars", () => {
      expect(formatCurrency(20000)).toBe("$200.00");
      expect(formatCurrency(100)).toBe("$1.00");
      expect(formatCurrency(99)).toBe("$0.99");
    });

    test("handles zero", () => {
      expect(formatCurrency(0)).toBe("$0.00");
    });

    test("handles large amounts", () => {
      expect(formatCurrency(1000000)).toBe("$10000.00");
    });
  });

  describe("formatPercentage", () => {
    test("formats rate as percentage", () => {
      expect(formatPercentage(0.1)).toBe("10.00%");
      expect(formatPercentage(0.05)).toBe("5.00%");
      expect(formatPercentage(1)).toBe("100.00%");
    });

    test("handles zero", () => {
      expect(formatPercentage(0)).toBe("0.00%");
    });

    test("handles small values", () => {
      expect(formatPercentage(0.001)).toBe("0.10%");
    });
  });

  describe("formatDateRange", () => {
    test("formats date range for display", () => {
      const range: DateRange = {
        start: "2024-01-01T00:00:00Z",
        end: "2024-01-31T00:00:00Z",
      };
      const formatted = formatDateRange(range);
      // Date format is locale-dependent, just check it contains separator and dates
      expect(formatted).toContain(" - ");
      expect(formatted.length).toBeGreaterThan(10);
    });
  });

  describe("parseDateRange", () => {
    test("returns undefined for null values", () => {
      expect(parseDateRange(null, null)).toBeUndefined();
      expect(parseDateRange("2024-01-01", null)).toBeUndefined();
      expect(parseDateRange(null, "2024-01-31")).toBeUndefined();
    });

    test("parses valid date strings", () => {
      const result = parseDateRange("2024-01-01", "2024-01-31");
      expect(result).toBeDefined();
      expect(result?.start).toContain("2024-01-01");
      expect(result?.end).toContain("2024-01-31");
    });

    test("returns undefined for invalid date strings", () => {
      expect(parseDateRange("invalid", "2024-01-31")).toBeUndefined();
      expect(parseDateRange("2024-01-01", "invalid")).toBeUndefined();
    });
  });

  describe("getPresetDateRanges", () => {
    test("returns array of preset ranges", () => {
      const presets = getPresetDateRanges();
      expect(Array.isArray(presets)).toBe(true);
      expect(presets.length).toBeGreaterThan(0);
    });

    test("each preset has label and range", () => {
      const presets = getPresetDateRanges();
      presets.forEach((preset) => {
        expect(preset).toHaveProperty("label");
        expect(preset).toHaveProperty("range");
        expect(preset.range).toHaveProperty("start");
        expect(preset.range).toHaveProperty("end");
      });
    });

    test("includes expected presets", () => {
      const presets = getPresetDateRanges();
      const labels = presets.map((p) => p.label);
      expect(labels).toContain("Last 7 days");
      expect(labels).toContain("Last 30 days");
      expect(labels).toContain("All time");
    });

    test("ranges have valid dates", () => {
      const presets = getPresetDateRanges();
      presets.forEach((preset) => {
        const start = new Date(preset.range.start);
        const end = new Date(preset.range.end);
        expect(start.getTime()).toBeLessThan(end.getTime());
      });
    });
  });

  describe("prepareExportData", () => {
    const mockMetrics: ExperimentMetrics = {
      experiment: {
        id: "1",
        name: "test",
        description: "Test",
        variants: ["A", "B"],
        trafficSplit: { A: 50, B: 50 },
        status: "running",
        createdAt: "2024-01-01T00:00:00Z",
        updatedAt: "2024-01-01T00:00:00Z",
      },
      variantMetrics: [],
      totalVisitors: 0,
      totalConversions: 0,
      totalRevenue: 0,
      overallConversionRate: 0,
      significance: {
        chiSquare: 0,
        degreesOfFreedom: 1,
        pValue: 1,
        confidenceLevel: 0,
        isSignificant: false,
        winningVariant: null,
      },
      dateRange: {
        start: "2024-01-01T00:00:00Z",
        end: "2024-01-31T00:00:00Z",
      },
      lastUpdated: "2024-01-31T12:00:00Z",
    };

    test("includes exportedAt timestamp", () => {
      const data = prepareExportData(mockMetrics);
      expect(data.exportedAt).toBeDefined();
      expect(() => new Date(data.exportedAt)).not.toThrow();
    });

    test("includes experiment name", () => {
      const data = prepareExportData(mockMetrics);
      expect(data.experimentName).toBe("test");
    });

    test("includes date range", () => {
      const data = prepareExportData(mockMetrics);
      expect(data.dateRange).toEqual(mockMetrics.dateRange);
    });

    test("includes full metrics", () => {
      const data = prepareExportData(mockMetrics);
      expect(data.metrics).toEqual(mockMetrics);
    });
  });
});
