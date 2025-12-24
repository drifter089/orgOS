/**
 * Data Pipeline Service
 *
 * Handles the complete metric data pipeline:
 * - Soft refresh: Fetch new data, use existing transformers
 * - Hard refresh: Delete everything, regenerate transformers from scratch
 *
 * Key design:
 * - Single API fetch (eliminates double fetch)
 * - Transaction-locked transformer creation (prevents race condition)
 * - Batch data point saves (faster than sequential upserts)
 */
import { Prisma } from "@prisma/client";
import { TRPCError } from "@trpc/server";

import { getTemplate } from "@/lib/integrations";
import type { DataPoint } from "@/lib/metrics/transformer-types";
import { type PipelineType, createPipelineRunner } from "@/lib/pipeline";
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

// ============================================================================
// Types
// ============================================================================

interface TransformResult {
  success: boolean;
  dataPoints?: DataPoint[];
  transformerCreated?: boolean;
  error?: string;
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

// ============================================================================
// Helpers
// ============================================================================

function dimensionsToJson(
  dimensions: Record<string, unknown> | null,
): Prisma.NullableJsonNullValueInput | Prisma.InputJsonValue {
  if (dimensions === null) return Prisma.DbNull;
  return dimensions as Prisma.InputJsonValue;
}

/** Fetches API data and logs the result */
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
 * Save data points to database.
 * Delete-then-insert pattern handles the unique constraint on (metricId, timestamp).
 */
async function saveDataPointsBatch(
  metricId: string,
  dataPoints: DataPoint[],
  isTimeSeries: boolean,
): Promise<void> {
  if (dataPoints.length === 0) return;

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
    // Time-series mode: upsert by timestamp
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

// ============================================================================
// Transformer Management
// ============================================================================

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

  // Upsert handles race condition
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

// ============================================================================
// Pipeline Operations (Core Logic)
// ============================================================================

/**
 * Fetch data from API, transform, and save to database.
 * When generateTransformer=true, creates new transformer if none exists.
 * When generateTransformer=false, uses existing transformer (soft refresh).
 */
async function fetchTransformAndSave(input: {
  metricId: string;
  templateId: string;
  integrationId: string;
  connectionId: string;
  endpointConfig: Record<string, string>;
  isTimeSeries: boolean;
  generateTransformer: boolean;
}): Promise<TransformResult> {
  const template = getTemplate(input.templateId);
  if (!template) {
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
    return {
      success: false,
      error: `Failed to fetch data: ${fetchResult.error}`,
    };
  }

  let transformerCode: string;
  let transformerCreated = false;

  if (input.generateTransformer) {
    const { transformer, isNew } = await getOrCreateDataIngestionTransformer(
      input.metricId,
      input.integrationId,
      template,
      fetchResult.data,
      input.endpointConfig,
    );
    if (!transformer) {
      return { success: false, error: "Failed to get or create transformer" };
    }
    transformerCode = transformer.transformerCode;
    transformerCreated = isNew;
  } else {
    const transformer = await db.dataIngestionTransformer.findUnique({
      where: { templateId: input.metricId },
    });
    if (!transformer) {
      return { success: false, error: "No transformer found for this metric" };
    }
    transformerCode = transformer.transformerCode;
  }

  const result = await executeDataIngestionTransformer(
    transformerCode,
    fetchResult.data,
    input.endpointConfig,
  );

  if (!result.success || !result.data) {
    return { success: false, error: result.error };
  }

  await saveDataPointsBatch(input.metricId, result.data, input.isTimeSeries);

  return { success: true, dataPoints: result.data, transformerCreated };
}

// ============================================================================
// Main Pipeline Entry Point
// ============================================================================

/**
 * Refresh metric data and update all associated charts.
 *
 * Pipeline types:
 * - soft-refresh: Reuse existing transformers, just fetch new data
 * - hard-refresh: Delete everything, regenerate from scratch (also used for create)
 */
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

  const pipelineType: PipelineType = input.forceRegenerate
    ? "hard-refresh"
    : "soft-refresh";

  const runner = createPipelineRunner(
    db,
    input.metricId,
    metric.organizationId,
    pipelineType,
  );

  const template = getTemplate(metric.templateId);
  const isTimeSeries = template?.isTimeSeries !== false;
  const endpointConfig =
    (metric.endpointConfig as Record<string, string>) ?? {};

  try {
    let transformResult: TransformResult;

    if (input.forceRegenerate) {
      // HARD REFRESH: Delete old data and transformers, regenerate

      // Delete old data points
      await runner.run("delete-data", async () => {
        await db.metricDataPoint.deleteMany({ where: { metricId: metric.id } });
      });

      // Delete old ingestion transformer (use deleteMany to avoid error when none exists)
      await runner.run("delete-ingestion-transformer", async () => {
        await db.dataIngestionTransformer.deleteMany({
          where: { templateId: metric.id },
        });
      });

      // Fetch data and generate new transformer
      await runner.setStatus("fetching-api-data");
      transformResult = await runner.run("generate-ingestion-transformer", () =>
        fetchTransformAndSave({
          metricId: metric.id,
          templateId: metric.templateId!,
          integrationId: metric.integration!.providerId,
          connectionId: metric.integration!.connectionId,
          endpointConfig,
          isTimeSeries,
          generateTransformer: true,
        }),
      );
    } else {
      // SOFT REFRESH: Reuse existing transformers
      transformResult = await runner.run("fetch-data", () =>
        fetchTransformAndSave({
          metricId: metric.id,
          templateId: metric.templateId!,
          integrationId: metric.integration!.providerId,
          connectionId: metric.integration!.connectionId,
          endpointConfig,
          isTimeSeries,
          generateTransformer: false,
        }),
      );
    }

    if (!transformResult.success) {
      await runner.fail(transformResult.error ?? "Transform failed");
      return { success: false, error: transformResult.error };
    }

    // Handle chart transformers based on refresh type
    if (input.forceRegenerate) {
      // HARD REFRESH: Delete all chart transformers and regenerate from scratch
      // This ensures charts reflect the new data structure
      await runner.run("generate-chart-transformer", async () => {
        const { createChartTransformer } = await import("./chart-generator");

        // Delete all existing chart transformers for this metric's charts
        const chartIds = metric.dashboardCharts.map((dc) => dc.id);
        if (chartIds.length > 0) {
          await db.chartTransformer.deleteMany({
            where: { dashboardChartId: { in: chartIds } },
          });
        }

        // Regenerate chart transformers for ALL charts
        for (const dc of metric.dashboardCharts) {
          try {
            const cadence =
              (endpointConfig.cadence?.toUpperCase() as
                | "DAILY"
                | "WEEKLY"
                | "MONTHLY") ?? "DAILY";
            await createChartTransformer({
              dashboardChartId: dc.id,
              metricName: metric.name,
              metricDescription: metric.description ?? "",
              chartType: dc.chartType ?? "line",
              cadence,
            });
          } catch (chartError) {
            console.error(
              `[Pipeline] Chart transformer generation error for ${dc.id}:`,
              chartError,
            );
          }
        }
      });
    } else {
      // SOFT REFRESH: Execute existing chart transformers with fresh data
      const chartsWithTransformers = metric.dashboardCharts.filter(
        (dc) => dc.chartTransformer,
      );

      if (chartsWithTransformers.length > 0) {
        await runner.run("execute-chart-transformer", async () => {
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

          const { executeChartTransformerWithData } = await import(
            "./chart-generator"
          );

          for (const dc of chartsWithTransformers) {
            const transformer = dc.chartTransformer!;
            try {
              await executeChartTransformerWithData({
                dashboardChartId: dc.id,
                transformerCode: transformer.transformerCode,
                chartType: transformer.chartType,
                cadence: transformer.cadence,
                dataPoints: dataPointsForChart,
              });
            } catch (chartError) {
              console.error(
                `[Pipeline] Chart transformer error for ${dc.id}:`,
                chartError,
              );
            }
          }
        });
      }
    }

    await runner.complete();

    return {
      success: true,
      dataPointCount: transformResult.dataPoints?.length ?? 0,
    };
  } catch (error) {
    await runner.fail(error instanceof Error ? error.message : "Unknown error");
    throw error;
  }
}

// ============================================================================
// Exports for other modules
// ============================================================================

export { getOrCreateDataIngestionTransformer };

export async function getDataIngestionTransformerByTemplateId(
  templateId: string,
) {
  return db.dataIngestionTransformer.findUnique({
    where: { templateId },
  });
}

/**
 * Update chart for manual metric (no API fetch, uses existing data)
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

    return { success: true };
  }
}

/**
 * Create new metric data: fetch from API, generate transformer, save data points.
 * Used for initial metric creation before chart transformer exists.
 */
export async function ingestMetricData(input: {
  templateId: string;
  integrationId: string;
  connectionId: string;
  metricId: string;
  endpointConfig: Record<string, string>;
  isTimeSeries?: boolean;
}): Promise<TransformResult> {
  return fetchTransformAndSave({
    metricId: input.metricId,
    templateId: input.templateId,
    integrationId: input.integrationId,
    connectionId: input.connectionId,
    endpointConfig: input.endpointConfig,
    isTimeSeries: input.isTimeSeries !== false,
    generateTransformer: true,
  });
}
