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
import { refreshMetricAndCharts } from "@/server/api/services/transformation";
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

  // In development, allow without secret
  if (env.NODE_ENV === "development") {
    return true;
  }

  // In production, CRON_SECRET must be configured - deny by default
  if (!env.CRON_SECRET) {
    console.error(
      "[CRON] SECURITY: CRON_SECRET not configured in production - rejecting request",
    );
    return false;
  }

  return authHeader === `Bearer ${env.CRON_SECRET}`;
}

export async function GET(request: Request) {
  // Verify cron secret
  if (!verifyCronSecret(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Get frequency filter from query param
  const { searchParams } = new URL(request.url);
  const frequency = searchParams.get("frequency");

  const startTime = Date.now();
  const results = {
    processed: 0,
    succeeded: 0,
    failed: 0,
    skipped: 0,
  };

  try {
    // Find metrics due for polling (filtered by frequency if provided)
    const metricsDue = await db.metric.findMany({
      where: {
        nextPollAt: { lte: new Date() },
        pollFrequency: frequency ?? { not: "manual" },
        templateId: { not: null },
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

    console.info(
      `[CRON] Found ${metricsDue.length} metrics due for polling (frequency: ${frequency ?? "all"})`,
    );

    // Process each metric using the unified refresh function
    for (const metric of metricsDue) {
      results.processed++;

      try {
        // Use the same unified function as manual refresh
        const refreshResult = await refreshMetricAndCharts({
          metricId: metric.id,
        });

        if (!refreshResult.success) {
          results.failed++;
          // Log metric name server-side only, don't expose in response
          console.error(
            `[CRON] Failed to poll metric ${metric.name}: ${refreshResult.error}`,
          );

          // Update nextPollAt even on failure (cron-specific)
          await db.metric.update({
            where: { id: metric.id },
            data: {
              nextPollAt: calculateNextPoll(metric.pollFrequency),
            },
          });

          continue;
        }

        // Update nextPollAt on success (cron-specific, not done by refreshMetricAndCharts)
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
        // Log metric name server-side only, don't expose in response
        console.error(
          `[CRON] Error polling metric ${metric.name}: ${errorMessage}`,
        );

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
      frequency: frequency ?? "all",
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
