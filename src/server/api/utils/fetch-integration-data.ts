import { TRPCError } from "@trpc/server";

import { fetchGitHubData } from "@/server/api/services/github";
import { fetchGoogleSheetsData } from "@/server/api/services/google-sheets";
import { fetchPostHogData } from "@/server/api/services/posthog";
import { fetchYouTubeData } from "@/server/api/services/youtube";

type HttpMethod = "GET" | "POST" | "PUT" | "PATCH" | "DELETE";

export interface FetchIntegrationDataOptions {
  connectionId: string;
  integrationId: string;
  endpoint: string;
  params?: Record<string, string>;
  method?: HttpMethod;
  requestBodyTemplate?: string;
  /** Direct request body (takes precedence over requestBodyTemplate) */
  requestBody?: unknown;
}

export interface FetchIntegrationDataResult {
  data: unknown;
  status?: number;
}

/**
 * Unified function to fetch data from any supported integration
 * Consolidates duplicated switch statements across metric.ts and dashboard.ts
 */
export async function fetchIntegrationData(
  options: FetchIntegrationDataOptions,
): Promise<FetchIntegrationDataResult> {
  const {
    connectionId,
    integrationId,
    endpoint,
    params = {},
    method = "GET",
    requestBodyTemplate,
    requestBody: directRequestBody,
  } = options;

  switch (integrationId) {
    case "github":
      return fetchGitHubData(connectionId, endpoint, method);

    case "google-sheet":
      return fetchGoogleSheetsData(connectionId, endpoint, params, method);

    case "posthog": {
      // Use direct request body if provided, otherwise build from template
      let requestBody: unknown = directRequestBody;
      if (!requestBody && requestBodyTemplate && method === "POST") {
        let bodyString = requestBodyTemplate;
        // Replace parameter placeholders in body
        Object.entries(params).forEach(([key, value]) => {
          bodyString = bodyString.replace(
            new RegExp(`\\{${key}\\}`, "g"),
            value,
          );
        });
        try {
          requestBody = JSON.parse(bodyString);
        } catch {
          throw new TRPCError({
            code: "INTERNAL_SERVER_ERROR",
            message: "Failed to parse request body template",
          });
        }
      }

      return fetchPostHogData(
        connectionId,
        endpoint,
        params,
        method,
        requestBody,
      );
    }

    case "youtube":
      return fetchYouTubeData(connectionId, endpoint, params, method);

    default:
      throw new TRPCError({
        code: "BAD_REQUEST",
        message: `Unsupported integration: ${integrationId}`,
      });
  }
}

/**
 * Build endpoint by replacing path parameters
 */
export function buildEndpointWithParams(
  endpoint: string,
  params: Record<string, string>,
): string {
  let result = endpoint;
  Object.entries(params).forEach(([key, value]) => {
    result = result.replace(`{${key}}`, value);
  });
  return result;
}
