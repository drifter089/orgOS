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

function dimensionsToJson(
  dimensions: Record<string, unknown> | null,
): Prisma.NullableJsonNullValueInput | Prisma.InputJsonValue {
  if (dimensions === null) return Prisma.DbNull;
  return dimensions as Prisma.InputJsonValue;
}

/** Fetches API data and logs the result. Shared by ingestMetricData and refreshMetricDataPoints. */
async function fetchApiDataWithLogging(input: {
  metricId: string;
  integrationId: string;
  connectionId: string;
  endpoint: string;
  method?: "GET" | "POST" | "PUT" | "PATCH" | "DELETE";
  endpointConfig: Record<string, string>;
  requestBody?: unknown;
}): Promise<
  { success: true; data: unknown } | { success: false; error: string }
> {
  try {
    const response = await fetchData(
      input.integrationId,
      input.connectionId,
      input.endpoint,
      {
        method: input.method ?? "GET",
        params: input.endpointConfig,
        body: input.requestBody,
      },
    );

    await db.metricApiLog
      .create({
        data: {
          metricId: input.metricId,
          rawResponse: response.data as Prisma.InputJsonValue,
          endpoint: input.endpoint,
          endpointConfig: input.endpointConfig as Prisma.InputJsonValue,
          success: true,
        },
      })
      .catch(() => undefined);

    return { success: true, data: response.data };
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : "Unknown error";

    await db.metricApiLog
      .create({
        data: {
          metricId: input.metricId,
          rawResponse: Prisma.JsonNull,
          endpoint: input.endpoint,
          endpointConfig: input.endpointConfig as Prisma.InputJsonValue,
          success: false,
          error: errorMsg,
        },
      })
      .catch(() => undefined);

    return { success: false, error: errorMsg };
  }
}

/**
 * Main entry point for metric data ingestion.
 * Fetches data once, gets/creates transformer, executes it, and saves results.
 */
export async function ingestMetricData(
  input: TransformAndSaveInput,
): Promise<TransformResult> {
  console.info(
    `[Transform] Starting: ${input.templateId} for metric ${input.metricId}`,
  );

  const template = getTemplate(input.templateId);
  if (!template) {
    console.error(`[Transform] ERROR: Template not found: ${input.templateId}`);
    return { success: false, error: `Template not found: ${input.templateId}` };
  }

  const fetchResult = await fetchApiDataWithLogging({
    metricId: input.metricId,
    integrationId: input.integrationId,
    connectionId: input.connectionId,
    endpoint: template.metricEndpoint,
    method: template.method,
    endpointConfig: input.endpointConfig,
    requestBody: template.requestBody,
  });

  if (!fetchResult.success) {
    console.error(
      `[Transform] ERROR: Failed to fetch data: ${fetchResult.error}`,
    );
    return {
      success: false,
      error: `Failed to fetch data: ${fetchResult.error}`,
    };
  }

  const apiData = fetchResult.data;

  // All metrics use metricId as cache key (independent metrics)
  const cacheKey = input.metricId;

  const { transformer, isNew } = await getOrCreateDataIngestionTransformer(
    cacheKey,
    input.integrationId,
    template,
    apiData,
    input.endpointConfig,
  );

  if (!transformer) {
    return { success: false, error: "Failed to get or create transformer" };
  }

  if (isNew) {
    console.info(`[Transform] Created new transformer: ${transformer.id}`);
  }

  const result = await executeDataIngestionTransformer(
    transformer.transformerCode,
    apiData,
    input.endpointConfig,
  );

  if (!result.success || !result.data) {
    console.error(`[Transform] Transform failed: ${result.error}`);
    return { success: false, error: result.error };
  }

  const isTimeSeries = input.isTimeSeries !== false;
  await saveDataPointsBatch(input.metricId, result.data, isTimeSeries);

  console.info(
    `[Transform] Completed: ${result.data.length} data points saved`,
  );

  return {
    success: true,
    dataPoints: result.data,
    transformerCreated: isNew,
  };
}

