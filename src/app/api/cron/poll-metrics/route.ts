/**
 * Poll Metrics Cron Job
 *
 * This API route handles polling metrics on a schedule.
 * Called by Vercel Cron every 15 minutes.
 *
 * Functionality:
 * - Fetches metrics due for polling based on their pollFrequency
 * - Executes MetricTransformer to fetch and transform API data
 * - Stores new MetricDataPoints in the database
 * - Updates DashboardMetric chart configs via ChartTransformer
 */
import { NextResponse } from "next/server";

import { env } from "@/env";
import { refreshMetricWithCharts } from "@/server/api/services/transformation";
import { db } from "@/server/db";

// Batch size per cron run
const BATCH_SIZE = 50;

// Poll frequency intervals in milliseconds
const POLL_INTERVALS: Record<string, number> = {
  frequent: 15 * 60 * 1000, // 15 minutes
  hourly: 60 * 60 * 1000, // 1 hour
  daily: 24 * 60 * 60 * 1000, // 24 hours
  weekly: 7 * 24 * 60 * 60 * 1000, // 7 days
};

/**
 * Calculate next poll time based on frequency
 */
function calculateNextPoll(frequency: string): Date {
  const interval = POLL_INTERVALS[frequency] ?? POLL_INTERVALS.daily!;
  return new Date(Date.now() + interval);
}

/**
 * Verify cron secret for Vercel Cron jobs
 */
function verifyCronSecret(request: Request): boolean {
  const authHeader = request.headers.get("authorization");
  const cronSecret = process.env.CRON_SECRET;

  // In development, allow without secret
  if (env.NODE_ENV === "development") {
    return true;
  }

  // In production, CRON_SECRET must be configured - deny by default
  if (!cronSecret) {
    console.error(
      "[CRON] SECURITY: CRON_SECRET not configured in production - rejecting request",
    );
    return false;
  }

  return authHeader === `Bearer ${cronSecret}`;
}

export async function GET(request: Request) {
  // Verify cron secret
  if (!verifyCronSecret(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const startTime = Date.now();
  const results = {
    processed: 0,
    succeeded: 0,
    failed: 0,
    skipped: 0,
    errors: [] as string[],
  };

  try {
    // Find metrics due for polling
    const metricsDue = await db.metric.findMany({
      where: {
        nextPollAt: { lte: new Date() },
        pollFrequency: { not: "manual" },
        metricTemplate: { not: null },
        integration: { isNot: null },
      },
      select: {
        id: true,
        name: true,
        pollFrequency: true,
      },
      take: BATCH_SIZE,
      orderBy: { nextPollAt: "asc" }, // Process oldest first
    });

    console.info(`[CRON] Found ${metricsDue.length} metrics due for polling`);

    // Process each metric using the unified refresh function
    for (const metric of metricsDue) {
      results.processed++;

      try {
        // Use the same unified function as manual refresh
        const refreshResult = await refreshMetricWithCharts({
          metricId: metric.id,
        });

        if (!refreshResult.success) {
          results.failed++;
          results.errors.push(`${metric.name}: ${refreshResult.error}`);

          // Update nextPollAt even on failure (cron-specific)
          await db.metric.update({
            where: { id: metric.id },
            data: {
              nextPollAt: calculateNextPoll(metric.pollFrequency),
            },
          });

          continue;
        }

        // Update nextPollAt on success (cron-specific, not done by refreshMetricWithCharts)
        await db.metric.update({
          where: { id: metric.id },
          data: {
            nextPollAt: calculateNextPoll(metric.pollFrequency),
          },
        });

        results.succeeded++;
        console.info(`[CRON] Successfully polled: ${metric.name}`);
      } catch (error) {
        results.failed++;
        const errorMessage =
          error instanceof Error ? error.message : "Unknown error";
        results.errors.push(`${metric.name}: ${errorMessage}`);

        // Update nextPollAt even on error (cron-specific)
        await db.metric.update({
          where: { id: metric.id },
          data: {
            nextPollAt: calculateNextPoll(metric.pollFrequency),
          },
        });
      }
    }

    const duration = Date.now() - startTime;
    console.info(`[CRON] Completed in ${duration}ms. Results:`, results);

    return NextResponse.json({
      success: true,
      duration: `${duration}ms`,
      ...results,
    });
  } catch (error) {
    console.error("[CRON] Fatal error:", error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
        ...results,
      },
      { status: 500 },
    );
  }
}

// Also support POST for manual triggering
export async function POST(request: Request) {
  return GET(request);
}
