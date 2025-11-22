/**
 * PostHog Integration Registry
 * Single source of truth for all PostHog-related configurations
 */
import type {
  Endpoint,
  MetricTemplate,
  ServiceConfig,
} from "@/lib/metrics/types";

// =============================================================================
// Metadata
// =============================================================================

export const name = "PostHog";
export const integrationId = "posthog";
export const baseUrl = "https://app.posthog.com";

// =============================================================================
// Metric Templates
// =============================================================================

export const templates: MetricTemplate[] = [
  {
    templateId: "posthog-event-count",
    label: "Event Count (Time Series)",
    description: "Count occurrences of a specific event over time",
    integrationId: "posthog",
    metricType: "number",
    defaultUnit: "events",

    metricEndpoint: "/api/projects/{PROJECT_ID}/query/",
    method: "POST",
    requestBody: JSON.stringify({
      query: {
        kind: "HogQLQuery",
        query:
          "SELECT formatDateTime(timestamp, '%Y-%m-%d') as date, count() as count FROM events WHERE event = '{EVENT_NAME}' AND timestamp > now() - INTERVAL 30 DAY GROUP BY date ORDER BY date",
      },
    }),

    requiredParams: [
      {
        name: "PROJECT_ID",
        label: "Project",
        description: "Select PostHog project",
        type: "dynamic-select",
        required: true,
        placeholder: "Select a project",
        dynamicConfig: {
          endpoint: "/api/projects/",
          method: "GET",
        },
      },
      {
        name: "EVENT_NAME",
        label: "Event",
        description: "Select event to track",
        type: "dynamic-select",
        required: true,
        placeholder: "Select an event",
        dynamicConfig: {
          endpoint: "/api/projects/{PROJECT_ID}/event_definitions/",
          method: "GET",
          dependsOn: "PROJECT_ID",
        },
      },
    ],
  },

  {
    templateId: "posthog-active-users",
    label: "Active Users",
    description: "Count of active users in a project",
    integrationId: "posthog",
    metricType: "number",
    defaultUnit: "users",

    metricEndpoint: "/api/projects/{PROJECT_ID}/persons/",

    requiredParams: [
      {
        name: "PROJECT_ID",
        label: "Project",
        description: "Select PostHog project",
        type: "dynamic-select",
        required: true,
        placeholder: "Select a project",
        dynamicConfig: {
          endpoint: "/api/projects/",
          method: "GET",
        },
      },
    ],
  },
];

// =============================================================================
// API Endpoints (for testing/debugging)
// =============================================================================

export const endpoints: Endpoint[] = [
  // ===== Projects =====
  {
    label: "List Projects",
    path: "/api/projects/",
    method: "GET",
    description: "List all projects accessible to the user",
  },
  {
    label: "Get Project Details",
    path: "/api/projects/{PROJECT_ID}/",
    method: "GET",
    description: "Get details of a specific project",
    requiresParams: true,
    params: ["PROJECT_ID"],
  },

  // ===== Events =====
  {
    label: "Get Event Definitions",
    path: "/api/projects/{PROJECT_ID}/event_definitions/",
    method: "GET",
    description: "List all event definitions (event types)",
    requiresParams: true,
    params: ["PROJECT_ID"],
  },

  // ===== Persons =====
  {
    label: "List Persons",
    path: "/api/projects/{PROJECT_ID}/persons/",
    method: "GET",
    description: "List persons (users) for a project",
    requiresParams: true,
    params: ["PROJECT_ID"],
  },

  // ===== Insights =====
  {
    label: "List Insights",
    path: "/api/projects/{PROJECT_ID}/insights/",
    method: "GET",
    description: "List saved insights for a project",
    requiresParams: true,
    params: ["PROJECT_ID"],
  },
  {
    label: "Get Insight Details",
    path: "/api/projects/{PROJECT_ID}/insights/{INSIGHT_ID}/",
    method: "GET",
    description: "Get details of a specific insight",
    requiresParams: true,
    params: ["PROJECT_ID", "INSIGHT_ID"],
  },

  // ===== Query API =====
  {
    label: "Query API - HogQL",
    path: "/api/projects/{PROJECT_ID}/query/",
    method: "POST",
    description: "Run HogQL query - auto-sends test query",
    requiresParams: true,
    params: ["PROJECT_ID"],
  },
];

export const exampleParams = {
  PROJECT_ID: "12345",
  INSIGHT_ID: "67890",
};

// =============================================================================
// Service Config (for api-test)
// =============================================================================

export const serviceConfig: ServiceConfig = {
  name,
  integrationId,
  baseUrl,
  endpoints,
  exampleParams,
};
