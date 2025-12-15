import type { ChartTransformResult } from "./transformer-types";

export interface LatestMetricValue {
  value: number;
  label: string;
  date?: string;
}

export function getLatestMetricValue(
  chartConfig: ChartTransformResult | null | undefined,
): LatestMetricValue | null {
  if (!chartConfig?.chartData || chartConfig.chartData.length === 0) {
    return null;
  }

  const { chartData, dataKeys, xAxisKey } = chartConfig;
  const latestData = chartData[chartData.length - 1];

  if (!latestData) return null;

  const primaryKey = dataKeys[0];
  if (!primaryKey) return null;

  const value = latestData[primaryKey];
  if (typeof value !== "number") return null;

  const dateValue = latestData[xAxisKey];
  let date: string | undefined;

  if (dateValue && typeof dateValue === "string") {
    if (dateValue.includes("-") && !isNaN(Date.parse(dateValue))) {
      date = new Date(dateValue).toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric",
      });
    }
  }

  const label =
    chartConfig.chartConfig[primaryKey]?.label ?? primaryKey ?? "Value";

  return { value, label, date };
}
