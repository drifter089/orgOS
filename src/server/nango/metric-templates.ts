/**
 * Simplified Metric Templates for Third-Party Integrations
 *
 * Defines available metrics per integration provider and how to extract values
 * from Nango's synced data cache.
 *
 * SUPPORTED INTEGRATIONS:
 * - PostHog: Event count metrics only
 * - Google Sheets: Row count metrics only
 */

export interface MetricTemplate {
  id: string;
  name: string;
  description: string;
  type: "percentage" | "number" | "duration" | "rate";
  requiresConfig: string[]; // Config fields user must provide
  nangoModel: string; // Which Nango model to query
  defaultUnit?: string;
  extractValue: (records: any[], config?: any) => number;
}

export type MetricTemplateConfig = Record<string, MetricTemplate[]>;

/**
 * Available metric templates for each integration provider
 */
export const METRIC_TEMPLATES: MetricTemplateConfig = {
  // PostHog Metrics - Event counting only
  posthog: [
    {
      id: "event_count",
      name: "Event Count",
      description: "Track total count of a specific event",
      type: "number",
      requiresConfig: ["eventName"],
      nangoModel: "PostHogEvent",
      defaultUnit: "events",
      extractValue: (records, config) => {
        if (!config?.eventName) return 0;
        return records.filter(
          (r) =>
            r.event === config.eventName &&
            !r._nango_metadata?.deleted_at,
        ).length;
      },
    },
  ],

  // Google Sheets Metrics - Row count only
  "google-sheet": [
    {
      id: "sheet_row_count",
      name: "Sheet Row Count",
      description: "Total number of rows in the selected sheet",
      type: "number",
      requiresConfig: ["sheetId"],
      nangoModel: "GoogleSheetRow",
      defaultUnit: "rows",
      extractValue: (records, config) => {
        if (!config?.sheetId) return 0;

        return records.filter(
          (r) =>
            r.sheetId === config.sheetId &&
            !r._nango_metadata?.deleted_at,
        ).length;
      },
    },
  ],
};

/**
 * Get available templates for a specific integration
 */
export function getTemplatesForIntegration(
  integrationId: string,
): MetricTemplate[] {
  return METRIC_TEMPLATES[integrationId] || [];
}

/**
 * Get a specific template by ID
 */
export function getTemplate(
  integrationId: string,
  templateId: string,
): MetricTemplate | undefined {
  const templates = METRIC_TEMPLATES[integrationId] || [];
  return templates.find((t) => t.id === templateId);
}

/**
 * Determine source type from template ID
 */
export function getSourceType(templateId: string): string {
  const sourceTypeMap: Record<string, string> = {
    event_count: "event",
    sheet_row_count: "sheet",
  };

  return sourceTypeMap[templateId] || "unknown";
}
