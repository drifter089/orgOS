import { type NextRequest, NextResponse } from "next/server";
import { Nango } from "@nangohq/node";

import { db } from "@/server/db";
import { env } from "@/env";
import { extractMetricValue } from "@/server/nango/nango-extractors";
import { createMetricSnapshot } from "@/server/nango/snapshot-creator";

/**
 * Unified Nango Webhook Handler
 *
 * Handles both authentication and sync events:
 *
 * AUTH EVENTS:
 * - New connections created (auth)
 * - Connections updated
 * - Connections deleted
 *
 * SYNC EVENTS:
 * - sync.success: Sync completed successfully
 * - sync.error: Sync failed
 * - records.created/updated/deleted: Data changes
 */

interface NangoWebhookPayload {
  type: string;
  operation?: "creation" | "update" | "deletion";
  connectionId: string;
  providerConfigKey: string;
  environment?: string;
  success?: boolean;
  syncName?: string;
  model?: string;
  endUser?: {
    endUserId: string;
    email?: string;
    displayName?: string;
    tags?: {
      organizationId?: string;
    };
  };
  error?: string;
  records?: unknown[];
}

export async function POST(request: NextRequest) {
  try {
    const payload = (await request.json()) as NangoWebhookPayload;

    console.info(`[Nango Webhook] Received: ${payload.type}`);

    // Route to appropriate handler based on event type
    if (payload.type === "auth") {
      return await handleAuthEvent(payload);
    }

    // Handle all sync events (sync.success, sync.error, records.*)
    if (payload.type.startsWith("sync.") || payload.type.startsWith("records.")) {
      return await handleSyncEvent(payload);
    }

    console.info(`[Nango Webhook] Unknown event type: ${payload.type}`);
    return NextResponse.json({ message: "Event type not handled" }, { status: 200 });
  } catch (error) {
    console.error("[Nango Webhook] Error:", error);
    return NextResponse.json(
      {
        error: "Failed to process webhook",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    );
  }
}

// ===== AUTH EVENT HANDLERS =====

async function handleAuthEvent(payload: NangoWebhookPayload) {
  if (payload.operation === "creation" && payload.success) {
    await handleConnectionCreation(payload);
    return NextResponse.json({ message: "Connection created" });
  }

  if (payload.operation === "deletion") {
    await handleConnectionDeletion(payload);
    return NextResponse.json({ message: "Connection deleted" });
  }

  return NextResponse.json({ message: "Auth event processed" });
}

async function handleConnectionCreation(payload: NangoWebhookPayload) {
  const { connectionId, providerConfigKey, endUser } = payload;

  if (!endUser?.endUserId) {
    throw new Error("Missing endUser.endUserId in webhook payload");
  }

  const organizationId = endUser.tags?.organizationId;

  if (!organizationId) {
    throw new Error(
      `Missing organizationId for user ${endUser.endUserId}. Ensure organizationId is passed in tags during session creation.`,
    );
  }

  await db.integration.upsert({
    where: { connectionId },
    update: {
      status: "active",
      metadata: {
        email: endUser.email,
        displayName: endUser.displayName,
      },
      connectedBy: endUser.endUserId,
    },
    create: {
      connectionId,
      integrationId: providerConfigKey,
      organizationId,
      connectedBy: endUser.endUserId,
      status: "active",
      type: "nango",
      metadata: {
        email: endUser.email,
        displayName: endUser.displayName,
      },
    },
  });
}

async function handleConnectionDeletion(payload: NangoWebhookPayload) {
  const { connectionId } = payload;

  console.info(`[Nango Webhook] Connection deletion for: ${connectionId}`);

  const integration = await db.integration.findUnique({
    where: { connectionId },
  });

  if (!integration) {
    console.info(`[Nango Webhook] Integration not found for connectionId: ${connectionId}`);
    return;
  }

  // Hard delete (removes from database completely)
  await db.integration.delete({
    where: { connectionId },
  });

  console.info(`[Nango Webhook] Successfully deleted integration: ${connectionId}`);
}

// ===== SYNC EVENT HANDLERS =====

async function handleSyncEvent(payload: NangoWebhookPayload) {
  const { type, providerConfigKey, syncName } = payload;

  console.info(`[Nango Sync] ${type} - ${providerConfigKey}:${syncName ?? "unknown"}`);

  switch (type) {
    case "sync.success":
      await handleSyncSuccess(payload);
      break;

    case "sync.error":
      await handleSyncError(payload);
      break;

    case "records.created":
    case "records.updated":
      await handleRecordsChanged(payload);
      break;

    case "records.deleted":
      await handleRecordsDeleted(payload);
      break;

    default:
      console.info(`[Nango Sync] Unhandled event: ${type}`);
  }

  return NextResponse.json({ received: true });
}

/**
 * Handle successful sync completion
 *
 * This is where we:
 * 1. Find all metrics using this integration
 * 2. Extract current values from Nango cache
 * 3. Update metric current values
 * 4. CREATE TIME-SERIES SNAPSHOTS
 */
async function handleSyncSuccess(payload: NangoWebhookPayload) {
  const { connectionId, providerConfigKey, syncName } = payload;

  console.info(`[Nango Sync Success] ${providerConfigKey}:${syncName ?? "unknown"}`);

  // Find integration
  const integration = await db.integration.findUnique({
    where: { connectionId },
  });

  if (!integration) {
    console.info(`[Nango Sync] No integration found for ${connectionId}`);
    return;
  }

  // Find all IntegrationMetrics linked to this integration
  const integrationMetrics = await db.integrationMetric.findMany({
    where: {
      integrationId: integration.id,
      status: "active",
    },
    include: {
      metric: true,
      integration: true,
    },
  });

  if (integrationMetrics.length === 0) {
    console.info(`[Nango Sync] No active metrics for integration ${integration.id}`);
    return;
  }

  console.info(`[Nango Sync] Updating ${integrationMetrics.length} metrics`);

  const nango = new Nango({ secretKey: env.NANGO_SECRET_KEY_DEV });

  // Update each metric with latest data from Nango
  for (const integrationMetric of integrationMetrics) {
    try {
      // Extract current value using nango-extractors
      const result = await extractMetricValue(
        nango,
        integrationMetric as never,
        connectionId,
        providerConfigKey,
      );

      // Update metric current value
      await db.metric.update({
        where: { id: integrationMetric.metricId },
        data: {
          currentValue: result.value,
        },
      });

      // CREATE TIME-SERIES SNAPSHOT
      await createMetricSnapshot(
        db,
        integrationMetric.metricId,
        result.value,
        "nango_sync",
        {
          syncName,
          providerConfigKey,
          connectionId,
          isStale: result.isStale,
          recordCount: result.recordCount,
          lastModified: result.lastModified,
          integrationMetricId: integrationMetric.id,
        },
      );

      // Update integration metric status
      await db.integrationMetric.update({
        where: { id: integrationMetric.id },
        data: {
          status: result.isStale ? "stale" : "active",
          errorMessage: result.error ?? null,
          lastValidatedAt: new Date(),
          lastSyncedAt: result.lastModified
            ? new Date(result.lastModified)
            : new Date(),
        },
      });

      console.info(
        `[Nango Sync] ✓ Updated "${integrationMetric.metric.name}" to ${result.value} ${integrationMetric.metric.unit ?? ""}`,
      );
    } catch (error) {
      console.error(
        `[Nango Sync] ✗ Error updating metric ${integrationMetric.metric.name}:`,
        error,
      );

      // Mark metric as error
      await db.integrationMetric.update({
        where: { id: integrationMetric.id },
        data: {
          status: "error",
          errorMessage: error instanceof Error ? error.message : "Unknown error",
          lastValidatedAt: new Date(),
        },
      });
    }
  }

  console.info(
    `[Nango Sync] Completed update for ${integrationMetrics.length} metrics`,
  );
}

async function handleSyncError(payload: NangoWebhookPayload) {
  const { connectionId, providerConfigKey, syncName, error } = payload;

  console.error(
    `[Nango Sync Error] ${providerConfigKey}:${syncName ?? "unknown"} - ${error ?? "Unknown error"}`,
  );

  // Update integration status
  const integration = await db.integration.findUnique({
    where: { connectionId },
  });

  if (integration) {
    await db.integration.update({
      where: { id: integration.id },
      data: {
        status: "error",
        errorMessage: error ?? "Sync failed",
      },
    });
  }
}

async function handleRecordsChanged(payload: NangoWebhookPayload) {
  const { providerConfigKey, syncName, records } = payload;
  console.info(
    `[Nango Sync] Records changed - ${providerConfigKey}:${syncName ?? "unknown"}: ${records?.length ?? 0} records`,
  );
  // Trigger metric updates
  await handleSyncSuccess(payload);
}

async function handleRecordsDeleted(payload: NangoWebhookPayload) {
  const { providerConfigKey, syncName, records } = payload;
  console.info(
    `[Nango Sync] Records deleted - ${providerConfigKey}:${syncName ?? "unknown"}: ${records?.length ?? 0} records`,
  );
  // Trigger metric updates to reflect deletions
  await handleSyncSuccess(payload);
}
