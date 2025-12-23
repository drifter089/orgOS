import type { PrismaClient } from "@prisma/client";

export interface DeleteResult {
  deletedDataPoints: number;
  deletedIngestionTransformer: boolean;
  deletedChartTransformer: boolean;
}

/**
 * Delete all old data for a metric (used in hard refresh)
 *
 * This deletes:
 * 1. All MetricDataPoints for this metric
 * 2. The DataIngestionTransformer for this metric (keyed by metricId)
 * 3. The ChartTransformer for this metric's dashboard chart
 *
 * Does NOT delete:
 * - The Metric record itself
 * - The DashboardChart record itself
 * - The Integration connection
 */
export async function deleteOldMetricData(
  db: PrismaClient,
  metricId: string,
): Promise<DeleteResult> {
  // 1. Delete all MetricDataPoints for this metric
  const deletedDataPoints = await db.metricDataPoint.deleteMany({
    where: { metricId },
  });

  // 2. Delete DataIngestionTransformer for this metric
  // Always keyed by metricId (independent metrics)
  const deletedIngestion = await db.dataIngestionTransformer
    .delete({
      where: { templateId: metricId },
    })
    .catch(() => null); // Ignore if doesn't exist

  // 3. Delete ChartTransformer for this metric's dashboard chart
  const dashboardChart = await db.dashboardChart.findFirst({
    where: { metricId },
    select: { id: true },
  });

  let deletedChartTransformer = false;
  if (dashboardChart) {
    await db.chartTransformer
      .delete({
        where: { dashboardChartId: dashboardChart.id },
      })
      .catch(() => null); // Ignore if doesn't exist
    deletedChartTransformer = true;
  }

  return {
    deletedDataPoints: deletedDataPoints.count,
    deletedIngestionTransformer: deletedIngestion !== null,
    deletedChartTransformer,
  };
}

/**
 * Delete ONLY the ingestion transformer (for regeneration without losing data)
 */
export async function deleteIngestionTransformer(
  db: PrismaClient,
  metricId: string,
): Promise<boolean> {
  const deleted = await db.dataIngestionTransformer
    .delete({
      where: { templateId: metricId },
    })
    .catch(() => null);

  return deleted !== null;
}

/**
 * Delete ONLY the chart transformer (for regeneration without losing data)
 */
export async function deleteChartTransformer(
  db: PrismaClient,
  metricId: string,
): Promise<boolean> {
  const dashboardChart = await db.dashboardChart.findFirst({
    where: { metricId },
    select: { id: true },
  });

  if (!dashboardChart) return false;

  const deleted = await db.chartTransformer
    .delete({
      where: { dashboardChartId: dashboardChart.id },
    })
    .catch(() => null);

  return deleted !== null;
}

/**
 * Delete ONLY the data points (for soft refresh with new data)
 */
export async function deleteDataPoints(
  db: PrismaClient,
  metricId: string,
): Promise<number> {
  const result = await db.metricDataPoint.deleteMany({
    where: { metricId },
  });
  return result.count;
}
