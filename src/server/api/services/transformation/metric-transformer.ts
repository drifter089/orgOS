/**
 * MetricTransformer Service
 *
 * Handles the full workflow for MetricTransformers:
 * - Check if transformer exists for template
 * - Generate new transformer with AI
 * - Execute transformer against API data
 * - Handle failures and regeneration
 */
import { Prisma } from "@prisma/client";
import { TRPCError } from "@trpc/server";

import { getTemplate } from "@/lib/integrations";
import type { DataPoint } from "@/lib/metrics/transformer-types";
import { db } from "@/server/db";

import { fetchData } from "../data-fetching/nango";
import {
  generateMetricTransformerCode,
  regenerateMetricTransformerCode,
} from "./ai-generator";
import { executeMetricTransformer, testMetricTransformer } from "./executor";

// =============================================================================
// Types
// =============================================================================

interface GetOrCreateTransformerInput {
  templateId: string;
  integrationId: string;
  connectionId: string;
  endpointConfig: Record<string, string>;
}

interface TransformResult {
  success: boolean;
  dataPoints?: DataPoint[];
  error?: string;
}

// =============================================================================
// Helper Functions
// =============================================================================

/**
 * Convert DataPoints to JSON-compatible format for Prisma
 */
function dataPointsToJson(
  dataPoints: DataPoint[] | undefined,
): Prisma.InputJsonValue | undefined {
  if (!dataPoints) return undefined;
  return dataPoints.map((dp) => ({
    timestamp: dp.timestamp.toISOString(),
    value: dp.value,
    dimensions: dp.dimensions ?? undefined,
  })) as Prisma.InputJsonValue;
}

/**
 * Convert dimensions to Prisma-compatible format
 */
function dimensionsToJson(
  dimensions: Record<string, unknown> | null,
): Prisma.NullableJsonNullValueInput | Prisma.InputJsonValue {
  if (dimensions === null) return Prisma.DbNull;
  return dimensions as Prisma.InputJsonValue;
}

// =============================================================================
// Service Functions
// =============================================================================

/**
 * Get existing transformer or create a new one
 *
 * This is called when a metric is created.
 * If no transformer exists for this template, we:
 * 1. Fetch sample data from the API
 * 2. Pass to AI to generate transformer code
 * 3. Test the transformer
 * 4. Save to database
 */
