import { type NextRequest, NextResponse } from "next/server";
import { Nango } from "@nangohq/node";

import { db } from "@/server/db";
import { env } from "@/env";

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
 *
 * Auth payload:
 * {
 *   "type": "auth",
 *   "operation": "creation" | "update" | "deletion",
 *   "connectionId": "<UUID>",
 *   "providerConfigKey": "<INTEGRATION-ID>",
 *   "success": true | false,
 *   "endUser": { "endUserId": "<ID>", "tags": { "organizationId": "<ORG-ID>" } }
 * }
 *
 * Sync payload:
 * {
 *   "type": "sync.success" | "sync.error" | "records.*",
 *   "connectionId": "<UUID>",
 *   "providerConfigKey": "<INTEGRATION-ID>",
 *   "syncName": "<SYNC-NAME>",
 *   "model": "<MODEL-NAME>"
 * }
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
  records?: any[];
}

export async function POST(request: NextRequest) {
  try {
    const payload = (await request.json()) as NangoWebhookPayload;

    console.log(`[Nango Webhook] Received: ${payload.type}`);

    // Route to appropriate handler based on event type
    if (payload.type === "auth") {
      return await handleAuthEvent(payload);
    }

    // Handle all sync events (sync.success, sync.error, records.*)
    if (payload.type.startsWith("sync.") || payload.type.startsWith("records.")) {
      return await handleSyncEvent(payload);
    }

    console.log(`[Nango Webhook] Unknown event type: ${payload.type}`);
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
      metadata: {
        email: endUser.email,
        displayName: endUser.displayName,
      },
    },
  });
}

async function handleConnectionDeletion(payload: NangoWebhookPayload) {
  const { connectionId } = payload;

  console.log(`[Nango Webhook] Connection deletion for: ${connectionId}`);

  const integration = await db.integration.findUnique({
    where: { connectionId },
  });

  if (!integration) {
    console.log(`[Nango Webhook] Integration not found for connectionId: ${connectionId}`);
    return;
  }

  // OPTION 1: Soft delete (keep for audit trail)
  // await db.integration.update({
  //   where: { connectionId },
  //   data: {
  //     status: "revoked",
  //   },
  // });

  // OPTION 2: Hard delete (remove from database completely)
  await db.integration.delete({
    where: { connectionId },
  });

  console.log(`[Nango Webhook] Successfully deleted integration from database: ${connectionId}`);
}

// ===== SYNC EVENT HANDLERS =====

async function handleSyncEvent(payload: NangoWebhookPayload) {
  const { type, connectionId, providerConfigKey, syncName } = payload;

  console.log(`[Nango Sync] ${type} - ${providerConfigKey}:${syncName}`);

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
      console.log(`[Nango Sync] Unhandled event: ${type}`);
  }

  return NextResponse.json({ received: true });
}

async function handleSyncSuccess(payload: NangoWebhookPayload) {
  const { connectionId, providerConfigKey, syncName, model } = payload;

  // Find all metrics configured to use this sync
  const metrics = await db.metric.findMany({
    where: {
      nangoProvider: providerConfigKey,
      nangoSync: syncName,
    },
  });

  if (metrics.length === 0) {
    console.log(`[Nango Sync] No metrics configured for ${providerConfigKey}:${syncName}`);
    return;
  }

  console.log(`[Nango Sync] Updating ${metrics.length} metrics from Nango cache`);

  const nango = new Nango({ secretKey: env.NANGO_SECRET_KEY_DEV });

  // Update each metric with latest data from Nango
  for (const metric of metrics) {
    try {
      const records = await nango.listRecords({
        providerConfigKey,
        connectionId,
        model: metric.nangoModel || model || "",
        limit: 100,
      });

      if (records.records.length === 0) {
        console.log(`[Nango Sync] No records found for metric ${metric.name}`);
        continue;
      }

      const latestValue = extractMetricValue(records.records, metric, syncName || "");

      await db.metric.update({
        where: { id: metric.id },
        data: {
          currentValue: latestValue,
          lastSyncedAt: new Date(),
        },
      });

      console.log(`[Nango Sync] Updated metric "${metric.name}" to ${latestValue} ${metric.unit || ""}`);
    } catch (error) {
      console.error(`[Nango Sync] Error updating metric ${metric.name}:`, error);
    }
  }
}

async function handleSyncError(payload: NangoWebhookPayload) {
  const { connectionId, providerConfigKey, syncName, error } = payload;
  console.error(`[Nango Sync] Error - ${providerConfigKey}:${syncName}:`, error);
}

async function handleRecordsChanged(payload: NangoWebhookPayload) {
  const { providerConfigKey, syncName, records } = payload;
  console.log(`[Nango Sync] Records changed - ${providerConfigKey}:${syncName}: ${records?.length || 0} records`);
  await handleSyncSuccess(payload);
}

async function handleRecordsDeleted(payload: NangoWebhookPayload) {
  const { providerConfigKey, syncName, records } = payload;
  console.log(`[Nango Sync] Records deleted - ${providerConfigKey}:${syncName}: ${records?.length || 0} records`);
  await handleSyncSuccess(payload);
}

// ===== UTILITY FUNCTIONS =====

function extractMetricValue(records: any[], metric: any, syncName: string): number {
  // If metric has custom JSON path, use that
  if (metric.nangoJsonPath) {
    const value = extractByJsonPath(records[0], metric.nangoJsonPath);
    return toNumber(value);
  }

  // Otherwise, use default extraction based on sync type
  switch (syncName) {
    case "posthog-persons":
    case "posthog-events":
    case "slack-users":
    case "slack-channels":
    case "slack-messages":
      return records.length;

    case "posthog-conversion":
      return toNumber(records[0]?.conversion_rate || 0);

    default:
      return records.length;
  }
}

function extractByJsonPath(obj: any, path: string): any {
  const keys = path.split(".");
  let current = obj;

  for (const key of keys) {
    const arrayMatch = /^(\w+)\[(\d+)\]$/.exec(key);
    if (arrayMatch?.[1] && arrayMatch[2]) {
      const arrayKey = arrayMatch[1];
      const index = arrayMatch[2];
      current = current?.[arrayKey]?.[parseInt(index, 10)];
    } else {
      current = current?.[key];
    }

    if (current === undefined) {
      return undefined;
    }
  }

  return current;
}

function toNumber(value: any): number {
  if (typeof value === "number") return value;
  if (typeof value === "string") {
    const parsed = parseFloat(value);
    return isNaN(parsed) ? 0 : parsed;
  }
  if (typeof value === "boolean") return value ? 1 : 0;
  return 0;
}
