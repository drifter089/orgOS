/**
 * Types for AI-generated transformer code
 * Used by both MetricTransformer and ChartTransformer
 */

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
  chartType: string;
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
 * Function signature for ChartTransformer code
 * Transforms DataPoints into chart-ready configuration
 */
export type ChartTransformFn = (
  dataPoints: DataPoint[],
  preferences: { chartType: string; dateRange: string; aggregation: string },
) => ChartConfig;
