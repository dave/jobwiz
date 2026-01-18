/**
 * AB Testing Dashboard Data Module
 * Issue: #44 - AB test dashboard
 *
 * Functions for fetching and aggregating AB test metrics
 */

import type { SupabaseClient } from "@supabase/supabase-js";
import type {
  ExperimentMetrics,
  VariantMetrics,
  DateRange,
  DashboardQueryOptions,
  ExportData,
  PurchaseData,
} from "./dashboard-types";
import type { Experiment, VariantAssignmentRow } from "./types";
import { getExperiment, getAllExperiments } from "./experiments";
import { calculateSignificance } from "./statistics";

/**
 * Get default date range (last 30 days)
 */
export function getDefaultDateRange(): DateRange {
  const end = new Date();
  const start = new Date();
  start.setDate(start.getDate() - 30);

  return {
    start: start.toISOString(),
    end: end.toISOString(),
  };
}

/**
 * Get variant assignments for an experiment within date range
 */
export async function getAssignmentsInRange(
  supabase: SupabaseClient,
  experimentName: string,
  dateRange: DateRange
): Promise<VariantAssignmentRow[]> {
  const { data, error } = await supabase
    .from("variant_assignments")
    .select("*")
    .eq("experiment_name", experimentName)
    .gte("assigned_at", dateRange.start)
    .lte("assigned_at", dateRange.end);

  if (error) {
    throw new Error(`Failed to get assignments: ${error.message}`);
  }

  return data as VariantAssignmentRow[];
}

/**
 * Get purchases within date range
 */
export async function getPurchasesInRange(
  supabase: SupabaseClient,
  dateRange: DateRange
): Promise<PurchaseData[]> {
  const { data, error } = await supabase
    .from("purchases")
    .select("id, user_id, amount, company_slug, role_slug, created_at")
    .eq("status", "completed")
    .gte("created_at", dateRange.start)
    .lte("created_at", dateRange.end);

  if (error) {
    throw new Error(`Failed to get purchases: ${error.message}`);
  }

  return data as PurchaseData[];
}

/**
 * Calculate metrics for a single variant
 */
export function calculateVariantMetrics(
  variant: string,
  assignments: VariantAssignmentRow[],
  purchases: PurchaseData[]
): VariantMetrics {
  // Filter assignments for this variant
  const variantAssignments = assignments.filter((a) => a.variant === variant);
  const visitors = variantAssignments.length;

  // Get user IDs for this variant
  const variantUserIds = new Set(variantAssignments.map((a) => a.user_id));

  // Filter purchases by users in this variant
  const variantPurchases = purchases.filter((p) =>
    variantUserIds.has(p.user_id)
  );

  const conversions = variantPurchases.length;
  const revenue = variantPurchases.reduce((sum, p) => sum + p.amount, 0);

  return {
    variant,
    visitors,
    conversions,
    conversionRate: visitors > 0 ? conversions / visitors : 0,
    revenue,
    revenuePerVisitor: visitors > 0 ? revenue / visitors : 0,
  };
}

/**
 * Get complete experiment metrics
 */
export async function getExperimentMetrics(
  supabase: SupabaseClient,
  options: DashboardQueryOptions
): Promise<ExperimentMetrics> {
  const { experimentName, dateRange = getDefaultDateRange() } = options;

  // Get experiment configuration
  const experiment = await getExperiment(supabase, experimentName);
  if (!experiment) {
    throw new Error(`Experiment not found: ${experimentName}`);
  }

  // Get assignments and purchases in parallel
  const [assignments, purchases] = await Promise.all([
    getAssignmentsInRange(supabase, experimentName, dateRange),
    getPurchasesInRange(supabase, dateRange),
  ]);

  // Calculate metrics per variant
  const variantMetrics = experiment.variants.map((variant) =>
    calculateVariantMetrics(variant, assignments, purchases)
  );

  // Calculate totals
  const totalVisitors = variantMetrics.reduce((sum, m) => sum + m.visitors, 0);
  const totalConversions = variantMetrics.reduce(
    (sum, m) => sum + m.conversions,
    0
  );
  const totalRevenue = variantMetrics.reduce((sum, m) => sum + m.revenue, 0);
  const overallConversionRate =
    totalVisitors > 0 ? totalConversions / totalVisitors : 0;

  // Calculate statistical significance
  const significance = calculateSignificance(variantMetrics);

  return {
    experiment,
    variantMetrics,
    totalVisitors,
    totalConversions,
    totalRevenue,
    overallConversionRate,
    significance,
    dateRange,
    lastUpdated: new Date().toISOString(),
  };
}