export async function getOrCreateMetricTransformer(
  input: GetOrCreateTransformerInput,
): Promise<{ transformerId: string; isNew: boolean }> {
  console.info(
    "\n############################################################",
  );
  console.info("# GET OR CREATE METRIC TRANSFORMER");
  console.info("############################################################");
  console.info(`[Transformer] Template: ${input.templateId}`);
  console.info(`[Transformer] Integration: ${input.integrationId}`);
  console.info(`[Transformer] Connection: ${input.connectionId}`);
  console.info(`[Transformer] Endpoint config:`, input.endpointConfig);

  // Check if transformer already exists
  console.info(`[Transformer] Checking for existing transformer...`);
  const existing = await db.metricTransformer.findUnique({
    where: { templateId: input.templateId },
  });

  if (existing?.status === "active") {
    console.info(
      `[Transformer] Found existing active transformer: ${existing.id}`,
    );
    console.info(
      "############################################################\n",
    );
    return { transformerId: existing.id, isNew: false };
  }

  console.info(
    `[Transformer] No active transformer found, creating new one...`,
  );

  // Get template definition
  const template = getTemplate(input.templateId);
  if (!template) {
    console.error(
      `[Transformer] ERROR: Template not found: ${input.templateId}`,
    );
    throw new TRPCError({
      code: "NOT_FOUND",
      message: `Template not found: ${input.templateId}`,
    });
  }

  console.info(`[Transformer] Template loaded: ${template.label}`);
  console.info(`[Transformer] Metric endpoint: ${template.metricEndpoint}`);
  console.info(`[Transformer] Method: ${template.method ?? "GET"}`);
  if (template.requestBody) {
    console.info(`[Transformer] Has request body: yes`);
  }

  // Fetch sample data from the API
  console.info(`[Transformer] Fetching sample data from API...`);
  const sampleResponse = await fetchData(
    input.integrationId,
    input.connectionId,
    template.metricEndpoint,
    {
      method: template.method ?? "GET",
      params: input.endpointConfig,
      body: template.requestBody,
    },
  );

  console.info(`[Transformer] Sample data fetched successfully`);
  console.info(`[Transformer] Sample data type: ${typeof sampleResponse.data}`);
  if (Array.isArray(sampleResponse.data)) {
    console.info(
      `[Transformer] Sample data is array with ${sampleResponse.data.length} items`,
    );
  }

  // Generate transformer code with AI
  console.info(`[Transformer] Generating transformer code with AI...`);
  const generated = await generateMetricTransformerCode({
    templateId: input.templateId,
    integrationId: input.integrationId,
    endpoint: template.metricEndpoint,
    method: template.method ?? "GET",
    sampleApiResponse: sampleResponse.data,
    metricDescription: template.description,
    availableParams: template.requiredParams.map(
      (p: { name: string }) => p.name,
    ),
  });

  // Test the transformer
  console.info(`[Transformer] Testing generated code...`);
  const testResult = testMetricTransformer(
    generated.code,
    sampleResponse.data,
    input.endpointConfig,
  );

  if (!testResult.success) {
    console.error(`[Transformer] First attempt FAILED: ${testResult.error}`);
    console.info(`[Transformer] Attempting regeneration...`);

    // Try regenerating once
    const regenerated = await regenerateMetricTransformerCode({
      templateId: input.templateId,
      integrationId: input.integrationId,
      endpoint: template.metricEndpoint,
      method: template.method ?? "GET",
      sampleApiResponse: sampleResponse.data,
      metricDescription: template.description,
      availableParams: template.requiredParams.map(
        (p: { name: string }) => p.name,
      ),
      previousCode: generated.code,
      error: testResult.error,
    });

    console.info(`[Transformer] Testing regenerated code...`);
    const retestResult = testMetricTransformer(
      regenerated.code,
      sampleResponse.data,
      input.endpointConfig,
    );

    if (!retestResult.success) {
      console.error(`[Transformer] REGENERATION FAILED: ${retestResult.error}`);
      console.info(
        "############################################################\n",
      );
      throw new TRPCError({
        code: "INTERNAL_SERVER_ERROR",
        message: `Failed to generate working transformer: ${retestResult.error}`,
      });
    }

    console.info(`[Transformer] Regeneration SUCCESS! Saving to database...`);

    // Save the regenerated transformer
    const transformer = await db.metricTransformer.upsert({
      where: { templateId: input.templateId },
      create: {
        templateId: input.templateId,
        pollingEndpoint: template.metricEndpoint,
        pollingMethod: "GET",
        historicalEndpoint: template.metricEndpoint,
        historicalMethod: "GET",
        transformerCode: regenerated.code,
        inputExample: sampleResponse.data as Prisma.InputJsonValue,
        outputExample: dataPointsToJson(retestResult.data),
        status: "active",
      },
      update: {
        transformerCode: regenerated.code,
        inputExample: sampleResponse.data as Prisma.InputJsonValue,
        outputExample: dataPointsToJson(retestResult.data),
        status: "active",
        version: { increment: 1 },
        failureCount: 0,
      },
    });

    console.info(`[Transformer] Saved transformer: ${transformer.id}`);
    console.info(
      "############################################################\n",
    );
    return { transformerId: transformer.id, isNew: true };
  }

  console.info(`[Transformer] First attempt SUCCESS! Saving to database...`);

  // Save the transformer
  const transformer = await db.metricTransformer.upsert({
    where: { templateId: input.templateId },
    create: {
      templateId: input.templateId,
      pollingEndpoint: template.metricEndpoint,
      pollingMethod: "GET",
      historicalEndpoint: template.metricEndpoint,
      historicalMethod: "GET",
      transformerCode: generated.code,
      inputExample: sampleResponse.data as Prisma.InputJsonValue,
      outputExample: dataPointsToJson(testResult.data),
      status: "active",
    },
    update: {
      transformerCode: generated.code,
      inputExample: sampleResponse.data as Prisma.InputJsonValue,
      outputExample: dataPointsToJson(testResult.data),
      status: "active",
      version: { increment: 1 },
      failureCount: 0,
    },
  });

  console.info(`[Transformer] Saved transformer: ${transformer.id}`);
  console.info(
    "############################################################\n",
  );
  return { transformerId: transformer.id, isNew: true };
}

