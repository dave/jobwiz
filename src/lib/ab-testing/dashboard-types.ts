/**
 * AB Testing Dashboard Types
 * Issue: #44 - AB test dashboard
 *
 * Type definitions for AB test metrics and statistics
 */

import type { Experiment, VariantName } from "./types";

/**
 * Metrics for a single variant
 */
export interface VariantMetrics {
  /** Variant name */
  variant: VariantName;
  /** Number of visitors assigned to this variant */
  visitors: number;
  /** Number of conversions (purchases) */
  conversions: number;
  /** Conversion rate (conversions / visitors) */
  conversionRate: number;
  /** Total revenue in cents */
  revenue: number;
  /** Revenue per visitor in cents */
  revenuePerVisitor: number;
}

/**
 * Statistical significance result
 */
export interface SignificanceResult {
  /** Chi-square statistic */
  chiSquare: number;
  /** Degrees of freedom */
  degreesOfFreedom: number;
  /** P-value */
  pValue: number;
  /** Confidence level (e.g., 95%) */
  confidenceLevel: number;
  /** Whether significance threshold is reached */
  isSignificant: boolean;
  /** Winning variant (if significant) */
  winningVariant: VariantName | null;
  /** Minimum sample size recommendation */
  minimumSampleSize?: number;
}

/**
 * Overall experiment metrics
 */
export interface ExperimentMetrics {
  /** Experiment configuration */
  experiment: Experiment;
  /** Metrics per variant */
  variantMetrics: VariantMetrics[];
  /** Total visitors across all variants */
  totalVisitors: number;
  /** Total conversions across all variants */
  totalConversions: number;
  /** Total revenue in cents */
  totalRevenue: number;
  /** Overall conversion rate */
  overallConversionRate: number;
  /** Statistical significance analysis */
  significance: SignificanceResult;
  /** Data range */
  dateRange: DateRange;
  /** Last updated timestamp */
  lastUpdated: string;
}

/**
 * Date range for filtering
 */
export interface DateRange {
  /** Start date (ISO string) */
  start: string;
  /** End date (ISO string) */
  end: string;
}

/**
 * Dashboard query options
 */
export interface DashboardQueryOptions {
  /** Experiment name */
  experimentName: string;
  /** Optional date range filter */
  dateRange?: DateRange;
}

/**
 * Raw data for CSV export
 */
export interface ExportData {
  /** Export timestamp */
  exportedAt: string;
  /** Experiment name */
  experimentName: string;
  /** Date range */
  dateRange: DateRange;
  /** Metrics */
  metrics: ExperimentMetrics;
}

/**
 * Variant conversion data for chi-square test
 */
export interface ConversionData {
  variant: VariantName;
  conversions: number;
  nonConversions: number;
  total: number;
}

/**
 * Purchase data from database
 */
export interface PurchaseData {
  id: string;
  user_id: string;
  amount: number;
  company_slug: string;
  role_slug: string;
  created_at: string;
}

/**
 * Variant assignment with purchase join
 */
export interface AssignmentWithPurchase {
  user_id: string;
  variant: string;
  assigned_at: string;
  purchase_amount: number | null;
}
