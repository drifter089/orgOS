/**
 * Safely executes AI-generated transformer code in an isolated sandbox.
 *
 * All code runs in a V8 isolate with no access to Node.js APIs,
 * environment variables, or the file system.
 */
import type { ChartConfig, DataPoint } from "@/lib/metrics/transformer-types";

import { runInSandbox } from "./sandbox";

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

/**
 * Execute DataIngestionTransformer: API response → DataPoints
 *
 * This executor is intentionally "dumb" - it only validates structure.
 * All semantic decisions (aggregation, deduplication, timestamp handling)
 * are the AI transformer's responsibility.
 *
 * Why no aggregation here?
 * - Summing is wrong for averages/percentages (50% + 50% ≠ 100%)
 * - Summing is wrong for gauges (temperature, queue depth)
 * - Summing is wrong for rates (requests/sec)
 * - The AI knows the metric semantics, we don't
 *
 * Why no timestamp normalization?
 * - Some APIs provide hourly data (preserve it)
 * - Some APIs provide exact event times (preserve it)
 * - Forcing midnight destroys information
 */
export async function executeDataIngestionTransformer(
  code: string,
  apiResponse: unknown,
  endpointConfig: Record<string, string>,
): Promise<ExecutionResult<DataPoint[]>> {
  const result = await runInSandbox<DataPointRaw[]>(code, {
    apiResponse,
    endpointConfig,
  });

  if (!result.success || !result.data) {
    return { success: false, error: result.error };
  }

  // Validate structure only - no semantic transformations
  try {
    if (!Array.isArray(result.data)) {
      return {
        success: false,
        error: "Transformer must return an array of DataPoints",
      };
    }

    const validatedPoints: DataPoint[] = [];
    const seenTimestamps = new Set<string>();

    for (let index = 0; index < result.data.length; index++) {
      const point = result.data[index];

      if (typeof point !== "object" || point === null) {
        throw new Error(`DataPoint at index ${index} is not an object`);
      }

      // Parse timestamp (accept Date, string, or number)
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
        throw new Error(
          `DataPoint at index ${index} has invalid timestamp: ${point.timestamp}`,
        );
      }

      // Parse value (coerce to number if needed)
      const value =
        typeof point.value === "number"
          ? point.value
          : parseFloat(String(point.value));
      if (isNaN(value)) {
        throw new Error(
          `DataPoint at index ${index} has invalid value: ${point.value}`,
        );
      }

      // Validate dimensions structure
      const dimensions =
        point.dimensions === null || point.dimensions === undefined
          ? null
          : typeof point.dimensions === "object"
            ? point.dimensions
            : null;

      // Check for duplicate timestamps (AI should have handled this)
      const timestampKey = timestamp.toISOString();
      if (seenTimestamps.has(timestampKey)) {
        // Log warning but take LAST value (not sum) - safer default
        console.info(
          `[Executor] Duplicate timestamp at index ${index}: ${timestampKey}. Using last value.`,
        );
        // Find and replace the existing point
        const existingIdx = validatedPoints.findIndex(
          (p) => p.timestamp.toISOString() === timestampKey,
        );
        if (existingIdx !== -1) {
          validatedPoints[existingIdx] = { timestamp, value, dimensions };
        }
      } else {
        seenTimestamps.add(timestampKey);
        validatedPoints.push({ timestamp, value, dimensions });
      }
    }

    return { success: true, data: validatedPoints };
  } catch (error) {
    const errorMsg =
      error instanceof Error ? error.message : "Validation error";
    return { success: false, error: errorMsg };
  }
}

/** Execute ChartTransformer: DataPoints → ChartConfig */
export async function executeChartTransformer(
  code: string,
  dataPoints: DataPoint[],
  preferences: { chartType: string; cadence: string },
): Promise<ExecutionResult<ChartConfig>> {
  // Convert Date objects to ISO strings for sandbox serialization
  const serializedDataPoints = dataPoints.map((dp) => ({
    ...dp,
    timestamp:
      dp.timestamp instanceof Date ? dp.timestamp.toISOString() : dp.timestamp,
  }));

  const result = await runInSandbox<ChartConfig>(code, {
    dataPoints: serializedDataPoints,
    preferences,
  });

  if (!result.success || !result.data) {
    return { success: false, error: result.error };
  }

  // Validate the chart config
  try {
    if (typeof result.data !== "object" || result.data === null) {
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
      if (!(field in result.data)) {
        return {
          success: false,
          error: `ChartConfig missing required field: ${field}`,
        };
      }
    }

    if (!Array.isArray(result.data.chartData)) {
      return { success: false, error: "chartData must be an array" };
    }
    if (!Array.isArray(result.data.dataKeys)) {
      return { success: false, error: "dataKeys must be an array" };
    }

    return { success: true, data: result.data };
  } catch (error) {
    const errorMsg =
      error instanceof Error ? error.message : "Validation error";
    return { success: false, error: errorMsg };
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

export async function testDataIngestionTransformer(
  code: string,
  sampleApiResponse: unknown,
  sampleEndpointConfig: Record<string, string>,
): Promise<ExecutionResult<DataPoint[]>> {
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

export async function testChartTransformer(
  code: string,
  sampleDataPoints: DataPoint[],
  preferences: { chartType: string; cadence: string },
): Promise<ExecutionResult<ChartConfig>> {
  const syntaxCheck = validateTransformerCode(code);
  if (!syntaxCheck.valid) {
    return { success: false, error: `Syntax error: ${syntaxCheck.error}` };
  }
  return executeChartTransformer(code, sampleDataPoints, preferences);
}
