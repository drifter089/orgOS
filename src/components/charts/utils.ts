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
