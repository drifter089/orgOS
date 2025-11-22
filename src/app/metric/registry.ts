/**
 * Central registry aggregating all metric templates
 * This file imports templates from all integration directories
 * and provides helper functions to access them.
 */
import type { MetricTemplate } from "@/lib/metrics/types";

// Import integration templates
import { templates as githubTemplates } from "./github/templates";
import { templates as googleSheetsTemplates } from "./google-sheets/templates";
import { templates as posthogTemplates } from "./posthog/templates";
import { templates as youtubeTemplates } from "./youtube/templates";

/**
 * Registry of all metric templates organized by integration
 */
export const METRIC_TEMPLATES: Record<string, MetricTemplate[]> = {
  github: githubTemplates,
  posthog: posthogTemplates,
  "google-sheet": googleSheetsTemplates,
  youtube: youtubeTemplates,
};

/**
 * Get all metric templates across all integrations
 */
export function getAllTemplates(): MetricTemplate[] {
  return Object.values(METRIC_TEMPLATES).flat();
}

/**
 * Get metric templates for a specific integration
 */
export function getTemplatesByIntegration(
  integrationId: string,
): MetricTemplate[] {
  return METRIC_TEMPLATES[integrationId] ?? [];
}

/**
 * Get a specific template by its ID
 */
export function getTemplate(templateId: string): MetricTemplate | undefined {
  return getAllTemplates().find((t) => t.templateId === templateId);
}
