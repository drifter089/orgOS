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
