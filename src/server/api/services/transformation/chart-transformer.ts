/**
 * ChartTransformer Service
 *
 * Handles the full workflow for ChartTransformers:
 * - Generate chart transformer for a DashboardMetric
 * - Execute transformer to generate chart config
 * - Regenerate based on user preferences
 */
import type { Prisma } from "@prisma/client";
import { TRPCError } from "@trpc/server";

import type { ChartConfig, DataPoint } from "@/lib/metrics/transformer-types";
import { db } from "@/server/db";

import { generateChartTransformerCode } from "./ai-generator";
import { executeChartTransformer, testChartTransformer } from "./executor";

/**
 * Convert ChartConfig to JSON-compatible format for Prisma
 */
function chartConfigToJson(
  config: ChartConfig | undefined,
): Prisma.InputJsonValue | undefined {
  if (!config) return undefined;
  return config as unknown as Prisma.InputJsonValue;
}

// =============================================================================
// Types
// =============================================================================

interface CreateChartTransformerInput {
  dashboardMetricId: string;
  metricName: string;
  metricDescription: string;
  chartType: string;
  dateRange: string;
  aggregation: string;
  userPrompt?: string;
}

interface ChartTransformResult {
  success: boolean;
  chartConfig?: ChartConfig;
  error?: string;
}

// =============================================================================
// Service Functions
// =============================================================================

/**
 * Create a ChartTransformer for a DashboardMetric
 *
 * Generates AI code based on actual data points and user preferences.
 */
export async function createChartTransformer(
  input: CreateChartTransformerInput,
): Promise<{ transformerId: string }> {
  // Get the dashboard metric and its data points
  const dashboardMetric = await db.dashboardMetric.findUnique({
    where: { id: input.dashboardMetricId },
    include: {
      metric: {
        include: {
          dataPoints: {
            orderBy: { timestamp: "desc" },
            take: 100, // Get recent 100 data points for AI context
          },
        },
      },
    },
  });

  if (!dashboardMetric) {
    throw new TRPCError({
      code: "NOT_FOUND",
      message: "DashboardMetric not found",
    });
  }

  // Convert to DataPoint format for AI
  const sampleDataPoints = dashboardMetric.metric.dataPoints.map((dp) => ({
    timestamp: dp.timestamp,
    value: dp.value,
    dimensions: dp.dimensions as Record<string, unknown> | null,
  }));

  // Generate transformer code
  const generated = await generateChartTransformerCode({
    metricName: input.metricName,
    metricDescription: input.metricDescription,
    sampleDataPoints,
    chartType: input.chartType,
    dateRange: input.dateRange,
    aggregation: input.aggregation,
    userPrompt: input.userPrompt,
  });

  // Test the transformer
  const testResult = testChartTransformer(generated.code, sampleDataPoints, {
    chartType: input.chartType,
    dateRange: input.dateRange,
    aggregation: input.aggregation,
  });

  if (!testResult.success) {
    throw new TRPCError({
      code: "INTERNAL_SERVER_ERROR",
      message: `Failed to generate working chart transformer: ${testResult.error}`,
    });
  }

  // Save the transformer
  const transformer = await db.chartTransformer.upsert({
    where: { dashboardMetricId: input.dashboardMetricId },
    create: {
      dashboardMetricId: input.dashboardMetricId,
      transformerCode: generated.code,
      chartType: input.chartType,
      dateRange: input.dateRange,
      aggregation: input.aggregation,
      userPrompt: input.userPrompt,
    },
    update: {
      transformerCode: generated.code,
      chartType: input.chartType,
      dateRange: input.dateRange,
      aggregation: input.aggregation,
      userPrompt: input.userPrompt,
      version: { increment: 1 },
    },
  });

  // Update dashboard metric with the chart config
  await db.dashboardMetric.update({
    where: { id: input.dashboardMetricId },
    data: {
      graphConfig: chartConfigToJson(testResult.data),
      graphType: input.chartType,
      chartTransformerId: transformer.id,
    },
  });

  return { transformerId: transformer.id };
}

/**
 * Execute ChartTransformer for a DashboardMetric
 *
 * Fetches data points and generates chart config.
 */
