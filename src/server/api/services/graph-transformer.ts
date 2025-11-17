/**
 * Graph Data Transformation Service
 *
 * Converts metric data from various sources (APIs, databases) into
 * a standardized format for graph visualization.
 */
import type { Metric } from "@prisma/client";

// ============================================================================
// Types & Interfaces
// ============================================================================

/**
 * Data source types for graph data extraction
 */
export type GraphDataSource =
  | "columnData" // Extract from endpointConfig.columnData array
  | "currentValue" // Single value from metric.currentValue
  | "customPath"; // Custom JSON path in endpointConfig

/**
 * Aggregation methods for data processing
 */
export type AggregationType =
  | "none" // No aggregation, use raw values
  | "sum" // Sum all values
  | "average" // Calculate average
  | "min" // Minimum value
  | "max"; // Maximum value

/**
 * Configuration for extracting graph data from a metric
 */
export interface GraphDataConfig {
  dataSource: GraphDataSource;

  // For customPath data source
  xPath?: string; // JSON path to x-axis values (e.g., "dates")
  yPath?: string; // JSON path to y-axis values (e.g., "values")

  // Data processing
  aggregation?: AggregationType;

  // Labels and metadata
  xLabel?: string; // X-axis label (e.g., "Time", "Date")
  yLabel?: string; // Y-axis label (e.g., "Revenue", "Count")

  // For auto-generating labels
  generateLabels?: boolean; // Auto-generate labels for columnData
  labelPrefix?: string; // Prefix for generated labels (e.g., "Point ")
}

/**
 * Standardized graph data format
 */
export interface GraphData {
  labels: string[]; // X-axis labels or categories
  values: number[]; // Y-axis values
  metadata: {
    xLabel?: string;
    yLabel?: string;
    dataSource: GraphDataSource;
    totalPoints: number;
    lastUpdated?: Date;
    aggregation?: AggregationType;
  };
}

/**
 * Result of transformation with error handling
 */
export interface TransformResult {
  success: boolean;
  data?: GraphData;
  error?: string;
}

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Extract value from nested object using dot notation path
 * Example: getValueByPath(obj, "data.items.0.value") -> obj.data.items[0].value
 */
function getValueByPath(obj: unknown, path: string): unknown {
  if (!obj || typeof obj !== "object") return undefined;

  const keys = path.split(".");
  let current: unknown = obj;

  for (const key of keys) {
    if (current === null || current === undefined) return undefined;
    if (typeof current !== "object") return undefined;
    current = (current as Record<string, unknown>)[key];
  }

  return current;
}

/**
 * Apply aggregation to an array of numbers
 */
function applyAggregation(values: number[], type: AggregationType): number {
  if (values.length === 0) return 0;

  switch (type) {
    case "sum":
      return values.reduce((sum, val) => sum + val, 0);
    case "average":
      return values.reduce((sum, val) => sum + val, 0) / values.length;
    case "min":
      return Math.min(...values);
    case "max":
      return Math.max(...values);
    case "none":
    default:
      return values[values.length - 1] ?? 0; // Return last value
  }
}

/**
 * Generate labels for data points
 */
function generateLabels(count: number, prefix = "Point "): string[] {
  return Array.from({ length: count }, (_, i) => `${prefix}${i + 1}`);
}

/**
 * Ensure all values in array are numbers
 */
function ensureNumberArray(arr: unknown[]): number[] {
  return arr.map((val) => {
    if (typeof val === "number") return val;
    if (typeof val === "string") {
      const num = parseFloat(val);
      return isNaN(num) ? 0 : num;
    }
    return 0;
  });
}

// ============================================================================
// Main Transformer Function
// ============================================================================

/**
 * Transform metric data into graph-ready format
 *
 * @param metric - Prisma Metric model with data
 * @param config - Configuration for data extraction
 * @returns TransformResult with graph data or error
 */
