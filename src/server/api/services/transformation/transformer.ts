/**
 * Unified Transformer Service
 *
 * Handles the complete metric transformation workflow:
 * - Single API fetch (eliminates double fetch)
 * - Transaction-locked transformer creation (prevents race condition)
 * - Batch data point saves (faster than sequential upserts)
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

interface TransformAndSaveInput {
  templateId: string;
  integrationId: string;
  connectionId: string;
  metricId: string;
  endpointConfig: Record<string, string>;
  isTimeSeries?: boolean;
}

interface TransformResult {
  success: boolean;
  dataPoints?: DataPoint[];
  transformerCreated?: boolean;
  error?: string;
}

// =============================================================================
// Helper Functions
// =============================================================================

function dimensionsToJson(
  dimensions: Record<string, unknown> | null,
): Prisma.NullableJsonNullValueInput | Prisma.InputJsonValue {
  if (dimensions === null) return Prisma.DbNull;
  return dimensions as Prisma.InputJsonValue;
}

// =============================================================================
// Main Entry Point
// =============================================================================

/**
 * Transform and save metric data - UNIFIED FLOW
 *
 * This is the main entry point. It:
 * 1. Fetches data ONCE from the API
 * 2. Gets or creates transformer (with lock to prevent race condition)
 * 3. Executes transformer on the data
 * 4. Saves data points in batch
 */
export async function transformAndSaveMetricData(
  input: TransformAndSaveInput,
): Promise<TransformResult> {
  console.info(
    "\n############################################################",
  );
  console.info("# TRANSFORM AND SAVE METRIC DATA");
  console.info("############################################################");
  console.info(`[Transform] Template: ${input.templateId}`);
  console.info(`[Transform] Metric ID: ${input.metricId}`);
  console.info(`[Transform] Endpoint config:`, input.endpointConfig);

  // Get template definition
  const template = getTemplate(input.templateId);
  if (!template) {
    console.error(`[Transform] ERROR: Template not found: ${input.templateId}`);
    return { success: false, error: `Template not found: ${input.templateId}` };
  }

  // Step 1: Fetch data ONCE from API
  console.info(`[Transform] Fetching data from API...`);
  let apiData: unknown;
  try {
    const response = await fetchData(
      input.integrationId,
      input.connectionId,
      template.metricEndpoint,
      {
        method: template.method ?? "GET",
        params: input.endpointConfig,
        body: template.requestBody,
      },
    );
    apiData = response.data;
    console.info(`[Transform] Data fetched successfully`);
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : "Unknown error";
    console.error(`[Transform] ERROR: Failed to fetch data: ${errorMsg}`);
    return { success: false, error: `Failed to fetch data: ${errorMsg}` };
  }

  // Step 2: Get or create transformer (with lock)
  console.info(`[Transform] Getting or creating transformer...`);
  const { transformer, isNew } = await getOrCreateTransformerWithLock(
    input.templateId,
    input.integrationId,
    template,
    apiData,
    input.endpointConfig,
  );

  if (!transformer) {
    return { success: false, error: "Failed to get or create transformer" };
  }

  console.info(
    `[Transform] Transformer ${isNew ? "created" : "found"}: ${transformer.id}`,
  );

  // Step 3: Execute transformer
  console.info(`[Transform] Executing transformer...`);
  const result = executeMetricTransformer(
    transformer.transformerCode,
    apiData,
    input.endpointConfig,
  );

  if (!result.success || !result.data) {
    console.error(`[Transform] ERROR: Transform failed: ${result.error}`);
    return { success: false, error: result.error };
  }

  console.info(
    `[Transform] Transform successful: ${result.data.length} data points`,
  );

  // Step 4: Save data points in batch
  const isTimeSeries = input.isTimeSeries !== false;
  await saveDataPointsBatch(input.metricId, result.data, isTimeSeries);

  console.info(
    "############################################################\n",
  );

  return {
    success: true,
    dataPoints: result.data,
    transformerCreated: isNew,
  };
}

// =============================================================================
// Transformer Management (with race condition prevention)
// =============================================================================

/**
 * Get or create transformer with database-level locking
 *
 * Uses Prisma transaction to prevent race conditions where multiple
 * requests try to create a transformer for the same template.
 */