/**
 * Execute transformer for a metric
 *
 * Fetches data from API and transforms it to DataPoints.
 */
export async function executeTransformerForMetric(input: {
  templateId: string;
  integrationId: string;
  connectionId: string;
  endpointConfig: Record<string, string>;
  useHistorical?: boolean;
}): Promise<TransformResult> {
  console.info("\n============ EXECUTE TRANSFORMER FOR METRIC ============");
  console.info(`[Execute] Template: ${input.templateId}`);
  console.info(`[Execute] Use historical: ${input.useHistorical ?? false}`);
  console.info(`[Execute] Endpoint config:`, input.endpointConfig);

  // Get the transformer
  console.info(`[Execute] Fetching transformer from database...`);
  const transformer = await db.metricTransformer.findUnique({
    where: { templateId: input.templateId },
  });

  if (!transformer) {
    console.error(
      `[Execute] ERROR: No transformer found for template: ${input.templateId}`,
    );
    return {
      success: false,
      error: `No transformer found for template: ${input.templateId}`,
    };
  }

  console.info(`[Execute] Transformer found: ${transformer.id}`);
  console.info(`[Execute] Transformer status: ${transformer.status}`);

  if (transformer.status !== "active") {
    console.error(
      `[Execute] ERROR: Transformer is not active: ${transformer.status}`,
    );
    return {
      success: false,
      error: `Transformer is not active: ${transformer.status}`,
    };
  }

  // Determine which endpoint and transformer code to use
  const endpoint = input.useHistorical
    ? (transformer.historicalEndpoint ?? transformer.pollingEndpoint)
    : transformer.pollingEndpoint;

  const code =
    input.useHistorical && transformer.historicalTransformerCode
      ? transformer.historicalTransformerCode
      : transformer.transformerCode;

  console.info(`[Execute] Using endpoint: ${endpoint}`);

  if (!endpoint || !code) {
    console.error(`[Execute] ERROR: Endpoint or code not configured`);
    return {
      success: false,
      error: "Transformer endpoint or code not configured",
    };
  }

  // Fetch data from API
  console.info(`[Execute] Fetching data from API...`);
  let apiResponse;
  try {
    apiResponse = await fetchData(
      input.integrationId,
      input.connectionId,
      endpoint,
      {
        method:
          ((input.useHistorical
            ? transformer.historicalMethod
            : transformer.pollingMethod) as "GET" | "POST") ?? "GET",
        params: input.endpointConfig,
      },
    );
    console.info(`[Execute] API data fetched successfully`);
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : "Unknown error";
    console.error(`[Execute] ERROR: Failed to fetch data: ${errorMsg}`);
    return {
      success: false,
      error: `Failed to fetch data: ${errorMsg}`,
    };
  }

  // Execute the transformer
  console.info(`[Execute] Executing transformer...`);
  const result = executeMetricTransformer(
    code,
    apiResponse.data,
    input.endpointConfig,
  );

  if (!result.success) {
    console.error(
      `[Execute] ERROR: Transformer execution failed: ${result.error}`,
    );
    // Increment failure count
    await db.metricTransformer.update({
      where: { templateId: input.templateId },
      data: { failureCount: { increment: 1 } },
    });

    console.info("============ END EXECUTE TRANSFORMER (ERROR) ============\n");
    return {
      success: false,
      error: result.error,
    };
  }

  // Reset failure count on success
  await db.metricTransformer.update({
    where: { templateId: input.templateId },
    data: { failureCount: 0 },
  });

  console.info(
    `[Execute] SUCCESS: Generated ${result.data?.length} data points`,
  );
  console.info("============ END EXECUTE TRANSFORMER ============\n");

  return {
    success: true,
    dataPoints: result.data,
  };
}

/**
 * Handle transformer failure and regeneration
 *
 * Called when a transformer fails multiple times.
 * Threshold: 3 failures triggers regeneration.
 */
