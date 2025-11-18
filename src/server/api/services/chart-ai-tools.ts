/**
 * AI Tools for Chart Data Transformation
 *
 * Defines tools that AI can use to analyze metric data and
 * transform it into Recharts-compatible format.
 */
import { z } from "zod";

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
 * Final result of chart transformation
 */
export interface ChartTransformResult {
  chartType: ChartType;
  chartData: ChartDataPoint[];
  chartConfig: Record<string, ChartConfigEntry>;
  xAxisKey: string;
  dataKeys: string[];
  reasoning: string;
}

// ============================================================================
// Helper Functions for Tools
// ============================================================================

/**
 * Extract value from nested object using dot notation path
 * Supports array wildcards with * (e.g., "items.*.value")
 */
function getValueByPath(obj: unknown, path: string): unknown {
  if (!obj || typeof obj !== "object") return undefined;

  const keys = path.split(".");
  let current: unknown = obj;

  for (let i = 0; i < keys.length; i++) {
    const key = keys[i];
    if (current === null || current === undefined) return undefined;

    if (key === "*" && Array.isArray(current)) {
      // Handle array wildcard - extract from all items
      const remainingPath = keys.slice(i + 1).join(".");
      if (remainingPath) {
        return current.map((item) => getValueByPath(item, remainingPath));
      }
      return current;
    }

    if (typeof current !== "object") return undefined;
    current = (current as Record<string, unknown>)[key!];
  }

  return current;
}

/**
 * Check if a string looks like a date
 */
function isDateLike(value: unknown): boolean {
  if (typeof value !== "string") return false;

  // Common date patterns
  const datePatterns = [
    /^\d{4}-\d{2}-\d{2}/, // ISO date: 2025-01-15
    /^\d{2}\/\d{2}\/\d{4}/, // US date: 01/15/2025
    /^\d{2}-\d{2}-\d{4}/, // EU date: 15-01-2025
    /^\d{4}\/\d{2}\/\d{2}/, // JP date: 2025/01/15
    /^(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)/i, // Month names
    /^\d{4}-\d{2}$/, // Year-month: 2025-01
    /^\d{4}$/, // Year only: 2025
  ];

  return datePatterns.some((pattern) => pattern.test(value));
}

/**
 * Check if a key name suggests a date/time field
 */
function isTimeSeriesKey(key: string): boolean {
  const timeKeywords = [
    "date",
    "time",
    "day",
    "week",
    "month",
    "year",
    "hour",
    "minute",
    "timestamp",
    "created",
    "updated",
    "period",
    "interval",
  ];
  const lowerKey = key.toLowerCase();
  return timeKeywords.some((keyword) => lowerKey.includes(keyword));
}

/**
 * Check if a key name suggests a category field
 */
function isCategoryKey(key: string): boolean {
  const categoryKeywords = [
    "name",
    "label",
    "category",
    "type",
    "group",
    "status",
    "state",
    "event",
    "action",
    "source",
    "channel",
    "platform",
    "country",
    "region",
  ];
  const lowerKey = key.toLowerCase();
  return categoryKeywords.some((keyword) => lowerKey.includes(keyword));
}

/**
 * Detect the pattern type of data
 */
type DataPattern =
  | "array-of-objects"
  | "array-of-arrays"
  | "columns-results" // PostHog format
  | "object-with-values"
  | "single-value"
  | "nested-data"
  | "unknown";

type DataCharacteristic =
  | "time-series"
  | "categorical"
  | "multi-series"
  | "single-metric"
  | "hierarchical";

