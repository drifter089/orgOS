/**
 * PostHog API Endpoint Definitions
 * Base URL handled by Nango proxy
 * Requires Project ID for insights and events
 */
/**
 * Fetch data from PostHog API using Nango proxy
 */
import { Nango } from "@nangohq/node";
import { TRPCError } from "@trpc/server";

import { env } from "@/env";

import type { ServiceEndpoint } from "./github";

export const posthogEndpoints: ServiceEndpoint[] = [
  {
    label: "List Projects",
    path: "/api/projects/",
    method: "GET",
    description: "List all projects accessible to the authenticated user",
  },
  {
    label: "Get Project Insights",
    path: "/api/projects/{PROJECT_ID}/insights/",
    method: "GET",
    description: "Get insights for a specific project",
    requiresParams: true,
    params: ["PROJECT_ID"],
  },
  {
    label: "Get Project Events",
    path: "/api/projects/{PROJECT_ID}/events/",
    method: "GET",
    description: "Get events for a specific project",
    requiresParams: true,
    params: ["PROJECT_ID"],
  },
  {
    label: "Get Project Persons",
    path: "/api/projects/{PROJECT_ID}/persons/",
    method: "GET",
    description: "Get persons (users) for a specific project",
    requiresParams: true,
    params: ["PROJECT_ID"],
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
