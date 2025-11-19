/**
 * Chart Types and Interfaces for AI Transformation
 *
 * Defines the types for chart data transformation results.
 */

// ============================================================================
// Types & Interfaces
// ============================================================================

/**
 * Chart types supported by Recharts
 */
export type ChartType =
  | "line"
  | "bar"
  | "area"
  | "pie"
  | "radar"
  | "radial"
  | "kpi";

/**
 * Single data point for charts
 */
export type ChartDataPoint = Record<string, string | number>;

/**
 * Chart configuration for labels and colors
 */
export interface ChartConfigEntry {
  label: string;
  color: string;
}

/**
 * Final result of chart transformation with rich metadata
 */
export interface ChartTransformResult {
  chartType: ChartType;
  chartData: ChartDataPoint[];
  chartConfig: Record<string, ChartConfigEntry>;
  xAxisKey: string;
  dataKeys: string[];

  // Rich chart metadata
  title: string;
  description: string;
  xAxisLabel: string;
  yAxisLabel: string;

  // Feature flags
  showLegend: boolean;
  showTooltip: boolean;
  stacked?: boolean;

  // Pie/Radial specific - center display
  centerLabel?: { value: string; label: string };

  reasoning: string;
}