function detectDataPattern(data: unknown): {
  pattern: DataPattern;
  characteristics: DataCharacteristic[];
  suggestedChartType: ChartType;
  details: Record<string, unknown>;
} {
  const characteristics: DataCharacteristic[] = [];
  let pattern: DataPattern = "unknown";
  let suggestedChartType: ChartType = "bar";
  const details: Record<string, unknown> = {};

  // Check for PostHog columns+results format
  if (
    data &&
    typeof data === "object" &&
    !Array.isArray(data) &&
    "columns" in data &&
    "results" in data &&
    Array.isArray((data as { columns: unknown }).columns) &&
    Array.isArray((data as { results: unknown }).results)
  ) {
    pattern = "columns-results";
    const columns = (data as { columns: string[] }).columns;
    const results = (data as { results: unknown[][] }).results;

    details.columns = columns;
    details.rowCount = results.length;
    details.sampleRow = results[0];

    // Check if first column is time-series
    if (columns[0] && isTimeSeriesKey(columns[0])) {
      characteristics.push("time-series");
      suggestedChartType = "line";
    } else if (columns.length > 2) {
      characteristics.push("multi-series");
      suggestedChartType = "bar";
    } else {
      characteristics.push("categorical");
      suggestedChartType = "bar";
    }

    if (results.length === 1) {
      characteristics.push("single-metric");
      suggestedChartType = "kpi";
    }

    return { pattern, characteristics, suggestedChartType, details };
  }

  // Check for array of objects
  if (
    Array.isArray(data) &&
    data.length > 0 &&
    typeof data[0] === "object" &&
    !Array.isArray(data[0])
  ) {
    pattern = "array-of-objects";
    const keys = Object.keys(data[0] as object);
    const numericKeys = keys.filter((key) => {
      const val = (data[0] as Record<string, unknown>)[key];
      return (
        typeof val === "number" ||
        (typeof val === "string" && !isNaN(parseFloat(val)))
      );
    });
    const stringKeys = keys.filter((key) => {
      const val = (data[0] as Record<string, unknown>)[key];
      return typeof val === "string";
    });

    details.keys = keys;
    details.numericKeys = numericKeys;
    details.stringKeys = stringKeys;
    details.rowCount = data.length;
    details.sample = data.slice(0, 3);

    // Detect time-series
    const timeKey = stringKeys.find(
      (key) =>
        isTimeSeriesKey(key) ||
        isDateLike((data[0] as Record<string, unknown>)[key]),
    );
    if (timeKey) {
      characteristics.push("time-series");
      details.timeKey = timeKey;
      suggestedChartType = "line";
    }

    // Detect multi-series
    if (numericKeys.length > 1) {
      characteristics.push("multi-series");
      if (!characteristics.includes("time-series")) {
        suggestedChartType = "bar";
      }
    }

    // Detect categorical
    const categoryKey = stringKeys.find((key) => isCategoryKey(key));
    if (categoryKey && !characteristics.includes("time-series")) {
      characteristics.push("categorical");
      details.categoryKey = categoryKey;
      if (data.length <= 6) {
        suggestedChartType = "pie";
      }
    }

    if (data.length === 1) {
      characteristics.push("single-metric");
      suggestedChartType = "kpi";
    }

    return { pattern, characteristics, suggestedChartType, details };
  }

  // Check for array of arrays
  if (Array.isArray(data) && data.length > 0 && Array.isArray(data[0])) {
    pattern = "array-of-arrays";
    details.rowCount = data.length;
    details.columnCount = (data[0] as unknown[]).length;
    details.sample = data.slice(0, 3);

    // Check if first column is date-like
    if (data[0] && isDateLike((data[0] as unknown[])[0])) {
      characteristics.push("time-series");
      suggestedChartType = "line";
    } else {
      characteristics.push("categorical");
      suggestedChartType = "bar";
    }

    return { pattern, characteristics, suggestedChartType, details };
  }

  // Check for object with numeric values at root
  if (data && typeof data === "object" && !Array.isArray(data)) {
    const obj = data as Record<string, unknown>;
    const keys = Object.keys(obj);
    const numericEntries = keys.filter(
      (key) =>
        typeof obj[key] === "number" ||
        (typeof obj[key] === "string" && !isNaN(parseFloat(obj[key]))),
    );

    // Check for nested data property
    if (obj.data && (Array.isArray(obj.data) || typeof obj.data === "object")) {
      pattern = "nested-data";
      details.dataPath = "data";
      details.topLevelKeys = keys;
      characteristics.push("hierarchical");
      return { pattern, characteristics, suggestedChartType: "bar", details };
    }

    if (numericEntries.length > 0) {
      pattern = "object-with-values";
      details.keys = keys;
      details.numericKeys = numericEntries;
      details.sampleValues = numericEntries
        .slice(0, 5)
        .map((key) => ({ key, value: obj[key] }));

      if (numericEntries.length === 1) {
        characteristics.push("single-metric");
        suggestedChartType = "kpi";
      } else {
        characteristics.push("categorical");
        suggestedChartType = numericEntries.length <= 6 ? "pie" : "bar";
      }

      return { pattern, characteristics, suggestedChartType, details };
    }
  }

  // Single value
  if (
    typeof data === "number" ||
    (typeof data === "string" && !isNaN(parseFloat(data)))
  ) {
    pattern = "single-value";
    characteristics.push("single-metric");
    details.value = data;
    return { pattern, characteristics, suggestedChartType: "kpi", details };
  }

  return { pattern, characteristics, suggestedChartType, details };
}