/**
 * Get metrics for all experiments
 */
export async function getAllExperimentMetrics(
  supabase: SupabaseClient,
  dateRange?: DateRange
): Promise<ExperimentMetrics[]> {
  const experiments = await getAllExperiments(supabase);

  const metricsPromises = experiments.map((exp) =>
    getExperimentMetrics(supabase, {
      experimentName: exp.name,
      dateRange,
    })
  );

  return Promise.all(metricsPromises);
}

/**
 * Export experiment data to JSON for CSV conversion
 */
export function prepareExportData(metrics: ExperimentMetrics): ExportData {
  return {
    exportedAt: new Date().toISOString(),
    experimentName: metrics.experiment.name,
    dateRange: metrics.dateRange,
    metrics,
  };
}

/**
 * Convert metrics to CSV format
 */
export function metricsToCSV(metrics: ExperimentMetrics): string {
  const headers = [
    "Variant",
    "Visitors",
    "Conversions",
    "Conversion Rate",
    "Revenue (cents)",
    "Revenue Per Visitor",
  ];

  const rows = metrics.variantMetrics.map((m) => [
    m.variant,
    m.visitors.toString(),
    m.conversions.toString(),
    (m.conversionRate * 100).toFixed(2) + "%",
    m.revenue.toString(),
    m.revenuePerVisitor.toFixed(2),
  ]);

  // Add summary row
  rows.push([
    "TOTAL",
    metrics.totalVisitors.toString(),
    metrics.totalConversions.toString(),
    (metrics.overallConversionRate * 100).toFixed(2) + "%",
    metrics.totalRevenue.toString(),
    metrics.totalVisitors > 0
      ? (metrics.totalRevenue / metrics.totalVisitors).toFixed(2)
      : "0",
  ]);

  // Add significance info
  rows.push([]);
  rows.push(["Statistical Significance"]);
  rows.push(["Chi-Square", metrics.significance.chiSquare.toString()]);
  rows.push(["P-Value", metrics.significance.pValue.toString()]);
  rows.push([
    "Confidence Level",
    metrics.significance.confidenceLevel.toFixed(1) + "%",
  ]);
  rows.push(["Significant", metrics.significance.isSignificant ? "Yes" : "No"]);
  if (metrics.significance.winningVariant) {
    rows.push(["Winning Variant", metrics.significance.winningVariant]);
  }

  // Build CSV string
  const csvContent = [headers.join(","), ...rows.map((r) => r.join(","))].join(
    "\n"
  );

  return csvContent;
}

/**
 * Format currency for display (cents to dollars)
 */
export function formatCurrency(cents: number): string {
  return `$${(cents / 100).toFixed(2)}`;
}

/**
 * Format percentage for display
 */
export function formatPercentage(rate: number): string {
  return `${(rate * 100).toFixed(2)}%`;
}

/**
 * Format date range for display
 */
export function formatDateRange(dateRange: DateRange): string {
  const start = new Date(dateRange.start).toLocaleDateString();
  const end = new Date(dateRange.end).toLocaleDateString();
  return `${start} - ${end}`;
}

/**
 * Parse date range from query params
 */
export function parseDateRange(
  startStr: string | null,
  endStr: string | null
): DateRange | undefined {
  if (!startStr || !endStr) {
    return undefined;
  }

  try {
    const start = new Date(startStr);
    const end = new Date(endStr);

    if (isNaN(start.getTime()) || isNaN(end.getTime())) {
      return undefined;
    }

    return {
      start: start.toISOString(),
      end: end.toISOString(),
    };
  } catch {
    return undefined;
  }
}

/**
 * Get preset date ranges
 */
export function getPresetDateRanges(): { label: string; range: DateRange }[] {
  const now = new Date();

  return [
    {
      label: "Last 7 days",
      range: {
        start: new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString(),
        end: now.toISOString(),
      },
    },
    {
      label: "Last 14 days",
      range: {
        start: new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000).toISOString(),
        end: now.toISOString(),
      },
    },
    {
      label: "Last 30 days",
      range: {
        start: new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000).toISOString(),
        end: now.toISOString(),
      },
    },
    {
      label: "Last 90 days",
      range: {
        start: new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000).toISOString(),
        end: now.toISOString(),
      },
    },
    {
      label: "All time",
      range: {
        start: new Date("2020-01-01").toISOString(),
        end: now.toISOString(),
      },
    },
  ];
}