export async function handleTransformerFailure(input: {
  templateId: string;
  integrationId: string;
  connectionId: string;
  endpointConfig: Record<string, string>;
  error: string;
}): Promise<{ regenerated: boolean; error?: string }> {
  const transformer = await db.metricTransformer.findUnique({
    where: { templateId: input.templateId },
  });

  if (!transformer) {
    return { regenerated: false, error: "Transformer not found" };
  }

  // Check if we've hit the failure threshold
  const FAILURE_THRESHOLD = 3;
  if (transformer.failureCount < FAILURE_THRESHOLD) {
    return { regenerated: false };
  }

  // Get template definition
  const template = getTemplate(input.templateId);
  if (!template) {
    return { regenerated: false, error: "Template not found" };
  }

  try {
    // Fetch fresh sample data
    const sampleResponse = await fetchData(
      input.integrationId,
      input.connectionId,
      template.metricEndpoint,
      {
        method: template.method ?? "GET",
        params: input.endpointConfig,
        body: template.requestBody,
      },
    );

    // Regenerate transformer code
    const regenerated = await regenerateMetricTransformerCode({
      templateId: input.templateId,
      integrationId: input.integrationId,
      endpoint: template.metricEndpoint,
      method: template.method ?? "GET",
      sampleApiResponse: sampleResponse.data,
      metricDescription: template.description,
      availableParams: template.requiredParams.map(
        (p: { name: string }) => p.name,
      ),
      previousCode: transformer.transformerCode,
      error: input.error,
    });

    // Test the new code
    const testResult = testMetricTransformer(
      regenerated.code,
      sampleResponse.data,
      input.endpointConfig,
    );

    if (!testResult.success) {
      // Mark as failed if regeneration doesn't work
      await db.metricTransformer.update({
        where: { templateId: input.templateId },
        data: { status: "failed" },
      });

      return {
        regenerated: false,
        error: `Regeneration failed: ${testResult.error}`,
      };
    }

    // Update with new code
    await db.metricTransformer.update({
      where: { templateId: input.templateId },
      data: {
        transformerCode: regenerated.code,
        inputExample: sampleResponse.data as Prisma.InputJsonValue,
        outputExample: dataPointsToJson(testResult.data),
        version: { increment: 1 },
        failureCount: 0,
        status: "active",
      },
    });

    return { regenerated: true };
  } catch (error) {
    return {
      regenerated: false,
      error: error instanceof Error ? error.message : "Regeneration failed",
    };
  }
}

/**
 * Save data points to database
 */
export async function saveDataPoints(
  metricId: string,
  dataPoints: DataPoint[],
  isTimeSeries: boolean,
): Promise<void> {
  console.info("\n------------ SAVE DATA POINTS ------------");
  console.info(`[SaveDP] Metric ID: ${metricId}`);
  console.info(`[SaveDP] Data points count: ${dataPoints.length}`);
  console.info(`[SaveDP] Is time series: ${isTimeSeries}`);

  if (dataPoints.length > 0) {
    console.info(`[SaveDP] First data point:`, {
      timestamp: dataPoints[0]!.timestamp,
      value: dataPoints[0]!.value,
      dimensions: dataPoints[0]!.dimensions,
    });
  }

  if (!isTimeSeries) {
    console.info(
      `[SaveDP] Snapshot mode: deleting existing and inserting new...`,
    );
    // For snapshot data (e.g., Google Sheets), replace all existing data
    await db.$transaction([
      db.metricDataPoint.deleteMany({ where: { metricId } }),
      db.metricDataPoint.createMany({
        data: dataPoints.map((dp) => ({
          metricId,
          timestamp: dp.timestamp,
          value: dp.value,
          dimensions: dimensionsToJson(dp.dimensions),
        })),
      }),
    ]);
    console.info(`[SaveDP] Snapshot save complete`);
  } else {
    console.info(
      `[SaveDP] Time-series mode: upserting ${dataPoints.length} data points...`,
    );
    // For time-series data, upsert each data point
    for (const dp of dataPoints) {
      await db.metricDataPoint.upsert({
        where: {
          metricId_timestamp: {
            metricId,
            timestamp: dp.timestamp,
          },
        },
        create: {
          metricId,
          timestamp: dp.timestamp,
          value: dp.value,
          dimensions: dimensionsToJson(dp.dimensions),
        },
        update: {
          value: dp.value,
          dimensions: dimensionsToJson(dp.dimensions),
        },
      });
    }
    console.info(`[SaveDP] Time-series upsert complete`);
  }

  console.info("------------ END SAVE DATA POINTS ------------\n");
}

/**
 * Get transformer by template ID
 */
export async function getTransformerByTemplateId(templateId: string) {
  return db.metricTransformer.findUnique({
    where: { templateId },
  });
}
