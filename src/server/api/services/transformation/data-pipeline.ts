/**
 * Data Pipeline Service
 *
 * Handles the complete metric data ingestion workflow:
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
  generateDataIngestionTransformerCode,
  regenerateDataIngestionTransformerCode,
} from "./ai-code-generator";
import {
  executeDataIngestionTransformer,
  testDataIngestionTransformer,
} from "./executor";

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
 * Ingest metric data - UNIFIED FLOW
 *
 * This is the main entry point. It:
 * 1. Fetches data ONCE from the API
 * 2. Gets or creates transformer (with lock to prevent race condition)
 * 3. Executes transformer on the data
 * 4. Saves data points in batch
 */
export async function ingestMetricData(
  input: TransformAndSaveInput,
): Promise<TransformResult> {
  console.info(
    "\n############################################################",
  );
  console.info("# INGEST METRIC DATA");
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
  const { transformer, isNew } = await getOrCreateDataIngestionTransformer(
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
  const result = executeDataIngestionTransformer(
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
 * Get or create DataIngestionTransformer with optimistic concurrency
 *
 * IMPORTANT: AI generation happens OUTSIDE the transaction to prevent
 * connection pool exhaustion. Uses upsert pattern to handle race conditions.
 *
 * Flow:
 * 1. Quick check if transformer exists (no locks)
 * 2. If not, generate code with AI (slow, outside transaction)
 * 3. Upsert to DB (short transaction, handles race condition)
 */
async function getOrCreateDataIngestionTransformer(
  templateId: string,
  integrationId: string,
  template: ReturnType<typeof getTemplate>,
  apiData: unknown,
  endpointConfig: Record<string, string>,
): Promise<{
  transformer: Awaited<
    ReturnType<typeof db.dataIngestionTransformer.findUnique>
  >;
  isNew: boolean;
}> {
  if (!template) {
    throw new TRPCError({
      code: "NOT_FOUND",
      message: `Template not found: ${templateId}`,
    });
  }

  // Step 1: Quick check if transformer already exists (no locks)
  const existing = await db.dataIngestionTransformer.findUnique({
    where: { templateId },
  });

  if (existing) {
    return { transformer: existing, isNew: false };
  }

  // Step 2: No transformer exists - generate one OUTSIDE the transaction
  // This prevents connection pool exhaustion from long-running AI calls
  console.info(`[Transform] No transformer found, generating with AI...`);

  const generated = await generateDataIngestionTransformerCode({
    templateId,
    integrationId,
    endpoint: template.metricEndpoint,
    method: template.method ?? "GET",
    sampleApiResponse: apiData,
    metricDescription: template.description,
    availableParams: template.requiredParams.map((p) => p.name),
  });

  // Test the transformer
  const testResult = testDataIngestionTransformer(
    generated.code,
    apiData,
    endpointConfig,
  );

  let finalCode = generated.code;

  // If first attempt fails, try regenerating once
  if (!testResult.success) {
    console.info(`[Transform] First attempt failed, regenerating...`);

    const regenerated = await regenerateDataIngestionTransformerCode({
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

    const retestResult = testDataIngestionTransformer(
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

  // Step 3: Upsert with short transaction to handle race condition
  // If another request created the transformer while we were generating,
  // the upsert will just return the existing one (no duplicate)
  const transformer = await db.dataIngestionTransformer.upsert({
    where: { templateId },
    create: {
      templateId,
      transformerCode: finalCode,
    },
    update: {}, // If exists, don't update - first writer wins
  });

  // Check if we created it or found existing (created by concurrent request)
  const isNew = transformer.createdAt.getTime() > Date.now() - 5000; // Created in last 5 seconds

  console.info(
    `[Transform] Transformer ${isNew ? "created" : "found (concurrent)"}: ${transformer.id}`,
  );
  return { transformer, isNew };
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
    // Add millisecond offsets to ensure unique timestamps (required by DB constraint)
    console.info(`[SaveDP] Snapshot mode: replacing all data`);
    const baseTimestamp = dataPoints[0]?.timestamp ?? new Date();
    await db.$transaction([
      db.metricDataPoint.deleteMany({ where: { metricId } }),
      db.metricDataPoint.createMany({
        data: dataPoints.map((dp, index) => ({
          metricId,
          // Add index as milliseconds offset to ensure unique timestamps
          timestamp: new Date(baseTimestamp.getTime() + index),
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
 * Refresh metric data points
 *
 * Used by background jobs to refresh metric data.
 */
export async function refreshMetricDataPoints(input: {
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
  const transformer = await db.dataIngestionTransformer.findUnique({
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
  const result = executeDataIngestionTransformer(
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
 * Get DataIngestionTransformer by template ID
 */
export async function getDataIngestionTransformerByTemplateId(
  templateId: string,
) {
  return db.dataIngestionTransformer.findUnique({
    where: { templateId },
  });
}

// =============================================================================
// Unified Refresh Function (used by both cron job and manual refresh)
// =============================================================================

interface RefreshMetricInput {
  metricId: string;
}

interface RefreshMetricResult {
  success: boolean;
  dataPointCount?: number;
  error?: string;
}

/**
 * Refresh metric data and update all associated charts
 *
 * This is the unified function used by both:
 * - Cron job (poll-metrics)
 * - Manual refresh button in dashboard
 *
 * It does:
 * 1. Fetch fresh data from API via DataIngestionTransformer
 * 2. Save DataPoints to database
 * 3. Update metric timestamps (lastFetchedAt, lastError)
 * 4. Re-execute ChartTransformer for all DashboardCharts
 *
 * Note: Does NOT update nextPollAt - that's cron-specific
 */
export async function refreshMetricAndCharts(
  input: RefreshMetricInput,
): Promise<RefreshMetricResult> {
  console.info(
    `[RefreshMetric] Starting refresh for metric: ${input.metricId}`,
  );

  // Get the metric with its integration and dashboard charts
  const metric = await db.metric.findUnique({
    where: { id: input.metricId },
    include: {
      integration: true,
      dashboardCharts: {
        include: { chartTransformer: true },
      },
    },
  });

  if (!metric || !metric.templateId || !metric.integration) {
    return { success: false, error: "Metric not found or not configured" };
  }

  // Get template for isTimeSeries
  const template = getTemplate(metric.templateId);
  const isTimeSeries = template?.isTimeSeries !== false;

  // Step 1: Execute transformer to fetch and save data
  const transformResult = await refreshMetricDataPoints({
    templateId: metric.templateId,
    integrationId: metric.integration.providerId,
    connectionId: metric.integration.connectionId,
    metricId: metric.id,
    endpointConfig: (metric.endpointConfig as Record<string, string>) ?? {},
    isTimeSeries,
  });

  if (!transformResult.success) {
    // Update metric with error
    await db.metric.update({
      where: { id: input.metricId },
      data: { lastError: transformResult.error },
    });
    return { success: false, error: transformResult.error };
  }

  // Step 2: Update metric timestamps
  await db.metric.update({
    where: { id: input.metricId },
    data: {
      lastFetchedAt: new Date(),
      lastError: null,
    },
  });

  // Step 3: Update chart configs for all DashboardCharts
  // Import dynamically to avoid circular dependency
  const { executeChartTransformerForDashboardChart } = await import(
    "./chart-generator"
  );

  for (const dc of metric.dashboardCharts) {
    if (dc.chartTransformer) {
      try {
        await executeChartTransformerForDashboardChart(dc.id);
        console.info(
          `[RefreshMetric] Updated chart for dashboard chart: ${dc.id}`,
        );
      } catch (chartError) {
        console.error(
          `[RefreshMetric] Chart transformer error for ${dc.id}:`,
          chartError,
        );
        // Continue with other charts even if one fails
      }
    }
  }

  console.info(
    `[RefreshMetric] Completed. ${transformResult.dataPoints?.length ?? 0} data points saved`,
  );

  return {
    success: true,
    dataPointCount: transformResult.dataPoints?.length ?? 0,
  };
}
