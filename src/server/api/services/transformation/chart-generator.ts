/** Chart transformer creation, execution, and regeneration. */
import type { Cadence, Prisma } from "@prisma/client";
import { TRPCError } from "@trpc/server";

import type { ChartConfig, DataPoint } from "@/lib/metrics/transformer-types";
import { invalidateCacheByTags } from "@/server/api/utils/cache-strategy";
import { db } from "@/server/db";

import { generateChartTransformerCode } from "./ai-code-generator";
import { executeChartTransformer, testChartTransformer } from "./executor";

/**
 * Recapture baseline from chart config when cadence or dimension changes.
 * This ensures the goal baseline aligns with the new period boundaries
 * or the new data semantics when tracking a different dimension.
 * Applies to both ABSOLUTE and RELATIVE goals for consistency.
 */
async function recaptureGoalBaseline(
  metricId: string,
  newChartConfig: ChartConfig,
  newCadence: Cadence,
  oldCadence: Cadence | null,
  forceRecapture = false,
): Promise<void> {
  // Only recapture if cadence changed or force recapture is requested
  if (!forceRecapture && oldCadence === newCadence) return;

  // Check if metric has a goal
  const goal = await db.metricGoal.findUnique({
    where: { metricId },
    select: { id: true, goalType: true },
  });

  if (!goal) return;

  // Extract new baseline from the first data point in the chart
  const chartData = newChartConfig.chartData;
  const dataKeys = newChartConfig.dataKeys;

  if (!chartData?.length || !dataKeys?.length) return;

  const firstDataPoint = chartData[0];
  const primaryKey = dataKeys[0];

  if (!firstDataPoint || !primaryKey) return;

  const newBaselineValue = Number(firstDataPoint[primaryKey]);
  if (isNaN(newBaselineValue)) return;

  // Update the goal with the new baseline
  await db.metricGoal.update({
    where: { id: goal.id },
    data: {
      baselineValue: newBaselineValue,
      baselineTimestamp: new Date(),
    },
  });

  const reason = forceRecapture
    ? "dimension changed"
    : `cadence changed from ${oldCadence} to ${newCadence}`;
  console.info(
    `[ChartGenerator] Recaptured baseline for goal ${goal.id}: ${newBaselineValue} (${reason})`,
  );
}

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
  cadence: string; // "DAILY" | "WEEKLY" | "MONTHLY"
  userPrompt?: string;
  templateId?: string; // Used to route to Google Sheets specific generator
  selectedDimension?: string; // User can select a dimension to track (e.g., "estimate" for effort points)
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
    select: {
      id: true,
      organizationId: true,
      metric: {
        select: {
          id: true,
          name: true,
          description: true,
          templateId: true,
          teamId: true,
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
    cadence: input.cadence,
    userPrompt: input.userPrompt,
    dataStats,
    templateId: templateId ?? undefined,
    selectedDimension: input.selectedDimension,
  });

  // Use suggested cadence if AI detected one from user prompt
  const effectiveCadence = generated.suggestedCadence ?? input.cadence;

  const testResult = await testChartTransformer(generated.code, allDataPoints, {
    chartType: input.chartType,
    cadence: effectiveCadence,
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
      cadence: effectiveCadence as "DAILY" | "WEEKLY" | "MONTHLY",
      userPrompt: input.userPrompt,
    },
    update: {
      transformerCode: generated.code,
      chartType: input.chartType,
      cadence: effectiveCadence as "DAILY" | "WEEKLY" | "MONTHLY",
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

  // Recapture goal baseline if dimension was selected (data semantics changed)
  if (
    testResult.data &&
    input.selectedDimension &&
    input.selectedDimension !== "value"
  ) {
    await recaptureGoalBaseline(
      dashboardChart.metric.id,
      testResult.data,
      effectiveCadence as Cadence,
      null, // No old cadence for comparison
      true, // Force recapture due to dimension change
    );
  }

  // Invalidate dashboard cache so queries return fresh transformer fields
  const cacheTags = [`dashboard_org_${dashboardChart.organizationId}`];
  if (dashboardChart.metric.teamId) {
    cacheTags.push(`dashboard_team_${dashboardChart.metric.teamId}`);
  }
  await invalidateCacheByTags(db, cacheTags);

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
      cadence: transformer.cadence,
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
  cadence?: string;
  userPrompt?: string;
  selectedDimension?: string;
}): Promise<ChartTransformResult> {
  const dashboardChart = await db.dashboardChart.findUnique({
    where: { id: input.dashboardChartId },
    select: {
      id: true,
      organizationId: true,
      chartTransformer: true,
      metric: {
        select: {
          id: true,
          name: true,
          description: true,
          templateId: true,
          teamId: true,
          goal: {
            select: { id: true, goalType: true },
          },
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

  const metricId = dashboardChart.metric.id;

  await db.metric.update({
    where: { id: metricId },
    data: { refreshStatus: "ai-regenerating" },
  });

  try {
    const currentTransformer = dashboardChart.chartTransformer;
    const chartType =
      input.chartType ?? currentTransformer?.chartType ?? "line";
    const oldCadence = currentTransformer?.cadence ?? null;
    const cadence = input.cadence ?? oldCadence ?? "DAILY";

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
      cadence,
      userPrompt: input.userPrompt,
      dataStats,
      templateId: dashboardChart.metric.templateId ?? undefined,
      selectedDimension: input.selectedDimension,
    });

    const effectiveCadence = generated.suggestedCadence ?? cadence;

    await db.metric.update({
      where: { id: metricId },
      data: { refreshStatus: "updating-chart" },
    });

    const testResult = await testChartTransformer(
      generated.code,
      allDataPoints,
      {
        chartType,
        cadence: effectiveCadence,
      },
    );
    if (!testResult.success) {
      await db.metric.update({
        where: { id: metricId },
        data: { refreshStatus: null },
      });
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
        cadence: effectiveCadence as "DAILY" | "WEEKLY" | "MONTHLY",
        userPrompt: input.userPrompt,
      },
      update: {
        transformerCode: generated.code,
        chartType,
        cadence: effectiveCadence as "DAILY" | "WEEKLY" | "MONTHLY",
        userPrompt: input.userPrompt,
        version: { increment: 1 },
      },
    });

    await db.dashboardChart.update({
      where: { id: input.dashboardChartId },
      data: { chartConfig: chartConfigToJson(testResult.data), chartType },
    });

    // Recapture goal baseline if cadence or dimension changed
    if (testResult.data) {
      const forceRecapture =
        !!input.selectedDimension && input.selectedDimension !== "value";
      await recaptureGoalBaseline(
        metricId,
        testResult.data,
        effectiveCadence as Cadence,
        oldCadence,
        forceRecapture,
      );
    }

    const cacheTags = [`dashboard_org_${dashboardChart.organizationId}`];
    if (dashboardChart.metric.teamId) {
      cacheTags.push(`dashboard_team_${dashboardChart.metric.teamId}`);
    }
    await invalidateCacheByTags(db, cacheTags);

    await db.metric.update({
      where: { id: metricId },
      data: { refreshStatus: null },
    });

    return { success: true, chartConfig: testResult.data };
  } catch (error) {
    await db.metric.update({
      where: { id: metricId },
      data: { refreshStatus: null },
    });
    throw error;
  }
}

export async function getChartTransformerByDashboardChartId(
  dashboardChartId: string,
) {
  return db.chartTransformer.findUnique({
    where: { dashboardChartId },
  });
}

/**
 * Execute chart transformer with pre-fetched data.
 * Avoids re-fetching data that was already loaded by the caller.
 * Used by cron jobs where we already have the metric data.
 */
export async function executeChartTransformerWithData(input: {
  dashboardChartId: string;
  transformerCode: string;
  chartType: string;
  cadence: string;
  dataPoints: DataPoint[];
}): Promise<ChartTransformResult> {
  if (input.dataPoints.length === 0) {
    return { success: false, error: "No data points provided" };
  }

  const result = await executeChartTransformer(
    input.transformerCode,
    input.dataPoints,
    {
      chartType: input.chartType,
      cadence: input.cadence,
    },
  );

  if (!result.success) {
    return { success: false, error: result.error };
  }

  await db.dashboardChart.update({
    where: { id: input.dashboardChartId },
    data: { chartConfig: chartConfigToJson(result.data) },
  });

  return { success: true, chartConfig: result.data };
}
