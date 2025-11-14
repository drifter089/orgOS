import { Nango } from "@nangohq/node";
import { type PrismaClient } from "@prisma/client";

import { env } from "@/env";

/**
 * Main sync orchestrator - determines metric source type and calls appropriate sync function
 */
export async function syncMetric(
  db: PrismaClient,
  metricId: string,
): Promise<{ success: boolean; error?: string; dataPointsCreated: number }> {
  try {
    const metric = await db.metric.findUnique({
      where: { id: metricId },
      include: { integration: true },
    });

    if (!metric) {
      throw new Error(`Metric ${metricId} not found`);
    }

    let value: number;
    let dataPointsCreated = 0;

    // Route to appropriate sync function based on source type
    switch (metric.sourceType) {
      case "integration":
        if (!metric.integration) {
          throw new Error(
            "Integration-based metric must have an associated integration",
          );
        }
        value = await syncIntegrationMetric(metric, metric.integration);
        break;

      case "scraping":
        if (!metric.sourceUrl) {
          throw new Error("Scraping-based metric must have a sourceUrl");
        }
        value = await syncScrapingMetric(metric);
        break;

      case "self_reported":
        // Self-reported metrics are updated via the reportValue mutation
        // Skip sync for these metrics
        await logSyncResult(db, metricId, "skipped", 0);
        return { success: true, dataPointsCreated: 0 };

      default:
        throw new Error(`Unknown metric source type: ${metric.sourceType}`);
    }

    // Record the data point
    await recordDataPoint(db, metricId, value);
    dataPointsCreated = 1;

    // Log successful sync
    await logSyncResult(db, metricId, "success", dataPointsCreated);

    return { success: true, dataPointsCreated };
  } catch (error) {
    const errorMessage =
      error instanceof Error ? error.message : "Unknown error";
    await logSyncResult(db, metricId, "error", 0, errorMessage);
    return { success: false, error: errorMessage, dataPointsCreated: 0 };
  }
}

/**
 * Sync data from Nango integration
 * Future: Will use Nango's sync service for automatic data fetching
 */
async function syncIntegrationMetric(
  metric: {
    id: string;
    name: string;
    sourceConfig: unknown;
    integrationId: string | null;
  },
  integration: {
    id: string;
    connectionId: string;
    integrationId: string;
    status: string;
  },
): Promise<number> {
  // Validate integration is active
  if (integration.status !== "active") {
    throw new Error(
      `Integration ${integration.integrationId} is ${integration.status}`,
    );
  }

  // Validate Nango credentials
  if (!env.NANGO_SECRET_KEY_DEV) {
    throw new Error("NANGO_SECRET_KEY_DEV not configured");
  }

  const nango = new Nango({ secretKey: env.NANGO_SECRET_KEY_DEV });

  // Parse source config to determine which API endpoint to call
  const config = metric.sourceConfig as {
    endpoint?: string;
    valueJsonPath?: string;
  } | null;

  if (!config?.endpoint) {
    throw new Error(
      "Integration metric must have endpoint in sourceConfig.endpoint",
    );
  }

  // Fetch data from the integration via Nango proxy
  const response = await nango.proxy({
    connectionId: integration.connectionId,
    providerConfigKey: integration.integrationId,
    endpoint: config.endpoint,
    method: "GET",
  });

  // Extract value from response using JSON path
  // For now, assume response.data is the value or has the value at a known path
  const value = extractValueFromResponse(
    response.data as Record<string, unknown>,
    config.valueJsonPath,
  );

  return value;
}

/**
 * Sync data from scraping sources (Google Sheets, Instagram, YouTube, etc.)
 * Placeholder: Actual scraping logic will be implemented later
 */
async function syncScrapingMetric(metric: {
  id: string;
  name: string;
  sourceUrl: string | null;
  sourceConfig: unknown;
}): Promise<number> {
  // TODO: Implement scraping logic based on sourceUrl and sourceConfig
  // For now, throw an error indicating scraping is not yet implemented

  const config = metric.sourceConfig as {
    scraperType?: string;
  } | null;

  throw new Error(
    `Scraping not yet implemented for ${config?.scraperType ?? "unknown"} sources. Metric: ${metric.name}`,
  );

  // Future implementation will:
  // 1. Determine scraper type from sourceConfig (google_sheets, instagram, youtube, etc.)
  // 2. Call appropriate scraper function
  // 3. Extract numeric value from scraped data
  // 4. Return the value
}

/**
 * Record a data point in the time-series table
 */
async function recordDataPoint(
  db: PrismaClient,
  metricId: string,
  value: number,
): Promise<void> {
  await db.metricDataPoint.create({
    data: {
      metricId,
      value,
      timestamp: new Date(),
    },
  });
}

/**
 * Log sync result to audit trail
 */
async function logSyncResult(
  db: PrismaClient,
  metricId: string,
  status: "success" | "error" | "skipped",
  dataPointsCreated: number,
  errorMessage?: string,
): Promise<void> {
  await db.metricSyncLog.create({
    data: {
      metricId,
      status,
      dataPointsCreated,
      errorMessage: errorMessage ?? null,
      syncedAt: new Date(),
    },
  });
}

/**
 * Extract numeric value from API response using optional JSON path
 */
function extractValueFromResponse(
  data: Record<string, unknown>,
  jsonPath?: string,
): number {
  if (!jsonPath) {
    // If no path specified, assume data is the value or has a "value" field
    if (typeof data === "number") return data;
    if (typeof data.value === "number") return data.value;
    throw new Error(
      "Could not extract value from response. Specify valueJsonPath in sourceConfig.",
    );
  }

  // Simple JSON path implementation (supports dot notation like "data.metrics.count")
  const parts = jsonPath.split(".");
  let current: unknown = data;

  for (const part of parts) {
    if (
      typeof current !== "object" ||
      current === null ||
      !(part in current)
    ) {
      throw new Error(`JSON path ${jsonPath} not found in response`);
    }
    current = (current as Record<string, unknown>)[part];
  }

  if (typeof current !== "number") {
    throw new Error(`Value at ${jsonPath} is not a number: ${typeof current}`);
  }

  return current;
}

/**
 * Sync all metrics for an organization
 * Used by cron job and manual "refresh all" button
 */
export async function syncAllMetricsForOrganization(
  db: PrismaClient,
  organizationId: string,
): Promise<{
  total: number;
  successful: number;
  failed: number;
  skipped: number;
}> {
  const metrics = await db.metric.findMany({
    where: { organizationId },
  });

  let successful = 0;
  let failed = 0;
  let skipped = 0;

  // Sync each metric sequentially (can be parallelized in the future)
  for (const metric of metrics) {
    const result = await syncMetric(db, metric.id);

    if (result.success) {
      if (result.dataPointsCreated > 0) {
        successful++;
      } else {
        skipped++;
      }
    } else {
      failed++;
    }
  }

  return {
    total: metrics.length,
    successful,
    failed,
    skipped,
  };
}
