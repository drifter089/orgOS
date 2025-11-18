/**
 * PostHog API Endpoint Definitions
 * Base URL handled by Nango proxy
 * Requires Project ID for most endpoints
 *
 * IMPORTANT - Query API (POST /api/projects/{PROJECT_ID}/query/):
 * The Query API is the recommended way to fetch analytics data.
 * It supports multiple query types via POST requests with JSON body:
 *
 * DEFAULT TEST QUERY (automatically sent when testing Query API endpoints):
 * {
 *   "query": {
 *     "kind": "HogQLQuery",
 *     "query": "SELECT event, count() as count FROM events WHERE timestamp > now() - INTERVAL 7 DAY GROUP BY event ORDER BY count DESC LIMIT 10"
 *   }
 * }
 * This returns the top 10 events from the last 7 days.
 *
 * Example HogQL Query (for time-series data):
 * {
 *   "query": {
 *     "kind": "HogQLQuery",
 *     "query": "SELECT formatDateTime(timestamp,'%Y-%m-%d') as date, count() as count FROM events WHERE event='pageview' AND timestamp > now() - INTERVAL 30 DAY GROUP BY date ORDER BY date"
 *   }
 * }
 *
 * Example Trends Query:
 * {
 *   "query": {
 *     "kind": "TrendsQuery",
 *     "series": [{"event": "pageview"}],
 *     "trendsFilter": {"display": "ActionsLineGraph"},
 *     "dateRange": {"date_from": "-30d"}
 *   }
 * }
 *
 * Example Events Query:
 * {
 *   "query": {
 *     "kind": "EventsQuery",
 *     "select": ["*"],
 *     "limit": 100
 *   }
 * }
 *
 * Rate Limits: 240/min, 1200/hour for analytics endpoints
 * Default row limit: 100 (max 50k with LIMIT clause)
 */
/**
 * Fetch data from PostHog API using Nango proxy
 */
import { Nango } from "@nangohq/node";
import { TRPCError } from "@trpc/server";

import { env } from "@/env";

import type { ServiceEndpoint } from "./github";

/**
 * Generic endpoint patterns for metric templates
 * Used by metric system to create dynamic metrics
 */
export const posthogMetricEndpoints = {
  PROJECT_EVENTS: "/api/projects/{PROJECT_ID}/events",
  PROJECT_PERSONS: "/api/projects/{PROJECT_ID}/persons",
  PROJECTS_LIST: "/api/projects/",
  // Query API endpoints (POST)
  QUERY_API: "/api/projects/{PROJECT_ID}/query/",
  // Insights endpoints
  INSIGHTS_LIST: "/api/projects/{PROJECT_ID}/insights/",
  INSIGHT_DETAIL: "/api/projects/{PROJECT_ID}/insights/{INSIGHT_ID}/",
} as const;

/**
 * Test endpoints for API testing page
 * These are example endpoints users can test manually
 */
