/**
 * Custom Integration Handler
 *
 * Handles integrations that don't use Nango (e.g., Instagram via URL, custom APIs).
 * This is infrastructure for future expansion - not fully implemented yet.
 */

import type { PrismaClient, Integration } from "@prisma/client";

/**
 * Custom integration configuration interface
 */
export interface CustomIntegrationConfig {
  type: "api" | "webhook" | "manual";
  url?: string; // For API integrations
  authMethod?: "none" | "api_key" | "oauth";
  apiKey?: string; // If using API key auth
  pollingInterval?: number; // Minutes between data fetches
  dataExtractor?: string; // JSON path or custom logic identifier
}

/**
 * Create a custom (non-Nango) integration
 *
 * @param db - Prisma client instance
 * @param organizationId - Organization ID from WorkOS
 * @param userId - User ID creating the integration
 * @param integrationId - Custom integration identifier (e.g., "instagram", "custom-api")
 * @param config - Integration configuration
 * @returns Created Integration record
 */
export async function createCustomIntegration(
  db: PrismaClient,
  organizationId: string,
  userId: string,
  integrationId: string,
  config: CustomIntegrationConfig,
): Promise<Integration> {
  // Generate a unique connection ID for custom integrations
  const connectionId = `custom-${integrationId}-${Date.now()}`;

  return await db.integration.create({
    data: {
      connectionId,
      integrationId,
      organizationId,
      connectedBy: userId,
      status: "active",
      type: "custom", // Mark as custom integration
      customConfig: config as any, // Store configuration as JSON
      metadata: {
        createdVia: "custom",
        displayName: integrationId,
      },
    },
  });
}

/**
 * Fetch data from a custom integration
 *
 * This is a placeholder for future implementation. The actual logic will depend
 * on the specific integration type and configuration.
 *
 * @param integration - Integration record with customConfig
 * @returns Fetched data value
 * @throws Error - Not yet implemented
 */
export async function fetchCustomIntegrationData(
  integration: Integration,
): Promise<number> {
  if (integration.type !== "custom") {
    throw new Error("Integration is not a custom integration");
  }

  const config = integration.customConfig as CustomIntegrationConfig;

  // Future implementation will handle different custom integration types
  switch (config.type) {
    case "api":
      // TODO: Fetch data from API URL with authentication
      throw new Error("API integration data fetching not yet implemented");

    case "webhook":
      // TODO: Return cached webhook data
      throw new Error("Webhook integration data not yet implemented");

    case "manual":
      // TODO: Return manually entered data
      throw new Error("Manual integration data not yet implemented");

    default:
      throw new Error(`Unknown custom integration type: ${config.type}`);
  }
}

/**
 * Validate custom integration configuration
 *
 * @param config - Configuration to validate
 * @returns Validation result with errors if any
 */
export function validateCustomConfig(config: CustomIntegrationConfig): {
  valid: boolean;
  errors: string[];
} {
  const errors: string[] = [];

  if (!config.type) {
    errors.push("Integration type is required");
  }

  if (config.type === "api") {
    if (!config.url) {
      errors.push("URL is required for API integrations");
    }
    if (!config.authMethod) {
      errors.push("Auth method is required for API integrations");
    }
  }

  if (config.pollingInterval && config.pollingInterval < 5) {
    errors.push("Polling interval must be at least 5 minutes");
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

/**
 * Update custom integration configuration
 *
 * @param db - Prisma client instance
 * @param integrationId - Integration ID to update
 * @param config - New configuration
 * @returns Updated integration
 */
export async function updateCustomIntegration(
  db: PrismaClient,
  integrationId: string,
  config: Partial<CustomIntegrationConfig>,
): Promise<Integration> {
  const integration = await db.integration.findUnique({
    where: { id: integrationId },
  });

  if (!integration || integration.type !== "custom") {
    throw new Error("Integration not found or is not a custom integration");
  }

  const currentConfig = integration.customConfig as CustomIntegrationConfig;
  const updatedConfig = { ...currentConfig, ...config };

  const validation = validateCustomConfig(updatedConfig);
  if (!validation.valid) {
    throw new Error(`Invalid configuration: ${validation.errors.join(", ")}`);
  }

  return await db.integration.update({
    where: { id: integrationId },
    data: {
      customConfig: updatedConfig as any,
    },
  });
}
