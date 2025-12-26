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

/**
 * Helper to round to a nice number for slider display
 */
function roundToNice(value: number, roundUp: boolean): number {
  if (value === 0) return 0;

  const magnitude = Math.pow(10, Math.floor(Math.log10(Math.abs(value))));
  const normalized = value / magnitude;

  // Nice numbers: 1, 2, 5, 10
  const niceNumbers = [1, 2, 5, 10];

  if (roundUp) {
    const nice = niceNumbers.find((n) => n >= normalized) ?? 10;
    return nice * magnitude;
  } else {
    const nice = [...niceNumbers].reverse().find((n) => n <= normalized) ?? 1;
    return nice * magnitude;
  }
}

export interface SuggestedRange {
  suggestedMin: number;
  suggestedMax: number;
}

/**
 * Calculate suggested min/max range for goal slider based on chart data.
 * Uses current value and data distribution to suggest reasonable bounds.
 */
export function calculateSuggestedRange(
  chart: ChartDataForGoal,
  goalType: "ABSOLUTE" | "RELATIVE",
): SuggestedRange {
  // For RELATIVE goals (percentage), use fixed range
  if (goalType === "RELATIVE") {
    return {
      suggestedMin: 0,
      suggestedMax: 100,
    };
  }

  // For ABSOLUTE goals, calculate based on data
  const allValues = extractAllValues(chart);

  if (allValues.length === 0) {
    return {
      suggestedMin: 0,
      suggestedMax: 100,
    };
  }

  const currentValue = allValues[allValues.length - 1] ?? 0;
  const minValue = Math.min(...allValues);
  const maxValue = Math.max(...allValues);

  // Suggested min: 0 or slightly below the historical minimum
  // For metrics that can't go negative (counts, etc.), use 0
  const suggestedMin = minValue >= 0 ? 0 : roundToNice(minValue * 1.2, false);

  // Suggested max: at least 2x current value, or 1.5x historical max
  // This gives room for growth targets
  const growthBasedMax = currentValue * 2;
  const historicalBasedMax = maxValue * 1.5;
  const suggestedMax = roundToNice(
    Math.max(growthBasedMax, historicalBasedMax, currentValue + 100),
    true,
  );

  return {
    suggestedMin,
    suggestedMax,
  };
}
