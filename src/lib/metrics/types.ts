/**
 * Shared type definitions for the metrics system
 * Used by both client and server code
 */

// =============================================================================
// Endpoint Definitions
// =============================================================================

export interface Endpoint {
  label: string;
  path: string;
  method: "GET" | "POST" | "PUT" | "PATCH" | "DELETE";
  description?: string;
  requiresParams?: boolean;
  params?: string[];
}

export interface ServiceConfig {
  name: string;
  integrationId: string;
  baseUrl: string;
  endpoints: Endpoint[];
  exampleParams?: Record<string, string>;
}

// =============================================================================
// Metric Template Definitions
// =============================================================================

export interface MetricTemplate {
  templateId: string;
  label: string;
  description: string;
  integrationId: string;
  metricType: "percentage" | "number" | "duration" | "rate";
  defaultUnit?: string;

  // UI configuration
  requiredParams: Array<{
    name: string;
    label: string;
    description: string;
    type: "text" | "number" | "select" | "dynamic-select";
    required: boolean;
    placeholder?: string;

    // For static dropdowns
    options?: Array<{ label: string; value: string }>;

    // For dynamic dropdowns
    dynamicConfig?: {
      endpoint: string; // From endpoints/[integration].ts
      method?: "GET" | "POST";
      params?: Record<string, string>;
      body?: unknown;
      dependsOn?: string; // Another param this depends on
    };
  }>;

  // Final metric data fetching configuration
  metricEndpoint: string; // From endpoints/[integration].ts
  method?: "GET" | "POST";
  requestBody?: unknown;

  // Optional: preview/validation endpoints
  previewEndpoint?: string;

  // New fields for metrics architecture
  historicalDataLimit?: string; // "30d", "90d", "365d" - how far back to fetch on creation
  defaultPollFrequency?: "frequent" | "hourly" | "daily" | "weekly" | "manual";
  isTimeSeries?: boolean; // default true, false for snapshot data (Google Sheets)

  /**
   * Developer-authored instructions for AI to extract metric data.
   * Contains ALL hints in natural language - timestamp field, aggregation,
   * dimensions to preserve, filtering rules, response structure, etc.
   *
   * Example:
   * ```
   * Use completedAt for timestamp (not createdAt).
   * Count issues per day where completedAt is not null.
   * Store estimate, priority, team.name in dimensions.
   * Aggregation: SUM (count per day).
   * Response structure: data.issues.nodes[]
   * ```
   *
   * Optional for backward compatibility - templates without this
   * continue to use generic AI inference based on `description`.
   */
  extractionPrompt?: string;
}

// =============================================================================
// Runtime Configuration
// =============================================================================

export interface EndpointConfig {
  integrationId: string;
  endpoint: string;
  method: string;
  params: Record<string, string>;
  body?: unknown;
}

// =============================================================================
// Manual Metric Configuration
// =============================================================================

/**
 * Configuration for manual metrics (user-entered KPIs).
 * Stored in the Metric.endpointConfig JSON field.
 */
export interface ManualMetricConfig {
  type: "manual";
  unitType: "number" | "percentage";
  cadence: "daily" | "weekly" | "monthly";
}

/**
 * Type guard to check if a metric config is for a manual metric
 */
export function isManualMetricConfig(
  config: unknown,
): config is ManualMetricConfig {
  return (
    typeof config === "object" &&
    config !== null &&
    "type" in config &&
    (config as ManualMetricConfig).type === "manual"
  );
}

// =============================================================================
// Legacy Type Support (for backward compatibility during migration)
// =============================================================================

/**
 * @deprecated Use dynamicConfig in requiredParams instead
 */
export interface DropdownEndpoint {
  paramName: string;
  endpoint: string;
  method?: "GET" | "POST";
  body?: unknown;
  dependsOn?: string;
  transform: (data: unknown) => Array<{ label: string; value: string }>;
}
