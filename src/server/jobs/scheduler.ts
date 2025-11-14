import cron from "node-cron";
import { runMetricSyncJob } from "./metric-sync-job";

/**
 * Initialize all cron jobs
 * Call this function from your server startup (e.g., in src/server/db.ts or app startup)
 */
export function initializeCronJobs() {
  // Check if cron jobs should be enabled
  const ENABLE_CRON_JOBS = process.env.ENABLE_CRON_JOBS === "true";

  if (!ENABLE_CRON_JOBS) {
    console.info(
      "[Cron] Cron jobs disabled. Set ENABLE_CRON_JOBS=true to enable.",
    );
    return;
  }

  console.info("[Cron] Initializing cron jobs...");

  // Determine cron schedule based on environment
  const isDev = process.env.NODE_ENV === "development";
  const cronExpression = isDev
    ? "*/5 * * * *" // Every 5 minutes in development
    : "0 0 * * *"; // Midnight UTC in production

  // Metric sync job
  cron.schedule(
    cronExpression,
    () => {
      void runMetricSyncJob();
    },
    {
      scheduled: true,
      timezone: "UTC",
    },
  );

  if (isDev) {
    console.info(
      "[Cron] Development mode: Scheduled metric sync every 5 minutes for testing",
    );
    console.info(
      "[Cron] Next sync in ~5 minutes. Use manual refresh buttons for immediate testing.",
    );
  } else {
    console.info("[Cron] Production mode: Scheduled daily metric sync at midnight UTC");
  }

  console.info("[Cron] All cron jobs initialized successfully");
}

/**
 * Manually trigger the metric sync job (useful for testing)
 */
export async function manuallyTriggerMetricSync() {
  console.info("[Cron] Manually triggering metric sync job...");
  await runMetricSyncJob();
}
