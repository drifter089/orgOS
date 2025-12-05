/**
 * TODO: Implement as part of METRICS_ARCHITECTURE_PLAN.md
 *
 * This API route will handle: Polling metrics on a schedule
 *
 * Functionality:
 * - Called by cron job (e.g., Vercel Cron, external scheduler)
 * - Fetches metrics due for polling based on their pollFrequency
 * - Executes MetricTransformer to fetch and transform API data
 * - Stores new MetricDataPoints in the database
 * - For non-time-series metrics (isTimeSeries: false), replaces existing data
 *
 * See METRICS_ARCHITECTURE_PLAN.md for:
 * - Polling tiers and frequencies
 * - Batch processing strategy
 * - Error handling and retry logic
 * - Security considerations
 */
import { NextResponse } from "next/server";

export async function GET() {
  // TODO: Implement polling logic
  return NextResponse.json({
    message: "Poll metrics endpoint - not yet implemented",
    status: "pending_implementation",
  });
}