/**
 * Flatten nested data into array of objects
 */
function flattenToChartData(
  data: unknown,
  options: {
    xPath?: string;
    yPaths?: string[];
    xKey?: string;
    yKeys?: string[];
  },
): ChartDataPoint[] {
  const { xPath, yPaths = [], xKey = "x", yKeys = [] } = options;

  // Handle columns+results (PostHog) format
  if (
    data &&
    typeof data === "object" &&
    !Array.isArray(data) &&
    "columns" in data &&
    "results" in data
  ) {
    const columns = (data as { columns: string[] }).columns;
    const results = (data as { results: (string | number)[][] }).results;

    return results.map((row) => {
      const obj: ChartDataPoint = {};
      columns.forEach((col, i) => {
        const value = row[i];
        if (typeof value === "number") {
          obj[col] = value;
        } else if (typeof value === "string") {
          // Keep date-like strings as strings (important for x-axis)
          if (isDateLike(value)) {
            obj[col] = value;
          } else {
            const num = parseFloat(value);
            obj[col] = isNaN(num) ? value : num;
          }
        } else {
          obj[col] = String(value ?? "");
        }
      });
      return obj;
    });
  }

  // Handle array of arrays with paths
  if (Array.isArray(data) && data.length > 0 && Array.isArray(data[0])) {
    return data.map((row: unknown[]) => {
      const obj: ChartDataPoint = {};
      obj[xKey] = String(row[0] ?? "");
      yKeys.forEach((key, i) => {
        const value = row[i + 1];
        obj[key] =
          typeof value === "number" ? value : parseFloat(String(value)) || 0;
      });
      return obj;
    });
  }

  // Handle array of objects
  if (Array.isArray(data) && data.length > 0 && typeof data[0] === "object") {
    return data.map((item) => {
      const obj: ChartDataPoint = {};
      if (xPath) {
        const xVal = getValueByPath(item, xPath);
        obj[xKey] = String(xVal ?? "");
      }
      yPaths.forEach((path, i) => {
        const yVal = getValueByPath(item, path);
        const key = yKeys[i] || `value${i + 1}`;
        obj[key] =
          typeof yVal === "number" ? yVal : parseFloat(String(yVal)) || 0;
      });
      return obj;
    });
  }

  return [];
}

/**
 * Combine separate arrays into chart data
 */
function combineArraysToChartData(
  labels: string[],
  valueSets: { key: string; values: number[] }[],
): ChartDataPoint[] {
  return labels.map((label, i) => {
    const point: ChartDataPoint = { label };
    valueSets.forEach(({ key, values }) => {
      point[key] = values[i] ?? 0;
    });
    return point;
  });
}

/**
 * Parse and sort date column
 */
