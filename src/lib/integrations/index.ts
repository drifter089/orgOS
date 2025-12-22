/**
 * Integration Registry Index
 * Central export point for all integration configurations
 */
import type { MetricTemplate } from "@/lib/metrics/types";

import * as github from "./github";
import * as googleSheets from "./google-sheets";
import * as linear from "./linear";
import * as posthog from "./posthog";
import * as youtube from "./youtube";

// Re-export modules
export { github, youtube, posthog, googleSheets, linear };

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
    ...linear.templates,
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

/** Get metric options formatted for UI dropdowns from templates (single source of truth). */
export function getMetricOptionsForUI(integrationId: string): {
  value: string;
  label: string;
  description: string;
}[] {
  return getTemplatesByIntegration(integrationId).map((t) => ({
    value: t.templateId.replace(`${integrationId}-`, ""),
    label: t.label,
    description: t.description,
  }));
}
