import type { ChartConfig } from "@/lib/metrics/transformer-types";

/**
 * Get a consistent display label for metric values
 *
 * Priority order:
 * 1. valueLabel from DataIngestionTransformer (e.g., "commits", "stars", "issues")
 * 2. chartConfig label for the primary key
 * 3. The primary data key itself
 * 4. Fallback to "value"
 *
 * @param valueLabel - Label from DataIngestionTransformer
 * @param chartConfig - Chart configuration object
 * @param primaryKey - The primary data key (optional, defaults to first dataKey)
 * @returns Normalized display label string
 */
export function getDisplayLabel(
  valueLabel: string | null | undefined,
  chartConfig: ChartConfig | null | undefined,
  primaryKey?: string,
): string {
  // 1. Use valueLabel from DataIngestionTransformer if available
  if (valueLabel) return valueLabel;

  // Determine the primary key if not provided
  const effectiveKey = primaryKey ?? chartConfig?.dataKeys?.[0];

  // 2. Use chart config label for the primary key
  if (chartConfig?.chartConfig && effectiveKey) {
    const chartConfigEntry = chartConfig.chartConfig as Record<
      string,
      { label?: string }
    >;
    const label = chartConfigEntry[effectiveKey]?.label;
    if (label) return label;
  }

  // 3. Use the primary data key itself
  if (effectiveKey) return effectiveKey;

  // 4. Fallback
  return "value";
}

/**
 * Get both the current value and its display label from chart data
 *
 * @param chartConfig - Chart configuration with chartData and dataKeys
 * @param valueLabel - Optional label from DataIngestionTransformer
 * @returns Object with value, label, and formatted date
 */
export function getCurrentValueWithLabel(
  chartConfig: ChartConfig | null | undefined,
  valueLabel?: string | null,
): {
  value: number | null;
  label: string;
  date: string | null;
} {
  if (!chartConfig?.chartData?.length || !chartConfig?.dataKeys?.length) {
    return { value: null, label: "value", date: null };
  }

  const primaryKey = chartConfig.dataKeys[0];
  if (!primaryKey) {
    return { value: null, label: "value", date: null };
  }

  const latestData = chartConfig.chartData[chartConfig.chartData.length - 1];
  const rawValue = latestData?.[primaryKey];

  const value = typeof rawValue === "number" ? rawValue : null;
  const label = getDisplayLabel(valueLabel, chartConfig, primaryKey);

  // Extract date if available
  let date: string | null = null;
  const xAxisKey = chartConfig.xAxisKey ?? "date";
  if (latestData && xAxisKey in latestData) {
    const dateValue = latestData[xAxisKey];
    if (typeof dateValue === "string") {
      date = dateValue;
    }
  }

  return { value, label, date };
}