function parseDateColumn(
  data: ChartDataPoint[],
  dateKey: string,
): { sorted: ChartDataPoint[]; dateFormat: string } {
  let dateFormat = "unknown";

  // Try to detect format from first item
  const firstDate = data[0]?.[dateKey];
  if (typeof firstDate === "string") {
    if (/^\d{4}-\d{2}-\d{2}/.test(firstDate)) {
      dateFormat = "ISO";
    } else if (/^\d{2}\/\d{2}\/\d{4}/.test(firstDate)) {
      dateFormat = "US";
    } else if (/^\d{4}-\d{2}$/.test(firstDate)) {
      dateFormat = "year-month";
    }
  }

  // Sort by date
  const sorted = [...data].sort((a, b) => {
    const dateA = new Date(String(a[dateKey])).getTime();
    const dateB = new Date(String(b[dateKey])).getTime();
    return dateA - dateB;
  });

  return { sorted, dateFormat };
}

/**
 * Analyze data structure recursively
 */
function analyzeStructure(
  data: unknown,
  maxDepth = 3,
  currentDepth = 0,
): string {
  if (currentDepth >= maxDepth) return "...";

  if (data === null) return "null";
  if (data === undefined) return "undefined";
  if (typeof data === "number") return `number(${data})`;
  if (typeof data === "string") {
    // Check if string is numeric
    const num = parseFloat(data);
    if (!isNaN(num)) return `numericString("${data}")`;
    return `string("${data.substring(0, 50)}${data.length > 50 ? "..." : ""}")`;
  }
  if (typeof data === "boolean") return `boolean(${data})`;

  if (Array.isArray(data)) {
    if (data.length === 0) return "array([])";
    const sample = analyzeStructure(data[0], maxDepth, currentDepth + 1);
    return `array[${data.length}](${sample})`;
  }

  if (typeof data === "object") {
    const keys = Object.keys(data);
    if (keys.length === 0) return "object({})";

    const entries = keys.slice(0, 5).map((key) => {
      const value = analyzeStructure(
        (data as Record<string, unknown>)[key],
        maxDepth,
        currentDepth + 1,
      );
      return `${key}: ${value}`;
    });

    const suffix = keys.length > 5 ? `, ...${keys.length - 5} more` : "";
    return `object({ ${entries.join(", ")}${suffix} })`;
  }

  return typeof data;
}

/**
 * Convert value to number
 */
function toNumber(value: unknown): number {
  if (typeof value === "number") return value;
  if (typeof value === "string") {
    const num = parseFloat(value.replace(/[,$%]/g, ""));
    return isNaN(num) ? 0 : num;
  }
  return 0;
}

// ============================================================================
// Chart Color Palette
// ============================================================================

const CHART_COLORS = [
  "var(--chart-1)",
  "var(--chart-2)",
  "var(--chart-3)",
  "var(--chart-4)",
  "var(--chart-5)",
];

function getChartColor(index: number): string {
  return CHART_COLORS[index % CHART_COLORS.length]!;
}

// ============================================================================
// AI Tool Definitions
// ============================================================================

