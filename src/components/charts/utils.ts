/**
 * Format axis label for charts - handles dates and long text
 */
export function formatAxisLabel(value: string | number): string {
  const strValue = String(value);
  if (strValue.includes("-") && !isNaN(Date.parse(strValue))) {
    const date = new Date(strValue);
    return date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
  }
  if (strValue.length > 12) {
    return strValue.slice(0, 10) + "…";
  }
  return strValue;
}

/**
 * Format Y-axis values with K/M abbreviations
 */
export function formatYAxisLabel(value: number): string {
  if (value >= 1000000) return `${(value / 1000000).toFixed(1)}M`;
  if (value >= 1000) return `${(value / 1000).toFixed(1)}K`;
  return String(value);
}

/**
 * Check if chart data has long labels that need rotation
 */
export function hasLongLabels(
  chartData: Record<string, unknown>[],
  xAxisKey: string,
): boolean {
  return chartData.some((d) => {
    const rawLabel = d[xAxisKey];
    const label =
      typeof rawLabel === "string" || typeof rawLabel === "number"
        ? String(rawLabel)
        : "";
    return label.length > 8;
  });
}

/**
 * Calculate Y-axis domain that includes goal value when present.
 *
 * Behavior:
 * - No goal: Returns undefined (Recharts auto-calculates from data)
 * - Goal exists: Returns [0, max(dataMax, goalValue) * 1.1] with 10% padding
 *
 * This ensures the goal reference line is always visible on the chart,
 * even when the goal target is higher than current data values.
 */
export function calculateYAxisDomain(
  chartData: Record<string, unknown>[],
  dataKeys: string[],
  goalValue?: number | null,
): [number, number] | undefined {
  // No goal - let Recharts auto-calculate domain from data
  if (goalValue == null) {
    return undefined;
  }

  // Find max value across all data keys
  let dataMax = 0;
  for (const row of chartData) {
    for (const key of dataKeys) {
      const val = row[key];
      if (typeof val === "number" && val > dataMax) {
        dataMax = val;
      }
    }
  }

  // Use the larger of dataMax or goalValue, with 10% padding for visual breathing room
  const upperBound = Math.max(dataMax, goalValue) * 1.1;

  return [0, upperBound];
}
