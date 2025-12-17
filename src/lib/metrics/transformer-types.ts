/**
 * Types for AI-generated transformer code
 * Used by both MetricTransformer and ChartTransformer
 */
import type { ChartType } from "./utils";

// Re-export ChartType for convenience
export type { ChartType } from "./utils";

// =============================================================================
// Data Point Types
// =============================================================================

/**
 * Standardized data point output from MetricTransformer
 */
export interface DataPoint {
  timestamp: Date;
  value: number;
  dimensions: Record<string, unknown> | null;
}

/**
 * Context passed to transformer functions
 */
export interface TransformContext {
  endpointConfig: Record<string, string>;
}

// =============================================================================
// Chart Configuration Types
// =============================================================================

/**
 * Complete chart configuration for rendering
 */
export interface ChartConfig {
  chartType: ChartType;
  chartData: Record<string, unknown>[];
  chartConfig: Record<string, { label: string; color: string }>;
  xAxisKey: string;
  dataKeys: string[];
  title?: string;
  description?: string;
  xAxisLabel?: string;
  yAxisLabel?: string;
  showLegend?: boolean;
  showTooltip?: boolean;
  stacked?: boolean;
}

/**
 * Full chart transformation result with metadata
 * Used by dashboard components for rendering charts
 */
export interface ChartTransformResult extends ChartConfig {
  title: string;
  description: string;
  xAxisLabel: string;
  yAxisLabel: string;
  showLegend: boolean;
  showTooltip: boolean;
  centerLabel?: { value: string; label: string };
  reasoning: string;
}

// =============================================================================
// Transformer Function Signatures
// =============================================================================

/**
 * Function signature for MetricTransformer code
 * Transforms raw API response into standardized DataPoints
 */
export type MetricTransformFn = (
  apiResponse: unknown,
  context: TransformContext,
) => DataPoint[];

/**
 * Cadence determines how data is aggregated for chart display
 */
export type Cadence = "DAILY" | "WEEKLY" | "MONTHLY";

/**
 * Function signature for ChartTransformer code
 * Transforms DataPoints into chart-ready configuration
 */
export type ChartTransformFn = (
  dataPoints: DataPoint[],
  preferences: { chartType: string; cadence: Cadence },
) => ChartConfig;
