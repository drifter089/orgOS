import type { MetricTemplate } from "../base";

export const templates: MetricTemplate[] = [
  {
    templateId: "posthog-event-count",
    label: "Event Count (Time Series)",
    description: "Count occurrences of a specific event over time",
    integrationId: "posthog",
    metricType: "number",
    defaultUnit: "events",

    dropdowns: [
      {
        paramName: "PROJECT_ID",
        endpoint: "/api/projects",
        transform: (data: unknown) =>
          (
            data as { results?: Array<{ name: string; id: number }> }
          ).results?.map((p) => ({
            label: p.name,
            value: p.id.toString(),
          })) ?? [],
      },
      {
        paramName: "EVENT_NAME",
        endpoint: "/api/projects/{PROJECT_ID}/event_definitions",
        dependsOn: "PROJECT_ID",
        transform: (data: unknown) =>
          (data as { results?: Array<{ name: string }> }).results?.map((e) => ({
            label: e.name,
            value: e.name,
          })) ?? [],
      },
    ],

    metricEndpoint: "/api/projects/{PROJECT_ID}/query/",
    method: "POST",
    requestBody: JSON.stringify({
      query: {
        kind: "HogQLQuery",
        query:
          "SELECT formatDateTime(timestamp, '%Y-%m-%d') as date, count() as count FROM events WHERE event = '{EVENT_NAME}' AND timestamp > now() - INTERVAL 30 DAY GROUP BY date ORDER BY date",
      },
    }),
    dataPath: "results",
    transform: "extractHogQLResults",

    requiredParams: [
      {
        name: "PROJECT_ID",
        label: "Project",
        description: "Select PostHog project",
        type: "dynamic-select",
        required: true,
        dynamicOptionsKey: "PROJECT_ID",
      },
      {
        name: "EVENT_NAME",
        label: "Event",
        description: "Select event to track",
        type: "dynamic-select",
        required: true,
        dynamicOptionsKey: "EVENT_NAME",
        dependsOn: "PROJECT_ID",
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

    dropdowns: [
      {
        paramName: "PROJECT_ID",
        endpoint: "/api/projects",
        transform: (data: unknown) =>
          (
            data as { results?: Array<{ name: string; id: number }> }
          ).results?.map((p) => ({
            label: p.name,
            value: p.id.toString(),
          })) ?? [],
      },
    ],

    metricEndpoint: "/api/projects/{PROJECT_ID}/persons/",
    dataPath: "count",

    requiredParams: [
      {
        name: "PROJECT_ID",
        label: "Project",
        description: "Select PostHog project",
        type: "dynamic-select",
        required: true,
        dynamicOptionsKey: "PROJECT_ID",
      },
    ],
  },
];
