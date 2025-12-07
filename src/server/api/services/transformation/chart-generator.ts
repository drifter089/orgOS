/**
 * Chart Generator Service
 *
 * Handles the full workflow for ChartTransformers:
 * - Generate chart transformer for a DashboardChart
 * - Execute transformer to generate chart config
 * - Regenerate based on user preferences
 */
import type { Prisma } from "@prisma/client";
import { TRPCError } from "@trpc/server";

import type { ChartConfig, DataPoint } from "@/lib/metrics/transformer-types";
import { db } from "@/server/db";

import { generateChartTransformerCode } from "./ai-code-generator";
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
  dashboardChartId: string;
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
 * Create a ChartTransformer for a DashboardChart
 *
 * Generates AI code based on actual data points and user preferences.
 */
export async function createChartTransformer(
  input: CreateChartTransformerInput,
): Promise<{ transformerId: string }> {
  // Get the dashboard chart and its data points
  const dashboardChart = await db.dashboardChart.findUnique({
    where: { id: input.dashboardChartId },
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

  if (!dashboardChart) {
    throw new TRPCError({
      code: "NOT_FOUND",
      message: "DashboardChart not found",
    });
  }

  // Convert to DataPoint format for AI
  const sampleDataPoints = dashboardChart.metric.dataPoints.map((dp) => ({
    timestamp: dp.timestamp,
    value: dp.value,
    dimensions: dp.dimensions as Record<string, unknown> | null,
  }));

  if (sampleDataPoints.length === 0) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: "No data points available to generate chart",
    });
  }

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
    where: { dashboardChartId: input.dashboardChartId },
    create: {
      dashboardChartId: input.dashboardChartId,
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

  // Update dashboard chart with the chart config
  await db.dashboardChart.update({
    where: { id: input.dashboardChartId },
    data: {
      chartConfig: chartConfigToJson(testResult.data),
      chartType: input.chartType,
      chartTransformerId: transformer.id,
    },
  });

  return { transformerId: transformer.id };
}

/**
 * Execute ChartTransformer for a DashboardChart
 *
 * Fetches data points and generates chart config.
 */
export async function executeChartTransformerForDashboardChart(
  dashboardChartId: string,
): Promise<ChartTransformResult> {
  // Get the transformer and data points
  const dashboardChart = await db.dashboardChart.findUnique({
    where: { id: dashboardChartId },
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

  if (!dashboardChart) {
    return {
      success: false,
      error: "DashboardChart not found",
    };
  }

  if (!dashboardChart.chartTransformer) {
    return {
      success: false,
      error: "No chart transformer found for this chart",
    };
  }

  const transformer = dashboardChart.chartTransformer;

  // Convert to DataPoint format
  const dataPoints: DataPoint[] = dashboardChart.metric.dataPoints.map(
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

  // Update the dashboard chart with new chart config
  await db.dashboardChart.update({
    where: { id: dashboardChartId },
    data: {
      chartConfig: chartConfigToJson(result.data),
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
  dashboardChartId: string;
  chartType?: string;
  dateRange?: string;
  aggregation?: string;
  userPrompt?: string;
}): Promise<ChartTransformResult> {
  // Get current transformer and data
  const dashboardChart = await db.dashboardChart.findUnique({
    where: { id: input.dashboardChartId },
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

  if (!dashboardChart) {
    return {
      success: false,
      error: "DashboardChart not found",
    };
  }

  // Use existing preferences as defaults
  const currentTransformer = dashboardChart.chartTransformer;
  const chartType = input.chartType ?? currentTransformer?.chartType ?? "line";
  const dateRange = input.dateRange ?? currentTransformer?.dateRange ?? "30d";
  const aggregation =
    input.aggregation ?? currentTransformer?.aggregation ?? "none";

  // Convert data points
  const sampleDataPoints = dashboardChart.metric.dataPoints.map((dp) => ({
    timestamp: dp.timestamp,
    value: dp.value,
    dimensions: dp.dimensions as Record<string, unknown> | null,
  }));

  // Generate new transformer code
  const generated = await generateChartTransformerCode({
    metricName: dashboardChart.metric.name,
    metricDescription: dashboardChart.metric.description ?? "",
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
    where: { dashboardChartId: input.dashboardChartId },
    create: {
      dashboardChartId: input.dashboardChartId,
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

  // Update dashboard chart with new chart config
  await db.dashboardChart.update({
    where: { id: input.dashboardChartId },
    data: {
      chartConfig: chartConfigToJson(testResult.data),
      chartType: chartType,
    },
  });

  return {
    success: true,
    chartConfig: testResult.data,
  };
}

/**
 * Get ChartTransformer by DashboardChart ID
 */
export async function getChartTransformerByDashboardChartId(
  dashboardChartId: string,
) {
  return db.chartTransformer.findUnique({
    where: { dashboardChartId },
  });
}
