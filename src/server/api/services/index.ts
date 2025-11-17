import { githubServiceConfig } from "./github";
import { googleSheetsServiceConfig } from "./google-sheets";
import { posthogServiceConfig } from "./posthog";
import { youtubeServiceConfig } from "./youtube";

/**
 * Service Endpoint Registry
 * Central export for all third-party service endpoint definitions
 */

export { githubEndpoints, githubServiceConfig } from "./github";
export {
  googleSheetsEndpoints,
  googleSheetsServiceConfig,
} from "./google-sheets";
export { posthogEndpoints, posthogServiceConfig } from "./posthog";
export { youtubeEndpoints, youtubeServiceConfig } from "./youtube";
export type { ServiceEndpoint } from "./github";

/**
 * Map of integration IDs to their service configurations
 * Used to automatically detect and display appropriate endpoints
 *
 * Note: YouTube service includes BOTH Data API v3 and Analytics API v2 endpoints
 */
export const serviceRegistry = {
  github: githubServiceConfig,
  "google-sheet": googleSheetsServiceConfig, // Match Nango integration ID
  posthog: posthogServiceConfig,
  youtube: youtubeServiceConfig, // Includes both Data + Analytics APIs
} as const;

/**
 * Get service configuration by integration ID
 */
export function getServiceConfig(integrationId: string) {
  return serviceRegistry[integrationId as keyof typeof serviceRegistry];
}

/**
 * Get all supported service IDs
 */
export function getSupportedServices() {
  return Object.keys(serviceRegistry);
}
