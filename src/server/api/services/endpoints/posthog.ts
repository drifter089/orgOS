import type { Endpoint, ServiceConfig } from "@/lib/metrics/types";

export const name = "PostHog";
export const integrationId = "posthog";
export const baseUrl = "https://app.posthog.com";

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

export const serviceConfig: ServiceConfig = {
  name,
  integrationId,
  baseUrl,
  endpoints,
  exampleParams,
};
