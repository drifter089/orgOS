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
  console.info("\n---------- EXECUTOR: MetricTransformer ----------");
  console.info(`[Executor] Endpoint config:`, endpointConfig);
  console.info(`[Executor] API response type: ${typeof apiResponse}`);
  if (Array.isArray(apiResponse)) {
    console.info(
      `[Executor] API response is array with ${apiResponse.length} items`,
    );
  }

  try {
    // Create a function from the code string
    // The code should define a function called 'transform'
    const wrappedCode = `
      ${code}
      return transform(apiResponse, endpointConfig);
    `;

    console.info(`[Executor] Creating function from code...`);

    // Create the function with limited scope
    // eslint-disable-next-line @typescript-eslint/no-implied-eval
    const executor = new Function("apiResponse", "endpointConfig", wrappedCode);

    console.info(`[Executor] Executing transformer...`);

    // Execute with the provided data
    // eslint-disable-next-line @typescript-eslint/no-unsafe-call
    const result = executor(apiResponse, endpointConfig) as DataPointRaw[];

    console.info(`[Executor] Raw result type: ${typeof result}`);
    console.info(`[Executor] Raw result is array: ${Array.isArray(result)}`);

    // Validate the result
    if (!Array.isArray(result)) {
      console.error(`[Executor] ERROR: Result is not an array`);
      return {
        success: false,
        error: "Transformer must return an array of DataPoints",
      };
    }

    console.info(`[Executor] Result has ${result.length} items`);
    if (result.length > 0) {
      console.info(
        `[Executor] First item sample:`,
        JSON.stringify(result[0], null, 2),
      );
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

    console.info(
      `[Executor] SUCCESS: Validated ${validatedPoints.length} data points`,
    );
    console.info("---------- END EXECUTOR ----------\n");

    return {
      success: true,
      data: validatedPoints,
    };
  } catch (error) {
    const errorMsg =
      error instanceof Error ? error.message : "Unknown execution error";
    console.error(`[Executor] ERROR: ${errorMsg}`);
    console.error(
      `[Executor] Stack:`,
      error instanceof Error ? error.stack : "N/A",
    );
    console.info("---------- END EXECUTOR (ERROR) ----------\n");

    return {
      success: false,
      error: errorMsg,
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
  console.info("\n---------- EXECUTOR: ChartTransformer ----------");
  console.info(`[Executor-Chart] Preferences:`, preferences);
  console.info(`[Executor-Chart] Data points count: ${dataPoints.length}`);

  try {
    // Create a function from the code string
    const wrappedCode = `
      ${code}
      return transform(dataPoints, preferences);
    `;

    console.info(`[Executor-Chart] Creating function from code...`);

    // Create the function with limited scope
    // eslint-disable-next-line @typescript-eslint/no-implied-eval
    const executor = new Function("dataPoints", "preferences", wrappedCode);

    console.info(`[Executor-Chart] Executing transformer...`);

    // Execute with the provided data
    // eslint-disable-next-line @typescript-eslint/no-unsafe-call
    const result = executor(dataPoints, preferences) as ChartConfig;

    // Validate the result
    if (typeof result !== "object" || result === null) {
      console.error(`[Executor-Chart] ERROR: Result is not an object`);
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
        console.error(
          `[Executor-Chart] ERROR: Missing required field: ${field}`,
        );
        return {
          success: false,
          error: `ChartConfig missing required field: ${field}`,
        };
      }
    }

    // Validate chartData is an array
    if (!Array.isArray(result.chartData)) {
      console.error(`[Executor-Chart] ERROR: chartData is not an array`);
      return {
        success: false,
        error: "chartData must be an array",
      };
    }

    // Validate dataKeys is an array
    if (!Array.isArray(result.dataKeys)) {
      console.error(`[Executor-Chart] ERROR: dataKeys is not an array`);
      return {
        success: false,
        error: "dataKeys must be an array",
      };
    }

    console.info(`[Executor-Chart] SUCCESS: Generated chart config`);
    console.info(`[Executor-Chart] Chart type: ${result.chartType}`);
    console.info(
      `[Executor-Chart] Chart data points: ${result.chartData.length}`,
    );
    console.info(`[Executor-Chart] Data keys: ${result.dataKeys.join(", ")}`);
    console.info("---------- END EXECUTOR: ChartTransformer ----------\n");

    return {
      success: true,
      data: result,
    };
  } catch (error) {
    const errorMsg =
      error instanceof Error ? error.message : "Unknown execution error";
    console.error(`[Executor-Chart] ERROR: ${errorMsg}`);
    console.error(
      `[Executor-Chart] Stack:`,
      error instanceof Error ? error.stack : "N/A",
    );
    console.info(
      "---------- END EXECUTOR: ChartTransformer (ERROR) ----------\n",
    );

    return {
      success: false,
      error: errorMsg,
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
  console.info(`[Validator] Checking syntax...`);
  try {
    // Try to create the function - this will catch syntax errors
    // eslint-disable-next-line @typescript-eslint/no-implied-eval
    new Function(code);
    console.info(`[Validator] Syntax OK`);
    return { valid: true };
  } catch (error) {
    const errorMsg =
      error instanceof Error ? error.message : "Invalid code syntax";
    console.error(`[Validator] SYNTAX ERROR: ${errorMsg}`);
    console.error(`[Validator] Code that failed validation:`);
    console.error("--- BEGIN INVALID CODE ---");
    console.error(code);
    console.error("--- END INVALID CODE ---");
    return {
      valid: false,
      error: errorMsg,
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
  console.info("\n========== TEST: MetricTransformer ==========");

  // First validate syntax
  const syntaxCheck = validateTransformerCode(code);
  if (!syntaxCheck.valid) {
    console.error(`[Test] FAILED: Syntax error - ${syntaxCheck.error}`);
    console.info("========== END TEST (SYNTAX ERROR) ==========\n");
    return {
      success: false,
      error: `Syntax error: ${syntaxCheck.error}`,
    };
  }

  // Then try to execute
  console.info(`[Test] Syntax OK, executing with sample data...`);
  const result = executeMetricTransformer(
    code,
    sampleApiResponse,
    sampleEndpointConfig,
  );

  if (result.success) {
    console.info(
      `[Test] SUCCESS: Generated ${result.data?.length} data points`,
    );
  } else {
    console.error(`[Test] FAILED: ${result.error}`);
  }
  console.info("========== END TEST ==========\n");

  return result;
}

/**
 * Test ChartTransformer with sample data
 */
export function testChartTransformer(
  code: string,
  sampleDataPoints: DataPoint[],
  preferences: { chartType: string; dateRange: string; aggregation: string },
): ExecutionResult<ChartConfig> {
  console.info("\n========== TEST: ChartTransformer ==========");

  // First validate syntax
  const syntaxCheck = validateTransformerCode(code);
  if (!syntaxCheck.valid) {
    console.error(`[Test-Chart] FAILED: Syntax error - ${syntaxCheck.error}`);
    console.info("========== END TEST (SYNTAX ERROR) ==========\n");
    return {
      success: false,
      error: `Syntax error: ${syntaxCheck.error}`,
    };
  }

  // Then try to execute
  console.info(
    `[Test-Chart] Syntax OK, executing with ${sampleDataPoints.length} data points...`,
  );
  const result = executeChartTransformer(code, sampleDataPoints, preferences);

  if (result.success) {
    console.info(
      `[Test-Chart] SUCCESS: Generated chart config for ${result.data?.chartType}`,
    );
  } else {
    console.error(`[Test-Chart] FAILED: ${result.error}`);
  }
  console.info("========== END TEST ==========\n");

  return result;
}