async function getOrCreateTransformerWithLock(
  templateId: string,
  integrationId: string,
  template: ReturnType<typeof getTemplate>,
  apiData: unknown,
  endpointConfig: Record<string, string>,
): Promise<{
  transformer: Awaited<ReturnType<typeof db.metricTransformer.findUnique>>;
  isNew: boolean;
}> {
  if (!template) {
    throw new TRPCError({
      code: "NOT_FOUND",
      message: `Template not found: ${templateId}`,
    });
  }

  // Use serializable isolation to prevent race conditions
  return db.$transaction(
    async (tx) => {
      // Check if transformer already exists
      const existing = await tx.metricTransformer.findUnique({
        where: { templateId },
      });

      if (existing) {
        return { transformer: existing, isNew: false };
      }

      // No transformer exists - generate one
      console.info(`[Transform] No transformer found, generating with AI...`);

      const generated = await generateMetricTransformerCode({
        templateId,
        integrationId,
        endpoint: template.metricEndpoint,
        method: template.method ?? "GET",
        sampleApiResponse: apiData,
        metricDescription: template.description,
        availableParams: template.requiredParams.map((p) => p.name),
      });

      // Test the transformer
      const testResult = testMetricTransformer(
        generated.code,
        apiData,
        endpointConfig,
      );

      let finalCode = generated.code;

      // If first attempt fails, try regenerating once
      if (!testResult.success) {
        console.info(`[Transform] First attempt failed, regenerating...`);

        const regenerated = await regenerateMetricTransformerCode({
          templateId,
          integrationId,
          endpoint: template.metricEndpoint,
          method: template.method ?? "GET",
          sampleApiResponse: apiData,
          metricDescription: template.description,
          availableParams: template.requiredParams.map((p) => p.name),
          previousCode: generated.code,
          error: testResult.error,
        });

        const retestResult = testMetricTransformer(
          regenerated.code,
          apiData,
          endpointConfig,
        );

        if (!retestResult.success) {
          throw new TRPCError({
            code: "INTERNAL_SERVER_ERROR",
            message: `Failed to generate working transformer: ${retestResult.error}`,
          });
        }

        finalCode = regenerated.code;
      }

      // Save the transformer (no sample data - shared across orgs)
      const transformer = await tx.metricTransformer.create({
        data: {
          templateId,
          transformerCode: finalCode,
        },
      });

      console.info(`[Transform] Transformer created: ${transformer.id}`);
      return { transformer, isNew: true };
    },
    {
      isolationLevel: Prisma.TransactionIsolationLevel.Serializable,
      timeout: 60000, // 60 second timeout for AI generation
    },
  );
}

// =============================================================================
// Data Point Storage (batch operations)
// =============================================================================

/**
 * Save data points in batch - much faster than sequential upserts
 */
async function saveDataPointsBatch(
  metricId: string,
  dataPoints: DataPoint[],
  isTimeSeries: boolean,
): Promise<void> {
  console.info(`[SaveDP] Saving ${dataPoints.length} data points (batch mode)`);

  if (dataPoints.length === 0) {
    console.info(`[SaveDP] No data points to save`);
    return;
  }

  if (!isTimeSeries) {
    // Snapshot mode: delete all and insert fresh
    console.info(`[SaveDP] Snapshot mode: replacing all data`);
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
  } else {
    // Time-series mode: batch upsert using raw SQL for performance
    console.info(`[SaveDP] Time-series mode: batch upsert`);

    // Delete existing data points for timestamps we're about to insert
    // Then insert all new data points - this is faster than individual upserts
    const timestamps = dataPoints.map((dp) => dp.timestamp);

    await db.$transaction([
      db.metricDataPoint.deleteMany({
        where: {
          metricId,
          timestamp: { in: timestamps },
        },
      }),
      db.metricDataPoint.createMany({
        data: dataPoints.map((dp) => ({
          metricId,
          timestamp: dp.timestamp,
          value: dp.value,
          dimensions: dimensionsToJson(dp.dimensions),
        })),
      }),
    ]);
  }

  console.info(`[SaveDP] Batch save complete`);
}

// =============================================================================
// Utility Functions (for polling/background jobs)
// =============================================================================

/**
 * Execute transformer for existing metric (for polling)
 *
 * Used by background jobs to refresh metric data.
 */
export async function executeTransformerForPolling(input: {
  templateId: string;
  integrationId: string;
  connectionId: string;
  metricId: string;
  endpointConfig: Record<string, string>;
  isTimeSeries?: boolean;
}): Promise<TransformResult> {
  console.info(`[Polling] Refreshing metric: ${input.metricId}`);

  // Get template
  const template = getTemplate(input.templateId);
  if (!template) {
    return { success: false, error: `Template not found: ${input.templateId}` };
  }

  // Get transformer
  const transformer = await db.metricTransformer.findUnique({
    where: { templateId: input.templateId },
  });

  if (!transformer) {
    return {
      success: false,
      error: `No transformer for template: ${input.templateId}`,
    };
  }

  // Fetch fresh data
  let apiData: unknown;
  try {
    const response = await fetchData(
      input.integrationId,
      input.connectionId,
      template.metricEndpoint,
      {
        method: template.method ?? "GET",
        params: input.endpointConfig,
        body: template.requestBody,
      },
    );
    apiData = response.data;
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : "Unknown error";
    return { success: false, error: `Failed to fetch data: ${errorMsg}` };
  }

  // Execute transformer
  const result = executeMetricTransformer(
    transformer.transformerCode,
    apiData,
    input.endpointConfig,
  );

  if (!result.success || !result.data) {
    return { success: false, error: result.error };
  }

  // Save data points
  const isTimeSeries = input.isTimeSeries !== false;
  await saveDataPointsBatch(input.metricId, result.data, isTimeSeries);

  return { success: true, dataPoints: result.data };
}

/**
 * Get transformer by template ID
 */
export async function getTransformerByTemplateId(templateId: string) {
  return db.metricTransformer.findUnique({
    where: { templateId },
  });
}
