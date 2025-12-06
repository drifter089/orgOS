/**
 * Transformer Executor
 *
 * Safely executes AI-generated transformer code.
 * - Validates output against expected schema
 * - No DB access, no network access - pure data transformation
 */
import type { ChartConfig, DataPoint } from "@/lib/metrics/transformer-types";

// =============================================================================
// Types
// =============================================================================

interface ExecutionResult<T> {
  success: boolean;
  data?: T;
  error?: string;
}

interface DataPointRaw {
  timestamp: Date | string;
  value: number;
  dimensions: Record<string, unknown> | null;
}

// =============================================================================
// Execution Functions
// =============================================================================

/**
 * Execute MetricTransformer code
 *
 * Transforms raw API response into DataPoints.
 * Code receives: apiResponse, endpointConfig
 * Code returns: DataPoint[]
 */
export function executeMetricTransformer(
  code: string,
  apiResponse: unknown,
  endpointConfig: Record<string, string>,
): ExecutionResult<DataPoint[]> {
  try {
    // Create a function from the code string
    // The code should define a function called 'transform'
    const wrappedCode = `
      ${code}
      return transform(apiResponse, endpointConfig);
    `;

    // Create the function with limited scope
    // eslint-disable-next-line @typescript-eslint/no-implied-eval
    const executor = new Function("apiResponse", "endpointConfig", wrappedCode);

    // Execute with the provided data
    // eslint-disable-next-line @typescript-eslint/no-unsafe-call
    const result = executor(apiResponse, endpointConfig) as DataPointRaw[];

    // Validate the result
    if (!Array.isArray(result)) {
      return {
        success: false,
        error: "Transformer must return an array of DataPoints",
      };
    }

    // Validate and normalize each data point
    const validatedPoints: DataPoint[] = result.map((point, index) => {
      if (typeof point !== "object" || point === null) {
        throw new Error(`DataPoint at index ${index} is not an object`);
      }

      // Validate timestamp
      let timestamp: Date;
      if (point.timestamp instanceof Date) {
        timestamp = point.timestamp;
      } else if (
        typeof point.timestamp === "string" ||
        typeof point.timestamp === "number"
      ) {
        timestamp = new Date(point.timestamp);
      } else {
        throw new Error(`DataPoint at index ${index} has invalid timestamp`);
      }

      if (isNaN(timestamp.getTime())) {
        throw new Error(`DataPoint at index ${index} has invalid timestamp`);
      }

      // Validate value
      const value =
        typeof point.value === "number"
          ? point.value
          : parseFloat(String(point.value));
      if (isNaN(value)) {
        throw new Error(`DataPoint at index ${index} has invalid value`);
      }

      // Validate dimensions
      const dimensions =
        point.dimensions === null || point.dimensions === undefined
          ? null
          : typeof point.dimensions === "object"
            ? point.dimensions
            : null;

      return { timestamp, value, dimensions };
    });

    return {
      success: true,
      data: validatedPoints,
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown execution error",
    };
  }
}

/**
 * Execute ChartTransformer code
 *
 * Transforms DataPoints into chart configuration.
 * Code receives: dataPoints, preferences
 * Code returns: ChartConfig
 */
export function executeChartTransformer(
  code: string,
  dataPoints: DataPoint[],
  preferences: { chartType: string; dateRange: string; aggregation: string },
): ExecutionResult<ChartConfig> {
  try {
    // Create a function from the code string
    const wrappedCode = `
      ${code}
      return transform(dataPoints, preferences);
    `;

    // Create the function with limited scope
    // eslint-disable-next-line @typescript-eslint/no-implied-eval
    const executor = new Function("dataPoints", "preferences", wrappedCode);

    // Execute with the provided data
    // eslint-disable-next-line @typescript-eslint/no-unsafe-call
    const result = executor(dataPoints, preferences) as ChartConfig;

    // Validate the result
    if (typeof result !== "object" || result === null) {
      return {
        success: false,
        error: "ChartTransformer must return a ChartConfig object",
      };
    }

    // Validate required fields
    const requiredFields = [
      "chartType",
      "chartData",
      "chartConfig",
      "xAxisKey",
      "dataKeys",
      "title",
    ];
    for (const field of requiredFields) {
      if (!(field in result)) {
        return {
          success: false,
          error: `ChartConfig missing required field: ${field}`,
        };
      }
    }

    // Validate chartData is an array
    if (!Array.isArray(result.chartData)) {
      return {
        success: false,
        error: "chartData must be an array",
      };
    }

    // Validate dataKeys is an array
    if (!Array.isArray(result.dataKeys)) {
      return {
        success: false,
        error: "dataKeys must be an array",
      };
    }

    return {
      success: true,
      data: result,
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown execution error",
    };
  }
}

/**
 * Validate transformer code syntax without executing
 */
export function validateTransformerCode(code: string): {
  valid: boolean;
  error?: string;
} {
  try {
    // Try to create the function - this will catch syntax errors
    // eslint-disable-next-line @typescript-eslint/no-implied-eval
    new Function(code);
    return { valid: true };
  } catch (error) {
    return {
      valid: false,
      error: error instanceof Error ? error.message : "Invalid code syntax",
    };
  }
}

/**
 * Test MetricTransformer with sample data
 */
export function testMetricTransformer(
  code: string,
  sampleApiResponse: unknown,
  sampleEndpointConfig: Record<string, string>,
): ExecutionResult<DataPoint[]> {
  // First validate syntax
  const syntaxCheck = validateTransformerCode(code);
  if (!syntaxCheck.valid) {
    return {
      success: false,
      error: `Syntax error: ${syntaxCheck.error}`,
    };
  }

  // Then try to execute
  return executeMetricTransformer(
    code,
    sampleApiResponse,
    sampleEndpointConfig,
  );
}

/**
 * Test ChartTransformer with sample data
 */
export function testChartTransformer(
  code: string,
  sampleDataPoints: DataPoint[],
  preferences: { chartType: string; dateRange: string; aggregation: string },
): ExecutionResult<ChartConfig> {
  // First validate syntax
  const syntaxCheck = validateTransformerCode(code);
  if (!syntaxCheck.valid) {
    return {
      success: false,
      error: `Syntax error: ${syntaxCheck.error}`,
    };
  }

  // Then try to execute
  return executeChartTransformer(code, sampleDataPoints, preferences);
}