export const posthogEndpoints: ServiceEndpoint[] = [
  // ===== Projects =====
  {
    label: "List Projects",
    path: "/api/projects/",
    method: "GET",
    description: "List all projects accessible to the authenticated user",
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
    label: "List Events (Deprecated - Use Query API)",
    path: "/api/projects/{PROJECT_ID}/events/",
    method: "GET",
    description:
      "⚠️ DEPRECATED: Use Query API instead. List events for backwards compatibility only",
    requiresParams: true,
    params: ["PROJECT_ID"],
  },
  {
    label: "Get Event Definitions",
    path: "/api/projects/{PROJECT_ID}/event_definitions/",
    method: "GET",
    description: "List all event definitions (event types) in the project",
    requiresParams: true,
    params: ["PROJECT_ID"],
  },
  {
    label: "Get Event Properties",
    path: "/api/projects/{PROJECT_ID}/property_definitions/",
    method: "GET",
    description: "List all property definitions used in events",
    requiresParams: true,
    params: ["PROJECT_ID"],
  },
  {
    label: "List Event Names",
    path: "/api/projects/{PROJECT_ID}/event_names/",
    method: "GET",
    description:
      "Get list of all unique event names - useful for creating queries",
    requiresParams: true,
    params: ["PROJECT_ID"],
  },
  {
    label: "List Property Names",
    path: "/api/projects/{PROJECT_ID}/property_names/",
    method: "GET",
    description: "Get all property names used in events",
    requiresParams: true,
    params: ["PROJECT_ID"],
  },

  // ===== Persons (Users) =====
  {
    label: "List Persons",
    path: "/api/projects/{PROJECT_ID}/persons/",
    method: "GET",
    description: "List persons (users) for a project",
    requiresParams: true,
    params: ["PROJECT_ID"],
  },
  {
    label: "Get Person Details",
    path: "/api/projects/{PROJECT_ID}/persons/{PERSON_ID}/",
    method: "GET",
    description: "Get details of a specific person",
    requiresParams: true,
    params: ["PROJECT_ID", "PERSON_ID"],
  },

  // ===== Insights & Analytics =====
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

  // ===== Query API (NEW - Recommended for Analytics) =====
  {
    label: "Query API - HogQL (SQL Queries)",
    path: "/api/projects/{PROJECT_ID}/query/",
    method: "POST",
    description:
      "✅ TEST READY: Runs example HogQL query - top 10 events from last 7 days",
    requiresParams: true,
    params: ["PROJECT_ID"],
  },
  {
    label: "Query API - Events Query",
    path: "/api/projects/{PROJECT_ID}/query/",
    method: "POST",
    description:
      "✅ TEST READY: Query raw events data - uses default HogQL query",
    requiresParams: true,
    params: ["PROJECT_ID"],
  },
  {
    label: "Query API - Trends Query",
    path: "/api/projects/{PROJECT_ID}/query/",
    method: "POST",
    description:
      "✅ TEST READY: Time-series trend analysis - uses HogQL for testing",
    requiresParams: true,
    params: ["PROJECT_ID"],
  },
  {
    label: "Query API - Funnels Query",
    path: "/api/projects/{PROJECT_ID}/query/",
    method: "POST",
    description:
      "✅ TEST READY: Funnel conversion analysis - uses HogQL for testing",
    requiresParams: true,
    params: ["PROJECT_ID"],
  },
  {
    label: "Query API - Retention Query",
    path: "/api/projects/{PROJECT_ID}/query/",
    method: "POST",
    description:
      "✅ TEST READY: User retention analysis - uses HogQL for testing",
    requiresParams: true,
    params: ["PROJECT_ID"],
  },
  {
    label: "Query API - Paths Query",
    path: "/api/projects/{PROJECT_ID}/query/",
    method: "POST",
    description:
      "✅ TEST READY: User journey path analysis - uses HogQL for testing",
    requiresParams: true,
    params: ["PROJECT_ID"],
  },
  {
    label: "Query API - Lifecycle Query",
    path: "/api/projects/{PROJECT_ID}/query/",
    method: "POST",
    description:
      "✅ TEST READY: User lifecycle analysis - uses HogQL for testing",
    requiresParams: true,
    params: ["PROJECT_ID"],
  },
  {
    label: "Query API - Stickiness Query",
    path: "/api/projects/{PROJECT_ID}/query/",
    method: "POST",
    description:
      "✅ TEST READY: User stickiness analysis - uses HogQL for testing",
    requiresParams: true,
    params: ["PROJECT_ID"],
  },
  {
    label: "Get Query Status (Async)",
    path: "/api/projects/{PROJECT_ID}/query/{QUERY_ID}/",
    method: "GET",
    description: "Poll async query results - useful for long-running queries",
    requiresParams: true,
    params: ["PROJECT_ID", "QUERY_ID"],
  },

  // ===== Feature Flags =====
  {
    label: "List Feature Flags",
    path: "/api/projects/{PROJECT_ID}/feature_flags/",
    method: "GET",
    description: "List all feature flags for a project",
    requiresParams: true,
    params: ["PROJECT_ID"],
  },
  {
    label: "Get Feature Flag Details",
    path: "/api/projects/{PROJECT_ID}/feature_flags/{FLAG_ID}/",
    method: "GET",
    description: "Get details of a specific feature flag",
    requiresParams: true,
    params: ["PROJECT_ID", "FLAG_ID"],
  },

  // ===== Cohorts =====
  {
    label: "List Cohorts",
    path: "/api/projects/{PROJECT_ID}/cohorts/",
    method: "GET",
    description: "List all cohorts (user segments) for a project",
    requiresParams: true,
    params: ["PROJECT_ID"],
  },
  {
    label: "Get Cohort Details",
    path: "/api/projects/{PROJECT_ID}/cohorts/{COHORT_ID}/",
    method: "GET",
    description: "Get details of a specific cohort",
    requiresParams: true,
    params: ["PROJECT_ID", "COHORT_ID"],
  },
  {
    label: "Get Cohort Persons",
    path: "/api/projects/{PROJECT_ID}/cohorts/{COHORT_ID}/persons/",
    method: "GET",
    description: "List all persons in a cohort",
    requiresParams: true,
    params: ["PROJECT_ID", "COHORT_ID"],
  },

  // ===== Dashboards =====
  {
    label: "List Dashboards",
    path: "/api/projects/{PROJECT_ID}/dashboards/",
    method: "GET",
    description: "List all dashboards for a project",
    requiresParams: true,
    params: ["PROJECT_ID"],
  },
  {
    label: "Get Dashboard Details",
    path: "/api/projects/{PROJECT_ID}/dashboards/{DASHBOARD_ID}/",
    method: "GET",
    description: "Get details of a specific dashboard",
    requiresParams: true,
    params: ["PROJECT_ID", "DASHBOARD_ID"],
  },

  // ===== Experiments =====
  {
    label: "List Experiments",
    path: "/api/projects/{PROJECT_ID}/experiments/",
    method: "GET",
    description: "List all A/B testing experiments for a project",
    requiresParams: true,
    params: ["PROJECT_ID"],
  },
  {
    label: "Get Experiment Details",
    path: "/api/projects/{PROJECT_ID}/experiments/{EXPERIMENT_ID}/",
    method: "GET",
    description: "Get details of a specific experiment",
    requiresParams: true,
    params: ["PROJECT_ID", "EXPERIMENT_ID"],
  },

  // ===== Session Recordings =====
  {
    label: "List Session Recordings",
    path: "/api/projects/{PROJECT_ID}/session_recordings/",
    method: "GET",
    description: "List session recordings for a project",
    requiresParams: true,
    params: ["PROJECT_ID"],
  },
  {
    label: "Get Recording Details",
    path: "/api/projects/{PROJECT_ID}/session_recordings/{RECORDING_ID}/",
    method: "GET",
    description: "Get details of a specific session recording",
    requiresParams: true,
    params: ["PROJECT_ID", "RECORDING_ID"],
  },

  // ===== Annotations =====
  {
    label: "List Annotations",
    path: "/api/projects/{PROJECT_ID}/annotations/",
    method: "GET",
    description: "List all annotations (important events) for a project",
    requiresParams: true,
    params: ["PROJECT_ID"],
  },

  // ===== Actions =====
  {
    label: "List Actions",
    path: "/api/projects/{PROJECT_ID}/actions/",
    method: "GET",
    description: "List all actions (grouped events) for a project",
    requiresParams: true,
    params: ["PROJECT_ID"],
  },
  {
    label: "Get Action Details",
    path: "/api/projects/{PROJECT_ID}/actions/{ACTION_ID}/",
    method: "GET",
    description: "Get details of a specific action",
    requiresParams: true,
    params: ["PROJECT_ID", "ACTION_ID"],
  },
];

