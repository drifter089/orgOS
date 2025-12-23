import type { ChartDataForGoal } from "./types";

/**
 * Get the primary data key to use for goal calculations.
 * Uses selectedDimension if provided and valid, otherwise falls back to dataKeys[0].
 */
function getPrimaryKey(chart: ChartDataForGoal): string | null {
  const { dataKeys, selectedDimension } = chart;
  if (!dataKeys?.length) return null;

  // Use selectedDimension if provided and exists in dataKeys
  if (selectedDimension && dataKeys.includes(selectedDimension)) {
    return selectedDimension;
  }

  return dataKeys[0] ?? null;
}

/**
 * Extract current value from chart (last data point)
 */
export function extractCurrentValue(chart: ChartDataForGoal): number | null {
  const { chartData } = chart;
  if (!chartData?.length) return null;

  const lastPoint = chartData[chartData.length - 1];
  const primaryKey = getPrimaryKey(chart);
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

  const { chartData } = chart;
  if (!chartData?.length) return null;

  const firstPoint = chartData[0];
  const primaryKey = getPrimaryKey(chart);
  if (!firstPoint || !primaryKey) return null;

  const value = firstPoint[primaryKey];
  return typeof value === "number" ? value : null;
}

/**
 * Extract all numeric values for trend analysis
 */
export function extractAllValues(chart: ChartDataForGoal): number[] {
  const { chartData } = chart;
  if (!chartData) return [];

  const primaryKey = getPrimaryKey(chart);
  if (!primaryKey) return [];

  return chartData
    .map((point) => point[primaryKey])
    .filter((v): v is number => typeof v === "number");
}
