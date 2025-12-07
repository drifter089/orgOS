/** Safely executes AI-generated transformer code with validation. */
import type { ChartConfig, DataPoint } from "@/lib/metrics/transformer-types";

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

/** Execute DataIngestionTransformer: API response → DataPoints */
export function executeDataIngestionTransformer(
  code: string,
  apiResponse: unknown,
  endpointConfig: Record<string, string>,
): ExecutionResult<DataPoint[]> {
  try {
    const wrappedCode = `${code}\nreturn transform(apiResponse, endpointConfig);`;
    // eslint-disable-next-line @typescript-eslint/no-implied-eval
    const executor = new Function("apiResponse", "endpointConfig", wrappedCode);
    // eslint-disable-next-line @typescript-eslint/no-unsafe-call
    const result = executor(apiResponse, endpointConfig) as DataPointRaw[];

    if (!Array.isArray(result)) {
      return {
        success: false,
        error: "Transformer must return an array of DataPoints",
      };
    }

    const validatedPoints: DataPoint[] = result.map((point, index) => {
      if (typeof point !== "object" || point === null) {
        throw new Error(`DataPoint at index ${index} is not an object`);
      }

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

      const value =
        typeof point.value === "number"
          ? point.value
          : parseFloat(String(point.value));
      if (isNaN(value)) {
        throw new Error(`DataPoint at index ${index} has invalid value`);
      }

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
    const errorMsg =
      error instanceof Error ? error.message : "Unknown execution error";
    console.error(`[Executor] Error: ${errorMsg}`);

    return {
      success: false,
      error: errorMsg,
    };
  }
}

/** Execute ChartTransformer: DataPoints → ChartConfig */
export function executeChartTransformer(
  code: string,
  dataPoints: DataPoint[],
  preferences: { chartType: string; dateRange: string; aggregation: string },
): ExecutionResult<ChartConfig> {
  try {
    const wrappedCode = `${code}\nreturn transform(dataPoints, preferences);`;
    // eslint-disable-next-line @typescript-eslint/no-implied-eval
    const executor = new Function("dataPoints", "preferences", wrappedCode);
    // eslint-disable-next-line @typescript-eslint/no-unsafe-call
    const result = executor(dataPoints, preferences) as ChartConfig;

    if (typeof result !== "object" || result === null) {
      return {
        success: false,
        error: "ChartTransformer must return a ChartConfig object",
      };
    }

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

    if (!Array.isArray(result.chartData)) {
      return { success: false, error: "chartData must be an array" };
    }
    if (!Array.isArray(result.dataKeys)) {
      return { success: false, error: "dataKeys must be an array" };
    }

    return {
      success: true,
      data: result,
    };
  } catch (error) {
    const errorMsg =
      error instanceof Error ? error.message : "Unknown execution error";
    console.error(`[Executor-Chart] Error: ${errorMsg}`);

    return {
      success: false,
      error: errorMsg,
    };
  }
}

export function validateTransformerCode(code: string): {
  valid: boolean;
  error?: string;
} {
  try {
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

export function testDataIngestionTransformer(
  code: string,
  sampleApiResponse: unknown,
  sampleEndpointConfig: Record<string, string>,
): ExecutionResult<DataPoint[]> {
  const syntaxCheck = validateTransformerCode(code);
  if (!syntaxCheck.valid) {
    return { success: false, error: `Syntax error: ${syntaxCheck.error}` };
  }
  return executeDataIngestionTransformer(
    code,
    sampleApiResponse,
    sampleEndpointConfig,
  );
}

export function testChartTransformer(
  code: string,
  sampleDataPoints: DataPoint[],
  preferences: { chartType: string; dateRange: string; aggregation: string },
): ExecutionResult<ChartConfig> {
  const syntaxCheck = validateTransformerCode(code);
  if (!syntaxCheck.valid) {
    return { success: false, error: `Syntax error: ${syntaxCheck.error}` };
  }
  return executeChartTransformer(code, sampleDataPoints, preferences);
}
