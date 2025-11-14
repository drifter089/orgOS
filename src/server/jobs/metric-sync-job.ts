import { db } from "@/server/db";
import { syncAllMetricsForOrganization } from "@/server/api/services/metric-sync";

/**
 * Daily cron job to sync all metrics for all organizations
 * Runs at midnight UTC (configurable in scheduler.ts)
 */
export async function runMetricSyncJob() {
  console.info("[Cron] Starting daily metric sync job...");

  try {
    // Get all unique organizations that have metrics
    const organizations = await db.metric.findMany({
      select: {
        organizationId: true,
      },
      distinct: ["organizationId"],
    });

    console.info(
      `[Cron] Found ${organizations.length} organizations with metrics`,
    );

    let totalSuccessful = 0;
    let totalFailed = 0;
    let totalSkipped = 0;
    let totalMetrics = 0;

    // Sync metrics for each organization sequentially
    for (const org of organizations) {
      try {
        console.info(
          `[Cron] Syncing metrics for organization ${org.organizationId}...`,
        );

        const result = await syncAllMetricsForOrganization(
          db,
          org.organizationId,
        );

        console.info(
          `[Cron] Organization ${org.organizationId}: ${result.successful} successful, ${result.failed} failed, ${result.skipped} skipped (${result.total} total)`,
        );

        totalSuccessful += result.successful;
        totalFailed += result.failed;
        totalSkipped += result.skipped;
        totalMetrics += result.total;
      } catch (error) {
        console.error(
          `[Cron] Error syncing metrics for organization ${org.organizationId}:`,
          error,
        );
      }
    }

    console.info(
      `[Cron] Daily metric sync completed: ${totalSuccessful} successful, ${totalFailed} failed, ${totalSkipped} skipped (${totalMetrics} total metrics across ${organizations.length} organizations)`,
    );
  } catch (error) {
    console.error("[Cron] Fatal error in metric sync job:", error);
  }
}
