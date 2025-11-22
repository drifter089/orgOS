/**
 * PostHog metric template definitions
 * Co-locates all PostHog-specific metric configurations
 */
import type { MetricTemplate } from "@/lib/metrics/types";

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
