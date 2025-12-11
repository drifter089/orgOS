/** Chart transformer creation, execution, and regeneration. */
import type { Prisma } from "@prisma/client";
import { TRPCError } from "@trpc/server";

import type { ChartConfig, DataPoint } from "@/lib/metrics/transformer-types";
import { db } from "@/server/db";

import { generateChartTransformerCode } from "./ai-code-generator";
import { executeChartTransformer, testChartTransformer } from "./executor";

function chartConfigToJson(
  config: ChartConfig | undefined,
): Prisma.InputJsonValue | undefined {
  if (!config) return undefined;
  return config as unknown as Prisma.InputJsonValue;
}

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

/** Create a ChartTransformer using AI based on actual data points. */
export async function createChartTransformer(
  input: CreateChartTransformerInput,
): Promise<{ transformerId: string }> {
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

  const generated = await generateChartTransformerCode({
    metricName: input.metricName,
    metricDescription: input.metricDescription,
    sampleDataPoints,
    chartType: input.chartType,
    dateRange: input.dateRange,
    aggregation: input.aggregation,
    userPrompt: input.userPrompt,
  });

  const testResult = await testChartTransformer(
    generated.code,
    sampleDataPoints,
    {
      chartType: input.chartType,
      dateRange: input.dateRange,
      aggregation: input.aggregation,
    },
  );
  if (!testResult.success) {
    throw new TRPCError({
      code: "INTERNAL_SERVER_ERROR",
      message: `Failed to generate working chart transformer: ${testResult.error}`,
    });
  }

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

/** Execute an existing ChartTransformer and update the chart config. */
export async function executeChartTransformerForDashboardChart(
  dashboardChartId: string,
): Promise<ChartTransformResult> {
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
    return { success: false, error: "DashboardChart not found" };
  }
  if (!dashboardChart.chartTransformer) {
    return {
      success: false,
      error: "No chart transformer found for this chart",
    };
  }

  const transformer = dashboardChart.chartTransformer;
  const dataPoints: DataPoint[] = dashboardChart.metric.dataPoints.map(
    (dp) => ({
      timestamp: dp.timestamp,
      value: dp.value,
      dimensions: dp.dimensions as Record<string, unknown> | null,
    }),
  );

  const result = await executeChartTransformer(
    transformer.transformerCode,
    dataPoints,
    {
      chartType: transformer.chartType,
      dateRange: transformer.dateRange ?? "all",
      aggregation: transformer.aggregation ?? "none",
    },
  );

  if (!result.success) {
    return { success: false, error: result.error };
  }

  await db.dashboardChart.update({
    where: { id: dashboardChartId },
    data: { chartConfig: chartConfigToJson(result.data) },
  });

  return { success: true, chartConfig: result.data };
}

/** Regenerate ChartTransformer with new preferences. */
export async function regenerateChartTransformer(input: {
  dashboardChartId: string;
  chartType?: string;
  dateRange?: string;
  aggregation?: string;
  userPrompt?: string;
}): Promise<ChartTransformResult> {
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
    return { success: false, error: "DashboardChart not found" };
  }

  const currentTransformer = dashboardChart.chartTransformer;
  const chartType = input.chartType ?? currentTransformer?.chartType ?? "line";
  const dateRange = input.dateRange ?? currentTransformer?.dateRange ?? "all";
  const aggregation =
    input.aggregation ?? currentTransformer?.aggregation ?? "none";

  const sampleDataPoints = dashboardChart.metric.dataPoints.map((dp) => ({
    timestamp: dp.timestamp,
    value: dp.value,
    dimensions: dp.dimensions as Record<string, unknown> | null,
  }));

  const generated = await generateChartTransformerCode({
    metricName: dashboardChart.metric.name,
    metricDescription: dashboardChart.metric.description ?? "",
    sampleDataPoints,
    chartType,
    dateRange,
    aggregation,
    userPrompt: input.userPrompt,
  });

  const testResult = await testChartTransformer(
    generated.code,
    sampleDataPoints,
    {
      chartType,
      dateRange,
      aggregation,
    },
  );
  if (!testResult.success) {
    return {
      success: false,
      error: `Failed to generate chart: ${testResult.error}`,
    };
  }

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

  await db.dashboardChart.update({
    where: { id: input.dashboardChartId },
    data: { chartConfig: chartConfigToJson(testResult.data), chartType },
  });

  return { success: true, chartConfig: testResult.data };
}

export async function getChartTransformerByDashboardChartId(
  dashboardChartId: string,
) {
  return db.chartTransformer.findUnique({
    where: { dashboardChartId },
  });
}
