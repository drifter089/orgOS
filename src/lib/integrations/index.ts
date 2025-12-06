/**
 * Integration Registry Index
 * Central export point for all integration configurations
 */
import type { MetricTemplate } from "@/lib/metrics/types";

import * as github from "./github";
import * as googleSheets from "./google-sheets";
import * as posthog from "./posthog";
import * as youtube from "./youtube";

// Re-export modules
export { github, youtube, posthog, googleSheets };

// Re-export types for convenience
export type {
  Endpoint,
  MetricTemplate,
  ServiceConfig,
} from "@/lib/metrics/types";

/**
 * Get all templates from all integrations
 */
export function getAllTemplates(): MetricTemplate[] {
  return [
    ...github.templates,
    ...youtube.templates,
    ...posthog.templates,
    ...googleSheets.templates,
  ];
}

/**
 * Get a template by its templateId
 */
export function getTemplate(templateId: string): MetricTemplate | undefined {
  return getAllTemplates().find((t) => t.templateId === templateId);
}

/**
 * Get templates for a specific integration
 */
export function getTemplatesByIntegration(
  integrationId: string,
): MetricTemplate[] {
  return getAllTemplates().filter((t) => t.integrationId === integrationId);
}