export const posthogServiceConfig = {
  name: "PostHog",
  integrationId: "posthog",
  endpoints: posthogEndpoints,
  baseUrl: "https://app.posthog.com",
  exampleParams: {
    PROJECT_ID: "12345",
  },
};

export async function fetchPostHogData(
  connectionId: string,
  endpoint: string,
  params?: Record<string, string>,
  method: "GET" | "POST" | "PUT" | "PATCH" | "DELETE" = "GET",
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  body?: any,
) {
  if (!env.NANGO_SECRET_KEY_DEV) {
    throw new TRPCError({
      code: "INTERNAL_SERVER_ERROR",
      message: "Nango secret key not configured",
    });
  }

  // Replace parameter placeholders with actual values
  let finalEndpoint = endpoint;
  if (params) {
    Object.entries(params).forEach(([key, value]) => {
      finalEndpoint = finalEndpoint.replace(`{${key}}`, value);
    });
  }

  const nango = new Nango({ secretKey: env.NANGO_SECRET_KEY_DEV });

  try {
    const response = await nango.proxy({
      connectionId,
      providerConfigKey: "posthog",
      endpoint: finalEndpoint,
      method,
      ...(body && method !== "GET" ? { data: body } : {}),
    });

    return {
      data: response.data,
      status: response.status,
    };
  } catch (error) {
    console.error("[PostHog API Fetch]", error);
    throw new TRPCError({
      code: "INTERNAL_SERVER_ERROR",
      message:
        error instanceof Error
          ? error.message
          : "Failed to fetch data from PostHog",
    });
  }
}
