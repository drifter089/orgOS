import { type NextRequest, NextResponse } from "next/server";

import { db } from "@/server/db";

/**
 * Nango Webhook Handler
 *
 * Receives webhooks from Nango when:
 * - New connections are created (auth)
 * - Connections are updated
 * - Connections are deleted
 *
 * Webhook payload structure:
 * {
 *   "type": "auth" | "sync" | "action",
 *   "operation": "creation" | "update" | "deletion",
 *   "connectionId": "<UUID>",
 *   "providerConfigKey": "<INTEGRATION-ID>",
 *   "environment": "dev" | "prod",
 *   "success": true | false,
 *   "endUser": {
 *     "endUserId": "<END-USER-ID>",
 *     "tags": { "organizationId": "<ORG-ID>" }
 *   }
 * }
 */

interface NangoWebhookPayload {
  type: string;
  operation: "creation" | "update" | "deletion";
  connectionId: string;
  providerConfigKey: string;
  environment: string;
  success: boolean;
  endUser?: {
    endUserId: string;
    email?: string;
    displayName?: string;
    tags?: {
      organizationId?: string;
    };
  };
  error?: string;
}

export async function POST(request: NextRequest) {
  try {
    const payload = (await request.json()) as NangoWebhookPayload;

    console.info("[Nango Webhook]", {
      type: payload.type,
      operation: payload.operation,
      connectionId: payload.connectionId,
      providerConfigKey: payload.providerConfigKey,
      success: payload.success,
    });

    if (payload.type !== "auth") {
      console.info(
        "[Nango Webhook] Ignoring non-auth webhook type:",
        payload.type,
      );
      return NextResponse.json(
        { message: "Webhook type not supported" },
        { status: 200 },
      );
    }

    if (payload.operation === "creation" && payload.success) {
      await handleConnectionCreation(payload);
      console.info("[Nango Webhook] Connection created:", payload.connectionId);
      return NextResponse.json({ message: "Connection created" });
    }

    if (payload.operation === "deletion") {
      await handleConnectionDeletion(payload);
      console.info("[Nango Webhook] Connection deleted:", payload.connectionId);
      return NextResponse.json({ message: "Connection deleted" });
    }

    console.info(
      "[Nango Webhook] No action taken for operation:",
      payload.operation,
    );
    return NextResponse.json({ message: "Webhook processed" });
  } catch (error) {
    console.error("[Nango Webhook] Error processing webhook:", error);
    return NextResponse.json(
      {
        error: "Failed to process webhook",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    );
  }
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

  const integration = await db.integration.findUnique({
    where: { connectionId },
  });

  if (!integration) {
    console.error(
      "[Nango Webhook] Connection not found in database:",
      connectionId,
    );
    return;
  }

  console.info("[Nango Webhook] Marking integration as revoked:", connectionId);

  await db.integration.update({
    where: { connectionId },
    data: {
      status: "revoked",
    },
  });
}