export async function executeChartTransformerForMetric(
  dashboardMetricId: string,
): Promise<ChartTransformResult> {
  // Get the transformer and data points
  const dashboardMetric = await db.dashboardMetric.findUnique({
    where: { id: dashboardMetricId },
    include: {
      chartTransformer: true,
      metric: {
        include: {
          dataPoints: {
            orderBy: { timestamp: "desc" },
            take: 1000, // Get up to 1000 data points
          },
        },
      },
    },
  });

  if (!dashboardMetric) {
    return {
      success: false,
      error: "DashboardMetric not found",
    };
  }

  if (!dashboardMetric.chartTransformer) {
    return {
      success: false,
      error: "No chart transformer found for this metric",
    };
  }

  const transformer = dashboardMetric.chartTransformer;

  // Convert to DataPoint format
  const dataPoints: DataPoint[] = dashboardMetric.metric.dataPoints.map(
    (dp) => ({
      timestamp: dp.timestamp,
      value: dp.value,
      dimensions: dp.dimensions as Record<string, unknown> | null,
    }),
  );

  // Execute the transformer
  const result = executeChartTransformer(
    transformer.transformerCode,
    dataPoints,
    {
      chartType: transformer.chartType,
      dateRange: transformer.dateRange ?? "30d",
      aggregation: transformer.aggregation ?? "none",
    },
  );

  if (!result.success) {
    return {
      success: false,
      error: result.error,
    };
  }

  // Update the dashboard metric with new chart config
  await db.dashboardMetric.update({
    where: { id: dashboardMetricId },
    data: {
      graphConfig: chartConfigToJson(result.data),
    },
  });

  return {
    success: true,
    chartConfig: result.data,
  };
}

/**
 * Regenerate ChartTransformer with new preferences
 */
export async function regenerateChartTransformer(input: {
  dashboardMetricId: string;
  chartType?: string;
  dateRange?: string;
  aggregation?: string;
  userPrompt?: string;
}): Promise<ChartTransformResult> {
  // Get current transformer and data
  const dashboardMetric = await db.dashboardMetric.findUnique({
    where: { id: input.dashboardMetricId },
    include: {
      chartTransformer: true,
      metric: {
        include: {
          dataPoints: {
            orderBy: { timestamp: "desc" },
            take: 100,
          },
        },
      },
    },
  });

  if (!dashboardMetric) {
    return {
      success: false,
      error: "DashboardMetric not found",
    };
  }

  // Use existing preferences as defaults
  const currentTransformer = dashboardMetric.chartTransformer;
  const chartType = input.chartType ?? currentTransformer?.chartType ?? "line";
  const dateRange = input.dateRange ?? currentTransformer?.dateRange ?? "30d";
  const aggregation =
    input.aggregation ?? currentTransformer?.aggregation ?? "none";

  // Convert data points
  const sampleDataPoints = dashboardMetric.metric.dataPoints.map((dp) => ({
    timestamp: dp.timestamp,
    value: dp.value,
    dimensions: dp.dimensions as Record<string, unknown> | null,
  }));

  // Generate new transformer code
  const generated = await generateChartTransformerCode({
    metricName: dashboardMetric.metric.name,
    metricDescription: dashboardMetric.metric.description ?? "",
    sampleDataPoints,
    chartType,
    dateRange,
    aggregation,
    userPrompt: input.userPrompt,
  });

  // Test the transformer
  const testResult = testChartTransformer(generated.code, sampleDataPoints, {
    chartType,
    dateRange,
    aggregation,
  });

  if (!testResult.success) {
    return {
      success: false,
      error: `Failed to generate chart: ${testResult.error}`,
    };
  }

  // Update or create transformer
  await db.chartTransformer.upsert({
    where: { dashboardMetricId: input.dashboardMetricId },
    create: {
      dashboardMetricId: input.dashboardMetricId,
      transformerCode: generated.code,
      chartType,
      dateRange,
      aggregation,
      userPrompt: input.userPrompt,
    },
    update: {
      transformerCode: generated.code,
      chartType,
      dateRange,
      aggregation,
      userPrompt: input.userPrompt,
      version: { increment: 1 },
    },
  });

  // Update dashboard metric with new chart config
  await db.dashboardMetric.update({
    where: { id: input.dashboardMetricId },
    data: {
      graphConfig: chartConfigToJson(testResult.data),
      graphType: chartType,
    },
  });

  return {
    success: true,
    chartConfig: testResult.data,
  };
}

/**
 * Get ChartTransformer by DashboardMetric ID
 */
export async function getChartTransformerByMetricId(dashboardMetricId: string) {
  return db.chartTransformer.findUnique({
    where: { dashboardMetricId },
  });
}

/**
 * Delete ChartTransformer
 */
export async function deleteChartTransformer(dashboardMetricId: string) {
  await db.chartTransformer.delete({
    where: { dashboardMetricId },
  });
}