// Tool executor functions
const toolExecutors = {
  // Enhanced inspect_data with sampling and type detection
  inspect_data: (data: unknown) => {
    const structure = analyzeStructure(data);
    const keys =
      data && typeof data === "object" && !Array.isArray(data)
        ? Object.keys(data)
        : [];

    // Get sample data
    let sample: unknown[] = [];
    if (Array.isArray(data)) {
      sample = data.slice(0, 3);
    } else if (data && typeof data === "object" && "results" in data) {
      const results = (data as { results: unknown[] }).results;
      if (Array.isArray(results)) {
        sample = results.slice(0, 3);
      }
    }

    // Identify potential key types
    const timeSeriesKeys: string[] = [];
    const categoryKeys: string[] = [];
    const numericKeys: string[] = [];

    if (
      Array.isArray(data) &&
      data.length > 0 &&
      typeof data[0] === "object" &&
      !Array.isArray(data[0])
    ) {
      const firstItem = data[0] as Record<string, unknown>;
      Object.keys(firstItem).forEach((key) => {
        const value = firstItem[key];
        if (isTimeSeriesKey(key) || isDateLike(value)) {
          timeSeriesKeys.push(key);
        }
        if (isCategoryKey(key)) {
          categoryKeys.push(key);
        }
        if (
          typeof value === "number" ||
          (typeof value === "string" && !isNaN(parseFloat(value)))
        ) {
          numericKeys.push(key);
        }
      });
    }

    return {
      structure,
      topLevelKeys: keys,
      isArray: Array.isArray(data),
      length: Array.isArray(data) ? data.length : undefined,
      sample,
      keyAnalysis: {
        timeSeriesKeys,
        categoryKeys,
        numericKeys,
      },
    };
  },

  // NEW: Detect data pattern automatically
  detect_pattern: (data: unknown) => {
    return detectDataPattern(data);
  },

  // NEW: Flatten nested data to chart format
  flatten_nested: (
    data: unknown,
    options?: {
      xPath?: string;
      yPaths?: string[];
      xKey?: string;
      yKeys?: string[];
    },
  ) => {
    const chartData = flattenToChartData(data, options ?? {});
    return {
      success: chartData.length > 0,
      chartData,
      rowCount: chartData.length,
      keys: chartData.length > 0 ? Object.keys(chartData[0]!) : [],
    };
  },

  // NEW: Combine separate arrays into chart data
  combine_arrays: (
    labels: string[],
    valueSets: { key: string; values: number[] }[],
  ) => {
    const chartData = combineArraysToChartData(labels, valueSets);
    return {
      success: true,
      chartData,
      rowCount: chartData.length,
      keys: chartData.length > 0 ? Object.keys(chartData[0]!) : [],
    };
  },

  // NEW: Parse and sort date column
  sort_by_date: (data: ChartDataPoint[], dateKey: string) => {
    const result = parseDateColumn(data, dateKey);
    return {
      success: true,
      chartData: result.sorted,
      dateFormat: result.dateFormat,
      rowCount: result.sorted.length,
    };
  },

  extract_values: (data: unknown, path: string) => {
    const extracted = getValueByPath(data, path);

    if (Array.isArray(extracted)) {
      const values = extracted.map(toNumber);
      return {
        success: true,
        values,
        count: values.length,
        min: Math.min(...values),
        max: Math.max(...values),
        sum: values.reduce((a, b) => a + b, 0),
      };
    }

    if (extracted !== undefined) {
      const value = toNumber(extracted);
      return {
        success: true,
        values: [value],
        count: 1,
        min: value,
        max: value,
        sum: value,
      };
    }

    return {
      success: false,
      error: `No values found at path: ${path}`,
      values: [] as number[],
    };
  },

  extract_labels: (data: unknown, path: string) => {
    const extracted = getValueByPath(data, path);

    if (Array.isArray(extracted)) {
      const labels = extracted.map(String);
      return {
        success: true,
        labels,
        count: labels.length,
      };
    }

    if (extracted !== undefined) {
      return {
        success: true,
        labels: [String(extracted)],
        count: 1,
      };
    }

    return {
      success: false,
      error: `No labels found at path: ${path}`,
      labels: [] as string[],
    };
  },

  get_keys: (data: unknown, path?: string) => {
    const target = path ? getValueByPath(data, path) : data;

    if (target && typeof target === "object" && !Array.isArray(target)) {
      const keys = Object.keys(target);
      const numericKeys: string[] = [];
      const stringKeys: string[] = [];
      const timeSeriesKeys: string[] = [];
      const categoryKeys: string[] = [];

      keys.forEach((key) => {
        const value = (target as Record<string, unknown>)[key];

        // Check value types
        if (
          typeof value === "number" ||
          (typeof value === "string" && !isNaN(parseFloat(value)))
        ) {
          numericKeys.push(key);
        }
        if (typeof value === "string") {
          stringKeys.push(key);
        }

        // Check key name patterns
        if (isTimeSeriesKey(key) || isDateLike(value)) {
          timeSeriesKeys.push(key);
        }
        if (isCategoryKey(key)) {
          categoryKeys.push(key);
        }
      });

      return {
        success: true,
        keys,
        numericKeys,
        stringKeys,
        timeSeriesKeys,
        categoryKeys,
        count: keys.length,
        recommendation:
          timeSeriesKeys.length > 0
            ? `Use "${timeSeriesKeys[0]}" as x-axis for time-series chart`
            : categoryKeys.length > 0
              ? `Use "${categoryKeys[0]}" as x-axis for categorical chart`
              : numericKeys.length > 0
                ? `Found ${numericKeys.length} numeric keys: ${numericKeys.join(", ")}`
                : "No clear visualization keys found",
      };
    }

    return {
      success: false,
      error: "Target is not an object",
      keys: [] as string[],
    };
  },

  format_chart_data: (
    chartType: ChartType,
    chartData: ChartDataPoint[],
    xAxisKey: string,
    dataKeys: string[],
    reasoning: string,
  ) => {
    // Generate chart config with colors and labels
    const chartConfig: Record<string, ChartConfigEntry> = {};

    let processedChartData = chartData;

    // Add xAxis to config if it's categorical
    if (chartType === "pie" || chartType === "radial") {
      // For pie/radial, each category needs a color
      const categories = chartData.map((d: ChartDataPoint) =>
        String(d[xAxisKey]),
      );
      categories.forEach((category: string, index: number) => {
        const key = category.toLowerCase().replace(/\s+/g, "-");
        chartConfig[key] = {
          label: category,
          color: getChartColor(index),
        };
      });

      // Add fill colors to data points
      processedChartData = chartData.map(
        (point: ChartDataPoint, index: number) => ({
          ...point,
          fill: getChartColor(index),
        }),
      );
    } else {
      // For line/bar/area, color by data series
      dataKeys.forEach((key: string, index: number) => {
        chartConfig[key] = {
          label: key.charAt(0).toUpperCase() + key.slice(1).replace(/_/g, " "),
          color: getChartColor(index),
        };
      });
    }

    const result: ChartTransformResult = {
      chartType,
      chartData: processedChartData,
      chartConfig,
      xAxisKey,
      dataKeys,
      reasoning,
    };

    return result;
  },
};

