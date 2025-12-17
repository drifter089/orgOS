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
  templateId?: string; // Used to route to Google Sheets specific generator
}

interface ChartTransformResult {
  success: boolean;
  chartConfig?: ChartConfig;
  error?: string;
}

/** Calculate data statistics for AI context */
function calculateDataStats(
  dataPoints: Array<{
    timestamp: Date;
    value: number;
    dimensions: Record<string, unknown> | null;
  }>,
) {
  if (dataPoints.length === 0) {
    return {
      totalCount: 0,
      dateRange: { from: "unknown", to: "unknown" },
      daysCovered: 0,
      detectedGranularity: "daily" as const,
      dimensionKeys: [] as string[],
    };
  }

  const timestamps = dataPoints.map((dp) => dp.timestamp.getTime());
  const oldestDate = new Date(Math.min(...timestamps));
  const newestDate = new Date(Math.max(...timestamps));
  const daysCovered = Math.ceil(
    (newestDate.getTime() - oldestDate.getTime()) / (1000 * 60 * 60 * 24),
  );

  // Detect granularity based on average gap between data points
  let detectedGranularity: "daily" | "weekly" | "monthly" = "daily";
  if (dataPoints.length > 1) {
    const avgGap =
      (newestDate.getTime() - oldestDate.getTime()) / (dataPoints.length - 1);
    const avgGapDays = avgGap / (1000 * 60 * 60 * 24);
    if (avgGapDays >= 25) detectedGranularity = "monthly";
    else if (avgGapDays >= 5) detectedGranularity = "weekly";
  }

  // Extract dimension keys from all data points
  const dimensionKeys = new Set<string>();
  dataPoints.forEach((dp) => {
    if (dp.dimensions && typeof dp.dimensions === "object") {
      Object.keys(dp.dimensions).forEach((k) => dimensionKeys.add(k));
    }
  });

  return {
    totalCount: dataPoints.length,
    dateRange: {
      from: oldestDate.toISOString().split("T")[0]!,
      to: newestDate.toISOString().split("T")[0]!,
    },
    daysCovered,
    detectedGranularity,
    dimensionKeys: Array.from(dimensionKeys),
  };
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
            take: 1000, // Get up to 1000 data points for better AI context
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

  const allDataPoints = dashboardChart.metric.dataPoints.map((dp) => ({
    timestamp: dp.timestamp,
    value: dp.value,
    dimensions: dp.dimensions as Record<string, unknown> | null,
  }));

  if (allDataPoints.length === 0) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: "No data points available to generate chart",
    });
  }

  // Calculate data statistics for AI context
  const dataStats = calculateDataStats(allDataPoints);

  // Get templateId from metric for routing to Google Sheets specific generator
  const templateId = input.templateId ?? dashboardChart.metric.templateId;

  const generated = await generateChartTransformerCode({
    metricName: input.metricName,
    metricDescription: input.metricDescription,
    sampleDataPoints: allDataPoints,
    chartType: input.chartType,
    dateRange: input.dateRange,
    aggregation: input.aggregation,
    userPrompt: input.userPrompt,
    dataStats,
    templateId: templateId ?? undefined,
  });

  const testResult = await testChartTransformer(generated.code, allDataPoints, {
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
            take: 1000, // Get up to 1000 data points for better AI context
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

  const allDataPoints = dashboardChart.metric.dataPoints.map((dp) => ({
    timestamp: dp.timestamp,
    value: dp.value,
    dimensions: dp.dimensions as Record<string, unknown> | null,
  }));

  // Calculate data statistics for AI context
  const dataStats = calculateDataStats(allDataPoints);

  const generated = await generateChartTransformerCode({
    metricName: dashboardChart.metric.name,
    metricDescription: dashboardChart.metric.description ?? "",
    sampleDataPoints: allDataPoints,
    chartType,
    dateRange,
    aggregation,
    userPrompt: input.userPrompt,
    dataStats,
    templateId: dashboardChart.metric.templateId ?? undefined,
  });

  const testResult = await testChartTransformer(generated.code, allDataPoints, {
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
