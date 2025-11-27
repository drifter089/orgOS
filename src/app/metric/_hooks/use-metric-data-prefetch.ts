"use client";

import { useEffect, useRef } from "react";

import type { MetricTemplate } from "@/lib/metrics/types";
import { api } from "@/trpc/react";

export type PrefetchStatus = "idle" | "fetching" | "ready" | "error";

export interface PrefetchState {
  status: PrefetchStatus;
  data: unknown;
  error: string | null;
}

interface UseMetricDataPrefetchParams {
  connectionId: string;
  integrationId: string;
  template: MetricTemplate | null;
  endpointParams: Record<string, string>;
  enabled: boolean;
}

/**
 * Builds the final endpoint URL by replacing {PARAM} placeholders
 */
function buildEndpoint(
  templateEndpoint: string,
  params: Record<string, string>,
): string {
  let endpoint = templateEndpoint;
  Object.entries(params).forEach(([key, value]) => {
    endpoint = endpoint.replace(`{${key}}`, encodeURIComponent(value));
  });
  return endpoint;
}

/**
 * Builds the request body by replacing {PARAM} placeholders in stringified JSON
 */
function buildRequestBody(
  templateBody: unknown,
  params: Record<string, string>,
): unknown {
  if (!templateBody) return undefined;

  let bodyStr =
    typeof templateBody === "string"
      ? templateBody
      : JSON.stringify(templateBody);

  Object.entries(params).forEach(([key, value]) => {
    bodyStr = bodyStr.replace(new RegExp(`\\{${key}\\}`, "g"), value);
  });

  try {
    return JSON.parse(bodyStr);
  } catch {
    return bodyStr;
  }
}

/**
 * Hook for pre-fetching metric data while user configures options
 *
 * Features:
 * - Starts fetching when all required params are filled
 * - Automatically cancels on param changes (re-fetches with new params)
 * - Cancels on unmount or when disabled
 * - Uses TanStack Query caching
 */
export function useMetricDataPrefetch({
  connectionId,
  integrationId,
  template,
  endpointParams,
  enabled,
}: UseMetricDataPrefetchParams): PrefetchState & { refetch: () => void } {
  const previousParamsRef = useRef<string>("");

  // Check if all required params are filled
  const allParamsFilled =
    template?.requiredParams.every((p) => {
      const value = endpointParams[p.name];
      return value !== undefined && value !== "";
    }) ?? false;

  // Build final endpoint and body
  const finalEndpoint = template
    ? buildEndpoint(template.metricEndpoint, endpointParams)
    : "";
  const finalBody = template
    ? buildRequestBody(template.requestBody, endpointParams)
    : undefined;

  // Create a stable key for the params to detect changes
  const paramsKey = JSON.stringify({
    connectionId,
    integrationId,
    endpoint: finalEndpoint,
    body: finalBody,
  });

  // Use TanStack Query for caching
  const query = api.metric.fetchIntegrationData.useQuery(
    {
      connectionId,
      integrationId,
      endpoint: finalEndpoint,
      method: template?.method ?? "GET",
      body: finalBody,
    },
    {
      enabled: enabled && allParamsFilled && !!template && !!connectionId,
      staleTime: 5 * 60 * 1000, // 5 minutes
      retry: 1,
    },
  );

  // Track param changes for cancellation logic
  useEffect(() => {
    if (paramsKey !== previousParamsRef.current) {
      previousParamsRef.current = paramsKey;
      // Query will automatically refetch due to key change
    }
  }, [paramsKey]);

  // Map query state to PrefetchState
  const status: PrefetchStatus = !enabled
    ? "idle"
    : !allParamsFilled
      ? "idle"
      : query.isLoading || query.isFetching
        ? "fetching"
        : query.isError
          ? "error"
          : query.isSuccess
            ? "ready"
            : "idle";

  return {
    status,
    data: query.data?.data ?? null,
    error: query.error?.message ?? null,
    refetch: () => void query.refetch(),
  };
}