// Export executors for use in transformer
export { toolExecutors };

// ============================================================================
// Combined Tools Export (for AI SDK)
// ============================================================================

export const chartTransformTools = {
  // Primary tool: Auto-detect data pattern (USE THIS FIRST)
  detect_pattern: {
    description:
      "RECOMMENDED FIRST STEP: Automatically detect the data format and suggest the best chart type. Identifies time-series, categorical, multi-series patterns and common formats like PostHog columns+results.",
    parameters: z.object({
      data: z.any().describe("The data to analyze"),
    }),
  },

  inspect_data: {
    description:
      "Analyze the structure of the metric data with samples and key type analysis. Returns structure description, sample rows, and identifies time-series/category/numeric keys.",
    parameters: z.object({
      data: z.any().describe("The data to inspect"),
    }),
  },

  // Flatten nested/complex structures
  flatten_nested: {
    description:
      "Convert nested or complex data structures (like PostHog columns+results, nested arrays) into flat chart-ready format. Handles array-of-arrays with column metadata automatically.",
    parameters: z.object({
      data: z.any().describe("The nested data to flatten"),
      options: z
        .object({
          xPath: z
            .string()
            .optional()
            .describe("Path to x-axis values (for nested objects)"),
          yPaths: z
            .array(z.string())
            .optional()
            .describe("Paths to y-axis values"),
          xKey: z
            .string()
            .optional()
            .describe("Key name for x-axis in output (default: 'x')"),
          yKeys: z
            .array(z.string())
            .optional()
            .describe("Key names for y-values in output"),
        })
        .optional()
        .describe(
          "Options for flattening (optional - auto-detects common formats)",
        ),
    }),
  },

  // Combine separate arrays
  combine_arrays: {
    description:
      "Combine separate label and value arrays into unified chart data. Use when you have extracted labels and values separately.",
    parameters: z.object({
      labels: z
        .array(z.string())
        .describe("Array of labels/categories for x-axis"),
      valueSets: z
        .array(
          z.object({
            key: z.string().describe("Key name for this value series"),
            values: z
              .array(z.number())
              .describe("Numeric values for this series"),
          }),
        )
        .describe("One or more sets of numeric values"),
    }),
  },

  // Sort by date
  sort_by_date: {
    description:
      "Sort chart data chronologically by a date column. Use after flattening if data needs to be ordered by time.",
    parameters: z.object({
      data: z
        .array(z.record(z.union([z.string(), z.number()])))
        .describe("Chart data to sort"),
      dateKey: z.string().describe("The key containing date values"),
    }),
  },

  extract_values: {
    description:
      'Extract numeric values from a specific path in the data. Use dot notation for nested paths and * for array items (e.g., "results.*.count" extracts count from each item in results array).',
    parameters: z.object({
      data: z.any().describe("The source data"),
      path: z.string().describe("JSON path to extract values from"),
    }),
  },

  extract_labels: {
    description:
      'Extract string labels or keys from a specific path. Use for getting x-axis labels, categories, or date values (e.g., "results.*.date" or "results.*.name").',
    parameters: z.object({
      data: z.any().describe("The source data"),
      path: z.string().describe("JSON path to extract labels from"),
    }),
  },

  get_keys: {
    description:
      "Get the field names (keys) of an object at a specific path. Returns keys categorized by type (numeric, string, time-series, category) with recommendations.",
    parameters: z.object({
      data: z.any().describe("The source data"),
      path: z
        .string()
        .optional()
        .describe("JSON path to the object (empty for root)"),
    }),
  },

  format_chart_data: {
    description:
      "FINAL STEP: Format extracted data into Recharts-compatible format with colors. Call this once you have the chart data ready.",
    parameters: z.object({
      chartType: z
        .enum(["line", "bar", "area", "pie", "radar", "radial", "kpi"])
        .describe("The type of chart to create"),
      chartData: z
        .array(z.record(z.union([z.string(), z.number()])))
        .describe(
          'Array of data points. Each object should have consistent keys (e.g., [{ month: "Jan", value: 100 }, ...])',
        ),
      xAxisKey: z
        .string()
        .describe(
          'The key to use for x-axis/categories (e.g., "month", "date", "category")',
        ),
      dataKeys: z
        .array(z.string())
        .describe(
          'Keys containing the numeric values to chart (e.g., ["value"] or ["desktop", "mobile"])',
        ),
      reasoning: z
        .string()
        .describe(
          "Brief explanation of why this chart type and format was chosen",
        ),
    }),
  },
};