/**
 * Get or create transformer with optimistic concurrency.
 * AI generation happens outside transaction to prevent connection pool exhaustion.
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

  const existing = await db.dataIngestionTransformer.findUnique({
    where: { templateId },
  });

  if (existing) {
    return { transformer: existing, isNew: false };
  }

  const generated = await generateDataIngestionTransformerCode({
    templateId,
    integrationId,
    endpoint: template.metricEndpoint,
    method: template.method ?? "GET",
    sampleApiResponse: apiData,
    metricDescription: template.description,
    availableParams: template.requiredParams.map((p) => p.name),
    endpointConfig,
    extractionPrompt: template.extractionPrompt,
  });

  const testResult = await testDataIngestionTransformer(
    generated.code,
    apiData,
    endpointConfig,
  );

  let finalCode = generated.code;
  let finalValueLabel = generated.valueLabel;
  let finalDataDescription = generated.dataDescription;

  if (!testResult.success) {
    const regenerated = await regenerateDataIngestionTransformerCode({
      templateId,
      integrationId,
      endpoint: template.metricEndpoint,
      method: template.method ?? "GET",
      sampleApiResponse: apiData,
      metricDescription: template.description,
      availableParams: template.requiredParams.map((p) => p.name),
      endpointConfig,
      extractionPrompt: template.extractionPrompt,
      previousCode: generated.code,
      error: testResult.error,
    });

    const retestResult = await testDataIngestionTransformer(
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
    finalValueLabel = regenerated.valueLabel;
    finalDataDescription = regenerated.dataDescription;
  }

  // Upsert handles race condition - if another request created it, we just use that
  const transformer = await db.dataIngestionTransformer.upsert({
    where: { templateId },
    create: {
      templateId,
      transformerCode: finalCode,
      valueLabel: finalValueLabel,
      dataDescription: finalDataDescription,
      extractionPromptUsed: template.extractionPrompt,
    },
    update: {},
  });

  const isNew = transformer.createdAt.getTime() > Date.now() - 5000;

  return { transformer, isNew };
}

/**
 * Save data points to database.
 * AI transformer is responsible for aggregation - we just upsert by timestamp.
 * Delete-then-insert pattern handles the unique constraint on (metricId, timestamp).
 */
