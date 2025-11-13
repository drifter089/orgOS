/**
 * Metric Templates for Third-Party Integrations
 *
 * Defines available metrics per integration provider and how to extract values
 * from Nango's synced data cache.
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

export interface MetricTemplateConfig {
  [key: string]: MetricTemplate[];
}

/**
 * Available metric templates for each integration provider
 */
export const METRIC_TEMPLATES: MetricTemplateConfig = {
  // PostHog Metrics
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
    {
      id: "active_persons",
      name: "Active Persons",
      description: "Count of active users in your PostHog project",
      type: "number",
      requiresConfig: [],
      nangoModel: "PostHogPerson",
      defaultUnit: "users",
      extractValue: (records) => {
        return records.filter((r) => !r._nango_metadata?.deleted_at).length;
      },
    },
    {
      id: "conversion_rate",
      name: "Conversion Rate",
      description: "Funnel conversion percentage between two events",
      type: "percentage",
      requiresConfig: ["startEvent", "endEvent"],
      nangoModel: "PostHogEvent",
      defaultUnit: "%",
      extractValue: (records, config) => {
        if (!config?.startEvent || !config?.endEvent) return 0;

        const activeRecords = records.filter(
          (r) => !r._nango_metadata?.deleted_at,
        );
        const startCount = activeRecords.filter(
          (r) => r.event === config.startEvent,
        ).length;
        const endCount = activeRecords.filter(
          (r) => r.event === config.endEvent,
        ).length;

        return startCount > 0 ? (endCount / startCount) * 100 : 0;
      },
    },
  ],

  // Slack Metrics
  slack: [
    {
      id: "active_users",
      name: "Active Users",
      description: "Count of active workspace members (excluding bots)",
      type: "number",
      requiresConfig: [],
      nangoModel: "SlackUser",
      defaultUnit: "users",
      extractValue: (records) => {
        return records.filter(
          (r) =>
            r.is_active &&
            !r.is_bot &&
            !r._nango_metadata?.deleted_at,
        ).length;
      },
    },
    {
      id: "total_channels",
      name: "Total Channels",
      description: "Count of all channels in workspace",
      type: "number",
      requiresConfig: ["includeArchived"],
      nangoModel: "SlackChannel",
      defaultUnit: "channels",
      extractValue: (records, config) => {
        return records.filter(
          (r) =>
            !r._nango_metadata?.deleted_at &&
            (config?.includeArchived || !r.is_archived),
        ).length;
      },
    },
    {
      id: "public_channels",
      name: "Public Channels",
      description: "Count of public channels only",
      type: "number",
      requiresConfig: [],
      nangoModel: "SlackChannel",
      defaultUnit: "channels",
      extractValue: (records) => {
        return records.filter(
          (r) =>
            r.is_channel &&
            !r.is_private &&
            !r.is_archived &&
            !r._nango_metadata?.deleted_at,
        ).length;
      },
    },
  ],

  // Google Sheets Metrics
  "google-sheet": [
    {
      id: "sheet_value",
      name: "Sheet Value",
      description: "Extract specific cell value from a sheet",
      type: "number",
      requiresConfig: ["sheetId", "cellReference"],
      nangoModel: "GoogleSheetRow",
      extractValue: (records, config) => {
        if (!config?.sheetId || !config?.cellReference) return 0;

        // Filter to specific sheet
        const sheetRecords = records.filter(
          (r) =>
            r.sheetId === config.sheetId &&
            !r._nango_metadata?.deleted_at,
        );

        if (sheetRecords.length === 0) return 0;

        // Parse cell reference (e.g., "B2" -> column B, row 2)
        const cellMatch = config.cellReference.match(/^([A-Z]+)(\d+)$/);
        if (!cellMatch) return 0;

        const colLetter = cellMatch[1];
        const rowIndex = parseInt(cellMatch[2], 10);

        // Convert column letter to index (A=0, B=1, etc.)
        const colIndex =
          colLetter.split("").reduce((acc, char) => {
            return acc * 26 + (char.charCodeAt(0) - 64);
          }, 0) - 1;

        // Find the row
        const targetRow = sheetRecords.find((r) => r.rowIndex === rowIndex);
        if (!targetRow?.values) return 0;

        // Extract value from column
        const cellValue = targetRow.values[colIndex];
        const numValue = parseFloat(cellValue);

        return isNaN(numValue) ? 0 : numValue;
      },
    },
    {
      id: "row_count",
      name: "Row Count",
      description: "Total number of rows in a sheet",
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
    {
      id: "sum_column",
      name: "Sum Column",
      description: "Sum all numeric values in a specific column",
      type: "number",
      requiresConfig: ["sheetId", "columnLetter"],
      nangoModel: "GoogleSheetRow",
      extractValue: (records, config) => {
        if (!config?.sheetId || !config?.columnLetter) return 0;

        const sheetRecords = records.filter(
          (r) =>
            r.sheetId === config.sheetId &&
            !r._nango_metadata?.deleted_at,
        );

        // Convert column letter to index
        const colIndex =
          config.columnLetter
            .split("")
            .reduce((acc: number, char: string) => {
              return acc * 26 + (char.charCodeAt(0) - 64);
            }, 0) - 1;

        let sum = 0;
        for (const row of sheetRecords) {
          if (row.values && row.values[colIndex]) {
            const value = parseFloat(row.values[colIndex]);
            if (!isNaN(value)) {
              sum += value;
            }
          }
        }

        return sum;
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
    conversion_rate: "event",
    active_persons: "person",
    active_users: "user",
    total_channels: "channel",
    public_channels: "channel",
    sheet_value: "sheet",
    row_count: "sheet",
    sum_column: "sheet",
  };

  return sourceTypeMap[templateId] || "unknown";
}
