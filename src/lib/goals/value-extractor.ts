import type { ChartDataForGoal } from "./types";

/**
 * Extract current value from chart (last data point)
 */
export function extractCurrentValue(chart: ChartDataForGoal): number | null {
  const { chartData, dataKeys } = chart;
  if (!chartData?.length || !dataKeys?.length) return null;

  const lastPoint = chartData[chartData.length - 1];
  const primaryKey = dataKeys[0];
  if (!lastPoint || !primaryKey) return null;

  const value = lastPoint[primaryKey];
  return typeof value === "number" ? value : null;
}

/**
 * Extract baseline value (stored or from first data point)
 */
export function extractBaselineValue(
  chart: ChartDataForGoal,
  storedBaseline: number | null,
): number | null {
  if (storedBaseline !== null) return storedBaseline;

  const { chartData, dataKeys } = chart;
  if (!chartData?.length || !dataKeys?.length) return null;

  const firstPoint = chartData[0];
  const primaryKey = dataKeys[0];
  if (!firstPoint || !primaryKey) return null;

  const value = firstPoint[primaryKey];
  return typeof value === "number" ? value : null;
}

/**
 * Extract all numeric values for trend analysis
 */
export function extractAllValues(chart: ChartDataForGoal): number[] {
  const { chartData, dataKeys } = chart;
  if (!chartData || !dataKeys?.length) return [];

  const primaryKey = dataKeys[0];
  if (!primaryKey) return [];

  return chartData
    .map((point) => point[primaryKey])
    .filter((v): v is number => typeof v === "number");
}
