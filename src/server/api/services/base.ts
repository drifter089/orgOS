import { Nango } from "@nangohq/node";
import { TRPCError } from "@trpc/server";

import { env } from "@/env";

// =============================================================================
// Registries
// =============================================================================

import * as githubEndpoints from "./endpoints/github";
import * as googleSheetsEndpoints from "./endpoints/google-sheets";
import * as posthogEndpoints from "./endpoints/posthog";
import * as youtubeEndpoints from "./endpoints/youtube";
import * as githubTemplates from "./metric-templates/github";
import * as googleSheetsTemplates from "./metric-templates/google-sheets";
import * as posthogTemplates from "./metric-templates/posthog";
import * as youtubeTemplates from "./metric-templates/youtube";

// Types

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

export interface DropdownEndpoint {
  paramName: string;
  endpoint: string;
  method?: "GET" | "POST";
  body?: unknown;
  dependsOn?: string;
  transform: (data: unknown) => Array<{ label: string; value: string }>;
}

export interface MetricTemplate {
  templateId: string;
  label: string;
  description: string;
  integrationId: string;
  metricType: "percentage" | "number" | "duration" | "rate";
  defaultUnit?: string;

  // Dropdown endpoints to populate params
  dropdowns?: DropdownEndpoint[];

  // Preview endpoint (for Google Sheets)
  previewEndpoint?: string;

  // Final metric data endpoint
  metricEndpoint: string;
  method?: "GET" | "POST";
  requestBody?: unknown;

  // Data extraction
  dataPath: string;
  transform?: string;

  // User input params
  requiredParams: Array<{
    name: string;
    label: string;
    description: string;
    type: "text" | "number" | "select" | "dynamic-select";
    required: boolean;
    placeholder?: string;
    options?: Array<{ label: string; value: string }>;
    dynamicOptionsKey?: string;
    dependsOn?: string;
  }>;
}

// =============================================================================
// Function 1: fetchData - Universal Nango fetcher
// =============================================================================

interface FetchOptions {
  method?: "GET" | "POST" | "PUT" | "PATCH" | "DELETE";
  params?: Record<string, string>;
  body?: unknown;
}

export async function fetchData(
  integrationId: string,
  connectionId: string,
  endpoint: string,
  options?: FetchOptions,
) {
  if (!env.NANGO_SECRET_KEY_DEV) {
    throw new TRPCError({
      code: "INTERNAL_SERVER_ERROR",
      message: "Nango secret key not configured",
    });
  }

  // Replace {PARAM} placeholders in endpoint
  let finalEndpoint = endpoint;
  if (options?.params) {
    Object.entries(options.params).forEach(([key, value]) => {
      finalEndpoint = finalEndpoint.replace(`{${key}}`, value);
    });
  }

  // Replace params in body if it's a string template
  let finalBody = options?.body;
  if (typeof finalBody === "string" && options?.params) {
    Object.entries(options.params).forEach(([key, value]) => {
      finalBody = (finalBody as string).replace(
        new RegExp(`\\{${key}\\}`, "g"),
        value,
      );
    });
    try {
      finalBody = JSON.parse(finalBody);
    } catch {
      // Keep as string if not valid JSON
    }
  }

  const nango = new Nango({ secretKey: env.NANGO_SECRET_KEY_DEV });

  try {
    const response = await nango.proxy({
      connectionId,
      providerConfigKey: integrationId,
      endpoint: finalEndpoint,
      method: options?.method ?? "GET",
      ...(finalBody ? { data: finalBody } : {}),
    });

    return {
      data: response.data,
      status: response.status,
    };
  } catch (error) {
    console.error(`[${integrationId} API Fetch]`, error);
    throw new TRPCError({
      code: "INTERNAL_SERVER_ERROR",
      message:
        error instanceof Error
          ? error.message
          : `Failed to fetch from ${integrationId}`,
    });
  }
}

// =============================================================================
// Function 2: renderEndpoints - Get service endpoints for testing
// =============================================================================

export function renderEndpoints(integrationId: string): ServiceConfig {
  const service =
    getEndpointsRegistry()[
      integrationId as keyof ReturnType<typeof getEndpointsRegistry>
    ];
  if (!service) {
    throw new TRPCError({
      code: "NOT_FOUND",
      message: `No endpoints found for ${integrationId}`,
    });
  }
  return service;
}

export function getAllServices(): ServiceConfig[] {
  return Object.values(getEndpointsRegistry());
}

// =============================================================================
// Function 3: metricTemplate - Get template definition
// =============================================================================

export function getMetricTemplate(templateId: string): MetricTemplate {
  const allTemplates = getAllMetricTemplates();
  const template = allTemplates.find((t) => t.templateId === templateId);

  if (!template) {
    throw new TRPCError({
      code: "NOT_FOUND",
      message: `Template not found: ${templateId}`,
    });
  }

  return template;
}

export function getAllMetricTemplates(): MetricTemplate[] {
  return Object.values(getTemplatesRegistry()).flat();
}

export function getTemplatesByIntegration(
  integrationId: string,
): MetricTemplate[] {
  return (
    getTemplatesRegistry()[
      integrationId as keyof ReturnType<typeof getTemplatesRegistry>
    ] ?? []
  );
}

// =============================================================================

// =============================================================================

function getEndpointsRegistry() {
  return {
    github: githubEndpoints.serviceConfig,
    "google-sheet": googleSheetsEndpoints.serviceConfig,
    posthog: posthogEndpoints.serviceConfig,
    youtube: youtubeEndpoints.serviceConfig,
  };
}

function getTemplatesRegistry() {
  return {
    github: githubTemplates.templates,
    "google-sheet": googleSheetsTemplates.templates,
    posthog: posthogTemplates.templates,
    youtube: youtubeTemplates.templates,
  };
}
