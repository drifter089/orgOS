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

  // Daily metric sync job - runs at midnight UTC
  // Cron expression: "0 0 * * *" = At 00:00 (midnight) every day
  cron.schedule(
    "0 0 * * *",
    () => {
      void runMetricSyncJob();
    },
    {
      scheduled: true,
      timezone: "UTC",
    },
  );

  console.info("[Cron] Scheduled daily metric sync job at midnight UTC");

  // Optional: Run a test sync immediately on startup in development
  if (process.env.NODE_ENV === "development") {
    console.info(
      "[Cron] Development mode: Skipping initial sync. Use manual refresh buttons to test.",
    );
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