export function transformMetricToGraphData(
  metric: Metric,
  config: GraphDataConfig,
): TransformResult {
  try {
    const { dataSource, aggregation = "none" } = config;

    let labels: string[] = [];
    let values: number[] = [];

    // Extract data based on source type
    switch (dataSource) {
      case "columnData": {
        // Extract from endpointConfig.columnData array
        const endpointConfig = metric.endpointConfig as Record<
          string,
          unknown
        > | null;
        const columnData = endpointConfig?.columnData;

        if (!Array.isArray(columnData)) {
          return {
            success: false,
            error: "No columnData array found in endpointConfig",
          };
        }

        values = ensureNumberArray(columnData);

        // Generate or use provided labels
        if (config.generateLabels !== false) {
          labels = generateLabels(values.length, config.labelPrefix);
        } else {
          labels = values.map((_, i) => `${i}`);
        }

        break;
      }

      case "currentValue": {
        // Single value from metric.currentValue
        if (metric.currentValue === null || metric.currentValue === undefined) {
          return {
            success: false,
            error: "No currentValue found in metric",
          };
        }

        labels = ["Current"];
        values = [metric.currentValue];

        break;
      }

      case "customPath": {
        // Extract from custom JSON paths
        if (!config.xPath || !config.yPath) {
          return {
            success: false,
            error: "xPath and yPath required for customPath data source",
          };
        }

        const endpointConfig = metric.endpointConfig as Record<
          string,
          unknown
        > | null;
        if (!endpointConfig) {
          return {
            success: false,
            error: "No endpointConfig found in metric",
          };
        }

        const xData = getValueByPath(endpointConfig, config.xPath);
        const yData = getValueByPath(endpointConfig, config.yPath);

        if (!Array.isArray(xData) || !Array.isArray(yData)) {
          return {
            success: false,
            error: "xPath and yPath must point to arrays",
          };
        }

        if (xData.length !== yData.length) {
          return {
            success: false,
            error: "xPath and yPath arrays must have same length",
          };
        }

        labels = xData.map(String);
        values = ensureNumberArray(yData);

        break;
      }

      default:
        return {
          success: false,
          error: `Unknown data source: ${String(dataSource)}`,
        };
    }

    // Apply aggregation if needed (except for single values)
    if (aggregation !== "none" && values.length > 1) {
      const aggregatedValue = applyAggregation(values, aggregation);
      values = [aggregatedValue];
      labels = [aggregation.charAt(0).toUpperCase() + aggregation.slice(1)];
    }

    // Build result
    const graphData: GraphData = {
      labels,
      values,
      metadata: {
        xLabel: config.xLabel,
        yLabel: config.yLabel,
        dataSource,
        totalPoints: values.length,
        lastUpdated: metric.lastFetchedAt ?? undefined,
        aggregation: aggregation !== "none" ? aggregation : undefined,
      },
    };

    return {
      success: true,
      data: graphData,
    };
  } catch (error) {
    return {
      success: false,
      error:
        error instanceof Error
          ? error.message
          : "Unknown error during transformation",
    };
  }
}

/**
 * Get default graph data config based on metric properties
 */
export function getDefaultGraphConfig(metric: Metric): GraphDataConfig {
  const endpointConfig = metric.endpointConfig as Record<
    string,
    unknown
  > | null;
  const hasColumnData =
    endpointConfig?.columnData && Array.isArray(endpointConfig.columnData);

  // If metric has columnData, use it
  if (hasColumnData) {
    return {
      dataSource: "columnData",
      generateLabels: true,
      labelPrefix: "Data Point ",
      xLabel: "Index",
      yLabel: metric.name,
      aggregation: "none",
    };
  }

  // Otherwise use current value
  return {
    dataSource: "currentValue",
    xLabel: "Metric",
    yLabel: metric.unit ?? "Value",
    aggregation: "none",
  };
}

/**
 * Validate graph data configuration
 */
export function validateGraphConfig(config: GraphDataConfig): {
  valid: boolean;
  error?: string;
} {
  if (!config.dataSource) {
    return { valid: false, error: "dataSource is required" };
  }

  if (config.dataSource === "customPath") {
    if (!config.xPath || !config.yPath) {
      return { valid: false, error: "xPath and yPath required for customPath" };
    }
  }

  return { valid: true };
}
