import type { Cadence, MetricGoal, Prisma, PrismaClient } from "@prisma/client";

import {
  type ChartDataForGoal,
  type GoalInput,
  type GoalProgress,
  calculateGoalProgress,
} from "@/lib/goals";
import type { ChartTransformResult } from "@/lib/metrics/transformer-types";

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
 * All metrics now use metricId as the cache key (independent metrics)
 */
function getTransformerCacheKey(metricId: string): string {
  return metricId;
}

/**
 * Enriches dashboard charts with goal progress and value labels
 *
 * This function:
 * 1. Gets valueLabel from chartConfig (ChartTransformer output) as primary source
 * 2. Falls back to DataIngestionTransformer valueLabel for backward compatibility
 * 3. Calculates goal progress for charts that have goals
 *
 * @param charts - Dashboard charts with metric and chartTransformer relations
 * @param db - Prisma client for database queries
 * @returns Charts enriched with goalProgress, valueLabel, and dataDescription
 */
export async function enrichChartsWithGoalProgress<
  T extends DashboardChartWithRelations,
>(charts: T[], db: PrismaClient): Promise<EnrichedDashboardChart<T>[]> {
  // Get unique metricIds to fetch fallback valueLabels from DataIngestionTransformer
  const metricIds = [
    ...new Set(charts.map((chart) => getTransformerCacheKey(chart.metric.id))),
  ];

  // Fetch valueLabels and dataDescription from DataIngestionTransformer (fallback)
  const transformers = await db.dataIngestionTransformer.findMany({
    where: { templateId: { in: metricIds } },
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
    const cacheKey = getTransformerCacheKey(chart.metric.id);

    // Parse chartConfig to get unified metadata
    const chartConfig = chart.chartConfig as unknown as ChartTransformResult;

    // Prefer valueLabel from chartConfig (ChartTransformer), fallback to DataIngestionTransformer
    const valueLabel =
      chartConfig?.valueLabelOverride ??
      chartConfig?.valueLabel ??
      valueLabelMap.get(cacheKey) ??
      null;

    // Prefer description from chartConfig, fallback to DataIngestionTransformer
    const dataDescription =
      chartConfig?.description ?? dataDescriptionMap.get(cacheKey) ?? null;

    // No goal or no cadence - return without progress calculation
    if (!chart.metric.goal || !chart.chartTransformer?.cadence) {
      return {
        ...chart,
        goalProgress: null,
        valueLabel,
        dataDescription,
      };
    }

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
      chartData: chartConfig?.chartData ?? [],
      xAxisKey: chartConfig?.xAxisKey ?? "date",
      dataKeys: chartConfig?.dataKeys ?? [],
    };

    // Calculate goal progress
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