// ============================================================================
// System Prompt for AI
// ============================================================================

export const chartTransformationPrompt = `You are a data visualization expert. Your task is to analyze metric data and transform it into a format suitable for Recharts visualization.

## Your Goal
Convert raw metric data into the exact format needed for Recharts charts. You MUST call the format_chart_data tool as your final action.

## Recommended Process
1. **FIRST**: Use detect_pattern to automatically identify the data format and get chart type recommendations
2. If data is complex/nested, use flatten_nested to convert it to chart-ready format
3. If data needs sorting by date, use sort_by_date
4. Finally, call format_chart_data with the properly structured data

## Alternative Process (for custom extraction)
1. Use inspect_data to see structure with samples
2. Use get_keys to find time-series/category/numeric keys
3. Use extract_values and extract_labels to pull out specific data
4. Use combine_arrays if you extracted labels and values separately
5. Call format_chart_data with the result

## Common Data Formats You'll Encounter

### GitHub Pull Requests / Issues List
\`\`\`json
[
  { "title": "feat: add feature", "state": "open", "created_at": "2025-01-15T10:30:00Z", "user": { "login": "username" } },
  { "title": "fix: bug fix", "state": "merged", "created_at": "2025-01-14T08:20:00Z", "user": { "login": "user2" } }
]
\`\`\`
**IMPORTANT**: For GitHub PR/Issue lists, you should:
- Group by date (created_at) and count → line chart showing PR velocity over time
- OR group by state (open/closed/merged) and count → bar/pie chart showing distribution
- OR group by user.login and count → bar chart showing contributor activity
- Extract dates with: extract_labels(data, "*.created_at") then truncate to just date
- Format: [{ date: "2025-01-15", count: 5 }, { date: "2025-01-14", count: 3 }]

### GitHub Commits List
\`\`\`json
[
  { "sha": "abc123", "commit": { "message": "feat: ...", "author": { "name": "User", "date": "2025-01-15T10:00:00Z" } } }
]
\`\`\`
→ Group by commit.author.date (truncated to date) and count for commit activity over time
→ OR group by commit.author.name and count for contributor chart

### GitHub Workflow Runs
\`\`\`json
{ "workflow_runs": [
  { "name": "CI", "conclusion": "success", "created_at": "2025-01-15T10:00:00Z", "run_number": 123 }
]}
\`\`\`
→ Group by conclusion (success/failure) for success rate pie chart
→ OR group by date for runs over time

### GitHub Languages
\`\`\`json
{ "TypeScript": 50000, "JavaScript": 30000, "CSS": 10000 }
\`\`\`
→ Convert to: [{ language: "TypeScript", bytes: 50000 }, ...] for pie/bar chart

### GitHub Commit Activity (stats/commit_activity)
\`\`\`json
[
  { "week": 1704067200, "total": 15, "days": [2, 3, 4, 1, 2, 3, 0] }
]
\`\`\`
→ Convert week timestamp to date string, use total for line chart

### GitHub Code Frequency (stats/code_frequency)
\`\`\`json
[[1704067200, 1000, -200], [1704672000, 500, -100]]
\`\`\`
→ First value is timestamp, second is additions, third is deletions (negative)
→ Format: [{ week: "2025-01-01", additions: 1000, deletions: 200 }]

### GitHub Participation (stats/participation)
\`\`\`json
{ "all": [10, 20, 15, ...], "owner": [5, 8, 3, ...] }
\`\`\`
→ 52 weeks of data, combine into: [{ week: 1, all: 10, owner: 5 }, ...]

### GitHub Contributor Stats (stats/contributors)
\`\`\`json
[
  { "author": { "login": "user1" }, "total": 150, "weeks": [...] },
  { "author": { "login": "user2" }, "total": 80, "weeks": [...] }
]
\`\`\`
→ Format: [{ contributor: "user1", commits: 150 }, ...] for bar chart

### PostHog Format (columns + results)
\`\`\`json
{
  "columns": ["date", "count"],
  "results": [
    ["2025-01-01", 42],
    ["2025-01-02", 58]
  ]
}
\`\`\`
→ Use flatten_nested - it auto-detects this format

### Array of Objects (generic)
\`\`\`json
[
  { "date": "2025-01-01", "views": 100, "clicks": 20 },
  { "date": "2025-01-02", "views": 150, "clicks": 35 }
]
\`\`\`
→ Already chart-ready, just call format_chart_data

### Object with Values
\`\`\`json
{ "views": 1000, "likes": 500, "shares": 200 }
\`\`\`
→ Convert to array: [{ category: "views", value: 1000 }, ...]

## Chart Type Selection
- **Time series** (dates detected) → line or area chart
- **Categorical** (names/labels) → bar chart (or pie if ≤6 items)
- **Multi-series** (multiple numeric columns) → grouped bar or multi-line
- **Single value** → kpi type
- **Part-to-whole** → pie or radial chart
- **GitHub PRs/Issues over time** → line chart with date on x-axis, count on y-axis
- **GitHub contributor activity** → bar chart with username on x-axis, count on y-axis

## Important Rules
- Always convert string numbers to actual numbers
- For GitHub arrays, GROUP and COUNT - don't try to chart individual items
- Truncate ISO timestamps (2025-01-15T10:30:00Z) to just the date (2025-01-15) for grouping
- Use var(--chart-1) through var(--chart-5) for colors (handled by format_chart_data)
- Preserve original key names when they're descriptive
- Sort time-series data chronologically
- Provide clear reasoning for chart type choice`;