async function saveDataPointsBatch(
  metricId: string,
  dataPoints: DataPoint[],
  isTimeSeries: boolean,
): Promise<void> {
  if (dataPoints.length === 0) {
    return;
  }

  if (!isTimeSeries) {
    // Snapshot mode: replace all data
    const baseTimestamp = dataPoints[0]?.timestamp ?? new Date();
    await db.$transaction([
      db.metricDataPoint.deleteMany({ where: { metricId } }),
      db.metricDataPoint.createMany({
        data: dataPoints.map((dp, index) => ({
          metricId,
          timestamp: new Date(baseTimestamp.getTime() + index),
          value: dp.value,
          dimensions: dimensionsToJson(dp.dimensions),
        })),
      }),
    ]);
  } else {
    // Time-series mode: upsert by timestamp (delete existing, insert new)
    const timestamps = dataPoints.map((dp) => dp.timestamp);

    await db.$transaction([
      db.metricDataPoint.deleteMany({
        where: { metricId, timestamp: { in: timestamps } },
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
}

/** Used by background jobs to refresh metric data. */
export async function refreshMetricDataPoints(input: {
  templateId: string;
  integrationId: string;
  connectionId: string;
  metricId: string;
  endpointConfig: Record<string, string>;
  isTimeSeries?: boolean;
}): Promise<TransformResult> {
  const template = getTemplate(input.templateId);
  if (!template) {
    return { success: false, error: `Template not found: ${input.templateId}` };
  }

  // All metrics use metricId as cache key (independent metrics)
  const cacheKey = input.metricId;

  const transformer = await db.dataIngestionTransformer.findUnique({
    where: { templateId: cacheKey },
  });
  if (!transformer) {
    // No transformer for this metric - need to create one
    // This handles backward compatibility for old metrics
    console.info(
      `[RefreshMetric] No transformer found for metric ${input.metricId}, creating new one`,
    );
    return ingestMetricData({
      ...input,
      isTimeSeries: input.isTimeSeries,
    });
  }

  const fetchResult = await fetchApiDataWithLogging({
    metricId: input.metricId,
    integrationId: input.integrationId,
    connectionId: input.connectionId,
    endpoint: template.metricEndpoint,
    method: template.method,
    endpointConfig: input.endpointConfig,
    requestBody: template.requestBody,
  });

  if (!fetchResult.success) {
    return {
      success: false,
      error: `Failed to fetch data: ${fetchResult.error}`,
    };
  }

  const result = await executeDataIngestionTransformer(
    transformer.transformerCode,
    fetchResult.data,
    input.endpointConfig,
  );
  if (!result.success || !result.data) {
    return { success: false, error: result.error };
  }

  const isTimeSeries = input.isTimeSeries !== false;
  await saveDataPointsBatch(input.metricId, result.data, isTimeSeries);

  return { success: true, dataPoints: result.data };
}

export async function getDataIngestionTransformerByTemplateId(
  templateId: string,
) {
  return db.dataIngestionTransformer.findUnique({
    where: { templateId },
  });
}

interface RefreshMetricInput {
  metricId: string;
  /** When true, deletes existing transformer and regenerates from scratch */
  forceRegenerate?: boolean;
}

interface RefreshMetricResult {
  success: boolean;
  dataPointCount?: number;
  error?: string;
}

/** Helper to update refresh status */
async function setRefreshStatus(
  metricId: string,
  status: string | null,
): Promise<void> {
  await db.metric.update({
    where: { id: metricId },
    data: { refreshStatus: status },
  });
}

/** Refresh metric data and update all associated charts. Used by cron and manual refresh. */
export async function refreshMetricAndCharts(
  input: RefreshMetricInput,
): Promise<RefreshMetricResult> {
  const metric = await db.metric.findUnique({
    where: { id: input.metricId },
    include: {
      integration: true,
      dashboardCharts: { include: { chartTransformer: true } },
    },
  });

  if (!metric || !metric.templateId || !metric.integration) {
    return { success: false, error: "Metric not found or not configured" };
  }

  try {
    // Step 1: Fetching API data
    await setRefreshStatus(input.metricId, "fetching-api-data");

    const template = getTemplate(metric.templateId);
    const isTimeSeries = template?.isTimeSeries !== false;

    let transformResult: TransformResult;

    if (input.forceRegenerate) {
      // HARD REFRESH: Delete everything and regenerate from scratch
      // All metrics use metricId as cache key (independent metrics)
      const cacheKey = metric.id;

      // Step 2: Delete old data points
      await setRefreshStatus(input.metricId, "deleting-old-data");
      await db.metricDataPoint.deleteMany({
        where: { metricId: metric.id },
      });

      // Step 3: Delete old transformer
      await setRefreshStatus(input.metricId, "deleting-old-transformer");
      await db.dataIngestionTransformer
        .delete({ where: { templateId: cacheKey } })
        .catch(() => {
          // Ignore if doesn't exist
        });

      console.info(
        `[RefreshMetric] Hard refresh - deleted old data for metric: ${metric.id}`,
      );

      // Step 4: AI regenerating transformer
      await setRefreshStatus(
        input.metricId,
        "generating-ingestion-transformer",
      );

      // Use ingestMetricData which will create new transformer
      transformResult = await ingestMetricData({
        templateId: metric.templateId,
        integrationId: metric.integration.providerId,
        connectionId: metric.integration.connectionId,
        metricId: metric.id,
        endpointConfig: (metric.endpointConfig as Record<string, string>) ?? {},
        isTimeSeries,
      });
    } else {
      // SOFT REFRESH: Reuse existing transformer
      // Step 2: Running existing transformer
      await setRefreshStatus(input.metricId, "executing-ingestion-transformer");

      // Normal refresh using existing transformer
      transformResult = await refreshMetricDataPoints({
        templateId: metric.templateId,
        integrationId: metric.integration.providerId,
        connectionId: metric.integration.connectionId,
        metricId: metric.id,
        endpointConfig: (metric.endpointConfig as Record<string, string>) ?? {},
        isTimeSeries,
      });
    }

    if (!transformResult.success) {
      await db.metric.update({
        where: { id: input.metricId },
        data: { lastError: transformResult.error, refreshStatus: null },
      });
      return { success: false, error: transformResult.error };
    }

    // Step 3: Saving data points (already done in ingestMetricData/refreshMetricDataPoints)
    await setRefreshStatus(input.metricId, "saving-timeseries-data");

    await db.metric.update({
      where: { id: input.metricId },
      data: { lastFetchedAt: new Date(), lastError: null },
    });

    // Step 4: Updating charts
    await setRefreshStatus(input.metricId, "executing-chart-transformer");

    // Fetch dataPoints once for all chart transformers (avoids N+1 queries)
    const chartsWithTransformers = metric.dashboardCharts.filter(
      (dc) => dc.chartTransformer,
    );

    if (chartsWithTransformers.length > 0) {
      // Get fresh dataPoints once - up to 1000 for chart generation
      const freshDataPoints = await db.metricDataPoint.findMany({
        where: { metricId: metric.id },
        orderBy: { timestamp: "desc" },
        take: 1000,
      });

      const dataPointsForChart: DataPoint[] = freshDataPoints.map((dp) => ({
        timestamp: dp.timestamp,
        value: dp.value,
        dimensions: dp.dimensions as Record<string, unknown> | null,
      }));

      // Dynamic import to avoid circular dependency
      const { executeChartTransformerWithData } = await import(
        "./chart-generator"
      );

      for (const dc of chartsWithTransformers) {
        const transformer = dc.chartTransformer!;
        try {
          // Pass data directly - no re-fetching
          await executeChartTransformerWithData({
            dashboardChartId: dc.id,
            transformerCode: transformer.transformerCode,
            chartType: transformer.chartType,
            cadence: transformer.cadence,
            dataPoints: dataPointsForChart,
          });
        } catch (chartError) {
          console.error(
            `[RefreshMetric] Chart transformer error for ${dc.id}:`,
            chartError,
          );
          // Continue with other charts even if one fails
        }
      }
    }

    // Clear status on success
    await setRefreshStatus(input.metricId, null);

    return {
      success: true,
      dataPointCount: transformResult.dataPoints?.length ?? 0,
    };
  } catch (error) {
    // Clear status on error
    await db.metric.update({
      where: { id: input.metricId },
      data: {
        refreshStatus: null,
        lastError: error instanceof Error ? error.message : "Unknown error",
      },
    });
    throw error;
  }
}

/**
 * Update chart for manual metric. Reuses existing transformer code if available.
 * Only calls AI to generate new code if no transformer exists.
 */
export async function updateManualMetricChart(input: {
  metricId: string;
}): Promise<{ success: boolean; error?: string }> {
  const metric = await db.metric.findUnique({
    where: { id: input.metricId },
    include: {
      dashboardCharts: { include: { chartTransformer: true } },
    },
  });

  if (!metric) {
    return { success: false, error: "Metric not found" };
  }

  const dashboardChart = metric.dashboardCharts[0];
  if (!dashboardChart) {
    return { success: false, error: "No dashboard chart found" };
  }

  // Get fresh data points
  const freshDataPoints = await db.metricDataPoint.findMany({
    where: { metricId: metric.id },
    orderBy: { timestamp: "desc" },
    take: 1000,
  });

  if (freshDataPoints.length === 0) {
    return { success: false, error: "No data points to visualize" };
  }

  const dataPointsForChart: DataPoint[] = freshDataPoints.map((dp) => ({
    timestamp: dp.timestamp,
    value: dp.value,
    dimensions: dp.dimensions as Record<string, unknown> | null,
  }));

  const transformer = dashboardChart.chartTransformer;

  if (transformer) {
    // Transformer exists - just execute existing code (no AI)
    const { executeChartTransformerWithData } = await import(
      "./chart-generator"
    );

    const result = await executeChartTransformerWithData({
      dashboardChartId: dashboardChart.id,
      transformerCode: transformer.transformerCode,
      chartType: transformer.chartType,
      cadence: transformer.cadence,
      dataPoints: dataPointsForChart,
    });

    return { success: result.success, error: result.error };
  } else {
    // No transformer - create one (AI call, happens once)
    const { createChartTransformer } = await import("./chart-generator");

    const endpointConfig = metric.endpointConfig as {
      cadence?: string;
    } | null;
    const cadence = endpointConfig?.cadence?.toUpperCase() ?? "DAILY";

    await createChartTransformer({
      dashboardChartId: dashboardChart.id,
      metricName: metric.name,
      metricDescription: metric.description ?? "Manual metric",
      chartType: "line",
      cadence: cadence as "DAILY" | "WEEKLY" | "MONTHLY",
    });

    // createChartTransformer throws on failure, so if we get here it succeeded
    return { success: true };
  }
}
