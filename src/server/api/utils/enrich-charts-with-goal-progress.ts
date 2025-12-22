import type { Cadence, MetricGoal, Prisma, PrismaClient } from "@prisma/client";

import {
  type ChartDataForGoal,
  type GoalInput,
  type GoalProgress,
  calculateGoalProgress,
} from "@/lib/goals";
import type { ChartConfig } from "@/lib/metrics/transformer-types";

/**
 * Dashboard chart with metric and chartTransformer included
 */
type DashboardChartWithRelations = {
  id: string;
  chartConfig: Prisma.JsonValue;
  updatedAt?: Date;
  metric: {
    id: string;
    templateId: string | null;
    goal: MetricGoal | null;
  };
  chartTransformer: {
    cadence: Cadence;
  } | null;
  [key: string]: unknown;
};

/**
 * Enriched dashboard chart with goal progress and transformer labels
 */
export type EnrichedDashboardChart<T extends DashboardChartWithRelations> =
  T & {
    goalProgress: GoalProgress | null;
    valueLabel: string | null;
    dataDescription: string | null;
  };

/**
 * Gets the cache key for looking up DataIngestionTransformer
 * GSheets uses a composite key: `{templateId}:{metricId}`
 * Other templates use just the templateId
 */
function getTransformerCacheKey(
  templateId: string | null,
  metricId: string,
): string | null {
  if (!templateId) return null;
  if (templateId.startsWith("gsheets-")) {
    return `${templateId}:${metricId}`;
  }
  return templateId;
}

/**
 * Enriches dashboard charts with goal progress and value labels from DataIngestionTransformer
 *
 * This function:
 * 1. Collects unique templateIds from all charts
 * 2. Batch fetches valueLabels and dataDescriptions from DataIngestionTransformer
 * 3. Calculates goal progress for charts that have goals
 *
 * @param charts - Dashboard charts with metric and chartTransformer relations
 * @param db - Prisma client for database queries
 * @returns Charts enriched with goalProgress, valueLabel, and dataDescription
 */
export async function enrichChartsWithGoalProgress<
  T extends DashboardChartWithRelations,
>(charts: T[], db: PrismaClient): Promise<EnrichedDashboardChart<T>[]> {
  // Get unique templateIds to fetch valueLabels
  const templateIds = [
    ...new Set(
      charts
        .map((chart) =>
          getTransformerCacheKey(chart.metric.templateId, chart.metric.id),
        )
        .filter((id): id is string => id !== null),
    ),
  ];

  // Fetch valueLabels and dataDescription from DataIngestionTransformer
  const transformers = await db.dataIngestionTransformer.findMany({
    where: { templateId: { in: templateIds } },
    select: { templateId: true, valueLabel: true, dataDescription: true },
  });

  // Create maps for quick lookup
  const valueLabelMap = new Map(
    transformers.map((t) => [t.templateId, t.valueLabel]),
  );
  const dataDescriptionMap = new Map(
    transformers.map((t) => [t.templateId, t.dataDescription]),
  );

  // Calculate goal progress and add valueLabel for each chart
  return charts.map((chart) => {
    const cacheKey = getTransformerCacheKey(
      chart.metric.templateId,
      chart.metric.id,
    );
    const valueLabel = cacheKey ? (valueLabelMap.get(cacheKey) ?? null) : null;
    const dataDescription = cacheKey
      ? (dataDescriptionMap.get(cacheKey) ?? null)
      : null;

    // No goal or no cadence - return without progress calculation
    if (!chart.metric.goal || !chart.chartTransformer?.cadence) {
      return {
        ...chart,
        goalProgress: null,
        valueLabel,
        dataDescription,
      };
    }

    // Parse chartConfig and convert to simplified types
    const chartConfig = chart.chartConfig as unknown as ChartConfig;

    // Convert MetricGoal to GoalInput
    const goalInput: GoalInput = {
      goalType: chart.metric.goal.goalType,
      targetValue: chart.metric.goal.targetValue,
      baselineValue: chart.metric.goal.baselineValue,
      baselineTimestamp: chart.metric.goal.baselineTimestamp,
      onTrackThreshold: chart.metric.goal.onTrackThreshold,
    };

    // Convert ChartConfig to ChartDataForGoal
    const chartData: ChartDataForGoal = {
      chartData: chartConfig.chartData ?? [],
      xAxisKey: chartConfig.xAxisKey ?? "date",
      dataKeys: chartConfig.dataKeys ?? [],
    };

    const progress = calculateGoalProgress(
      goalInput,
      chart.chartTransformer.cadence,
      chartData,
    );

    return {
      ...chart,
      goalProgress: progress,
      valueLabel,
      dataDescription,
    };
  });
}
