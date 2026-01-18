"use client";

/**
 * AB Test Dashboard Component
 * Issue: #44 - AB test dashboard
 *
 * Displays AB test metrics with statistical significance analysis
 */

import { useState, useEffect, useCallback } from "react";
import { createBrowserClient } from "@supabase/ssr";
import type { ExperimentMetrics, DateRange } from "@/lib/ab-testing";
import {
  getExperimentMetrics,
  getAllExperiments,
  getDefaultDateRange,
  getPresetDateRanges,
  metricsToCSV,
  formatCurrency,
  formatPercentage,
  formatDateRange,
} from "@/lib/ab-testing";
import type { Experiment } from "@/lib/ab-testing";

export function ABTestDashboard() {
  const [experiments, setExperiments] = useState<Experiment[]>([]);
  const [selectedExperiment, setSelectedExperiment] = useState<string>("");
  const [metrics, setMetrics] = useState<ExperimentMetrics | null>(null);
  const [dateRange, setDateRange] = useState<DateRange>(getDefaultDateRange());
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [autoRefresh, setAutoRefresh] = useState(false);

  // Create Supabase client
  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL ?? "",
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? ""
  );

  // Load experiments list
  useEffect(() => {
    async function loadExperiments() {
      try {
        const exps = await getAllExperiments(supabase);
        setExperiments(exps);
        if (exps.length > 0 && !selectedExperiment) {
          // Default to first running experiment or first experiment
          const running = exps.find((e) => e.status === "running");
          const firstExp = exps[0];
          setSelectedExperiment(running?.name ?? firstExp?.name ?? "");
        }
      } catch (err) {
        setError(
          err instanceof Error ? err.message : "Failed to load experiments"
        );
      }
    }
    loadExperiments();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Load metrics when experiment or date range changes
  const loadMetrics = useCallback(async () => {
    if (!selectedExperiment) {
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const data = await getExperimentMetrics(supabase, {
        experimentName: selectedExperiment,
        dateRange,
      });
      setMetrics(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load metrics");
    } finally {
      setLoading(false);
    }
  }, [selectedExperiment, dateRange, supabase]);

  useEffect(() => {
    loadMetrics();
  }, [loadMetrics]);

  // Auto-refresh
  useEffect(() => {
    if (!autoRefresh) return;

    const interval = setInterval(loadMetrics, 30000); // 30 seconds
    return () => clearInterval(interval);
  }, [autoRefresh, loadMetrics]);

  // Export to CSV
  const handleExport = () => {
    if (!metrics) return;

    const csv = metricsToCSV(metrics);
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `ab-test-${metrics.experiment.name}-${new Date().toISOString().split("T")[0]}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  // Date range presets
  const presets = getPresetDateRanges();

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <h1 className="text-2xl font-bold text-gray-900">AB Test Dashboard</h1>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Controls */}
        <div className="bg-white shadow rounded-lg p-6 mb-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Experiment selector */}
            <div>
              <label
                htmlFor="experiment"
                className="block text-sm font-medium text-gray-700 mb-1"
              >
                Experiment
              </label>
              <select
                id="experiment"
                value={selectedExperiment}
                onChange={(e) => setSelectedExperiment(e.target.value)}
                className="w-full border border-gray-300 rounded-md px-3 py-2 focus:ring-blue-500 focus:border-blue-500"
              >
                {experiments.map((exp) => (
                  <option key={exp.id} value={exp.name}>
                    {exp.name} ({exp.status})
                  </option>
                ))}
              </select>
            </div>

            {/* Date range */}
            <div>
              <label
                htmlFor="dateRange"
                className="block text-sm font-medium text-gray-700 mb-1"
              >
                Date Range
              </label>
              <select
                id="dateRange"
                value={presets.findIndex(
                  (p) =>
                    p.range.start === dateRange.start &&
                    p.range.end === dateRange.end
                )}
                onChange={(e) => {
                  const idx = parseInt(e.target.value);
                  const preset = presets[idx];
                  if (idx >= 0 && idx < presets.length && preset) {
                    setDateRange(preset.range);
                  }
                }}
                className="w-full border border-gray-300 rounded-md px-3 py-2 focus:ring-blue-500 focus:border-blue-500"
              >
                {presets.map((preset, idx) => (
                  <option key={preset.label} value={idx}>
                    {preset.label}
                  </option>
                ))}
              </select>
            </div>

            {/* Actions */}
            <div className="flex items-end gap-2">
              <button
                onClick={loadMetrics}
                disabled={loading}
                className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50"
              >
                {loading ? "Loading..." : "Refresh"}
              </button>
              <button
                onClick={handleExport}
                disabled={!metrics}
                className="px-4 py-2 bg-gray-600 text-white rounded-md hover:bg-gray-700 disabled:opacity-50"
              >
                Export CSV
              </button>
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={autoRefresh}
                  onChange={(e) => setAutoRefresh(e.target.checked)}
                  className="rounded"
                />
                Auto-refresh
              </label>
            </div>
          </div>
        </div>

        {/* Error display */}
        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg mb-6">
            {error}
          </div>
        )}

        {/* Loading state */}
        {loading && !metrics && (
          <div className="bg-white shadow rounded-lg p-12 text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto" />
            <p className="mt-4 text-gray-600">Loading metrics...</p>
          </div>
        )}

        {/* Metrics display */}
        {metrics && (
          <>
            {/* Summary cards */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
              <SummaryCard
                title="Total Visitors"
                value={metrics.totalVisitors.toLocaleString()}
              />
              <SummaryCard
                title="Total Conversions"
                value={metrics.totalConversions.toLocaleString()}
              />
              <SummaryCard
                title="Conversion Rate"
                value={formatPercentage(metrics.overallConversionRate)}
              />
              <SummaryCard
                title="Total Revenue"
                value={formatCurrency(metrics.totalRevenue)}
              />
            </div>

            {/* Variant metrics table */}
            <div className="bg-white shadow rounded-lg overflow-hidden mb-6">
              <div className="px-6 py-4 border-b border-gray-200">
                <h2 className="text-lg font-semibold text-gray-900">
                  Variant Performance
                </h2>
                <p className="text-sm text-gray-500">
                  {formatDateRange(metrics.dateRange)}
                </p>
              </div>
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Variant
                      </th>
                      <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Visitors
                      </th>
                      <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Conversions
                      </th>
                      <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Conv. Rate
                      </th>
                      <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Revenue
                      </th>
                      <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Rev/Visitor
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {metrics.variantMetrics.map((vm) => (
                      <tr
                        key={vm.variant}
                        className={
                          vm.variant === metrics.significance.winningVariant
                            ? "bg-green-50"
                            : ""
                        }
                      >
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                          {vm.variant}
                          {vm.variant === metrics.significance.winningVariant && (
                            <span className="ml-2 px-2 py-1 bg-green-100 text-green-800 text-xs rounded-full">
                              Winner
                            </span>
                          )}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 text-right">
                          {vm.visitors.toLocaleString()}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 text-right">
                          {vm.conversions.toLocaleString()}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 text-right">
                          {formatPercentage(vm.conversionRate)}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 text-right">
                          {formatCurrency(vm.revenue)}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 text-right">
                          {formatCurrency(vm.revenuePerVisitor)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Statistical Significance */}
            <div className="bg-white shadow rounded-lg p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">
                Statistical Significance
              </h2>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Significance indicator */}
                <div>
                  <div
                    className={`p-4 rounded-lg ${
                      metrics.significance.isSignificant
                        ? "bg-green-100 border border-green-300"
                        : metrics.significance.confidenceLevel >= 90
                          ? "bg-yellow-100 border border-yellow-300"
                          : "bg-gray-100 border border-gray-300"
                    }`}
                  >
                    <div className="text-2xl font-bold mb-1">
                      {metrics.significance.confidenceLevel.toFixed(1)}%
                    </div>
                    <div className="text-sm font-medium">
                      {metrics.significance.isSignificant
                        ? "Statistically Significant"
                        : metrics.significance.confidenceLevel >= 90
                          ? "Trending (not yet significant)"
                          : "Not yet significant"}
                    </div>
                    {metrics.significance.winningVariant && (
                      <div className="mt-2 text-sm">
                        Winner:{" "}
                        <span className="font-semibold">
                          {metrics.significance.winningVariant}
                        </span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Stats details */}
                <div className="space-y-2">
                  <StatRow
                    label="Chi-Square Statistic"
                    value={metrics.significance.chiSquare.toFixed(3)}
                  />
                  <StatRow
                    label="P-Value"
                    value={metrics.significance.pValue.toFixed(4)}
                  />
                  <StatRow
                    label="Degrees of Freedom"
                    value={metrics.significance.degreesOfFreedom.toString()}
                  />
                  {metrics.significance.minimumSampleSize && (
                    <StatRow
                      label="Recommended Sample Size (per variant)"
                      value={metrics.significance.minimumSampleSize.toLocaleString()}
                    />
                  )}
                </div>
              </div>

              {/* Interpretation guide */}
              <div className="mt-6 p-4 bg-blue-50 rounded-lg text-sm text-blue-800">
                <h3 className="font-medium mb-2">Interpretation Guide</h3>
                <ul className="list-disc list-inside space-y-1">
                  <li>
                    <strong>95%+ confidence:</strong> Results are statistically
                    significant. The winner can be declared.
                  </li>
                  <li>
                    <strong>90-95% confidence:</strong> Results are trending but
                    not conclusive. Continue the test.
                  </li>
                  <li>
                    <strong>Below 90%:</strong> Not enough data to draw
                    conclusions. Need more samples.
                  </li>
                </ul>
              </div>
            </div>

            {/* Last updated */}
            <p className="text-sm text-gray-500 mt-4 text-right">
              Last updated: {new Date(metrics.lastUpdated).toLocaleString()}
            </p>
          </>
        )}

        {/* No experiments state */}
        {!loading && experiments.length === 0 && (
          <div className="bg-white shadow rounded-lg p-12 text-center">
            <p className="text-gray-600">No experiments found.</p>
            <p className="text-sm text-gray-500 mt-2">
              Create an experiment to start tracking AB tests.
            </p>
          </div>
        )}
      </main>
    </div>
  );
}

// Summary card component
function SummaryCard({ title, value }: { title: string; value: string }) {
  return (
    <div className="bg-white shadow rounded-lg p-6">
      <div className="text-sm text-gray-500">{title}</div>
      <div className="text-2xl font-bold text-gray-900">{value}</div>
    </div>
  );
}

// Stat row component
function StatRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between py-2 border-b border-gray-100">
      <span className="text-sm text-gray-600">{label}</span>
      <span className="text-sm font-medium text-gray-900">{value}</span>
    </div>
  );
}
