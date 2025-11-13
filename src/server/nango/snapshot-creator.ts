/**
 * Metric Snapshot Creator
 *
 * Handles time-series snapshot creation and retrieval for metrics.
 * Snapshots are created after each Nango sync to build historical data.
 */

import type { PrismaClient, MetricSnapshot } from "@prisma/client";

/**
 * Creates a time-series snapshot for a metric
 *
 * @param db - Prisma client instance
 * @param metricId - ID of the metric
 * @param value - Current value to snapshot
 * @param sourceType - Source of the snapshot ("nango_sync", "manual", "custom")
 * @param metadata - Optional metadata (sync details, record counts, etc.)
 */
export async function createMetricSnapshot(
  db: PrismaClient,
  metricId: string,
  value: number,
  sourceType: string,
  metadata?: any,
): Promise<MetricSnapshot> {
  return await db.metricSnapshot.create({
    data: {
      metricId,
      value,
      timestamp: new Date(),
      sourceType,
      metadata,
    },
  });
}

/**
 * Get snapshots for charting/analysis
 *
 * @param db - Prisma client instance
 * @param metricId - ID of the metric
 * @param from - Optional start date (default: 30 days ago)
 * @param to - Optional end date (default: now)
 * @returns Array of snapshots ordered by timestamp
 */
export async function getMetricSnapshots(
  db: PrismaClient,
  metricId: string,
  from?: Date,
  to?: Date,
): Promise<MetricSnapshot[]> {
  const defaultFrom = new Date();
  defaultFrom.setDate(defaultFrom.getDate() - 30); // Default to last 30 days

  return await db.metricSnapshot.findMany({
    where: {
      metricId,
      timestamp: {
        gte: from || defaultFrom,
        lte: to || new Date(),
      },
    },
    orderBy: { timestamp: "asc" },
  });
}

/**
 * Get latest snapshot for a metric
 *
 * @param db - Prisma client instance
 * @param metricId - ID of the metric
 * @returns Most recent snapshot or null
 */
export async function getLatestSnapshot(
  db: PrismaClient,
  metricId: string,
): Promise<MetricSnapshot | null> {
  return await db.metricSnapshot.findFirst({
    where: { metricId },
    orderBy: { timestamp: "desc" },
  });
}

/**
 * Cleanup old snapshots (optional maintenance function)
 *
 * @param db - Prisma client instance
 * @param olderThan - Delete snapshots older than this date
 * @returns Number of deleted snapshots
 */
export async function cleanupOldSnapshots(
  db: PrismaClient,
  olderThan: Date,
): Promise<number> {
  const result = await db.metricSnapshot.deleteMany({
    where: {
      timestamp: {
        lt: olderThan,
      },
    },
  });

  return result.count;
}
