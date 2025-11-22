/**
 * Template Registry
 * Simple registry that consolidates templates from all integrations
 */
import { templates as githubTemplates } from "@/lib/integrations/github";
import { templates as googleSheetsTemplates } from "@/lib/integrations/google-sheets";
import { templates as posthogTemplates } from "@/lib/integrations/posthog";
import { templates as youtubeTemplates } from "@/lib/integrations/youtube";
import type { MetricTemplate } from "@/lib/metrics/types";

// Consolidate all templates
const allTemplates: MetricTemplate[] = [
  ...githubTemplates,
  ...googleSheetsTemplates,
  ...posthogTemplates,
  ...youtubeTemplates,
];

/**
 * Get a template by its ID
 */
export function getTemplate(templateId: string): MetricTemplate | undefined {
  return allTemplates.find((t) => t.templateId === templateId);
}
