"use client";

import { useCallback, useEffect, useRef } from "react";

import type { MetricTemplate } from "@/lib/metrics/types";
import type { ChartTransformResult } from "@/server/api/services/chart-tools/types";
import {
  createTransformKey,
  useMetricTransformStore,
} from "@/stores/metric-transform-store";
import { api } from "@/trpc/react";

interface UseApiToChartTransformerParams {
  connectionId: string;
  integrationId: string;
  template: MetricTemplate | null;
  endpointParams: Record<string, string>;
  metricName: string;
  metricDescription?: string;
  enabled: boolean;
}

/**
 * Build the final endpoint URL by replacing {PARAM} placeholders
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
 * Build the request body by replacing {PARAM} placeholders in stringified JSON
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
 * Unified hook for fetching data and transforming with AI.
 * Manages state via Zustand store for parallel support and clean reset.
 *
 * Usage:
 * - Starts fetching when enabled and all params filled
 * - Auto-triggers AI transform when raw data is ready
 * - Call reset() on dropdown changes or dialog close
 */
export function useApiToChartTransformer({
  connectionId,
  integrationId,
  template,
  endpointParams,
  metricName,
  metricDescription,
  enabled,
}: UseApiToChartTransformerParams) {
  const store = useMetricTransformStore();
  const transformMutation = api.dashboard.transformChartWithAI.useMutation();
  const hasTriggeredRef = useRef<string | null>(null);

  // Create stable key
  const transformKey =
    template && connectionId
      ? createTransformKey({
          connectionId,
          templateId: template.templateId,
          endpointParams,
        })
      : null;

  // Get current transform state from store
  const transform = transformKey ? store.getTransform(transformKey) : undefined;

  // Build endpoint
  const finalEndpoint = template
    ? buildEndpoint(template.metricEndpoint, endpointParams)
    : "";
  const finalBody = template
    ? buildRequestBody(template.requestBody, endpointParams)
    : undefined;

  // Check if all required params are filled
  const allParamsFilled =
    template?.requiredParams.every((p) => {
      const value = endpointParams[p.name];
      return value !== undefined && value !== "";
    }) ?? false;

  // Fetch raw data query
  const rawDataQuery = api.metric.fetchIntegrationData.useQuery(
    {
      connectionId,
      integrationId,
      endpoint: finalEndpoint,
      method: template?.method ?? "GET",
      body: finalBody,
    },
    {
      enabled:
        enabled &&
        allParamsFilled &&
        !!template &&
        !!connectionId &&
        !!transformKey,
      staleTime: 5 * 60 * 1000, // 5 minutes
      retry: 1,
    },
  );

  // Update store when fetching starts
  useEffect(() => {
    if (!transformKey) return;

    if (rawDataQuery.isLoading && !transform) {
      store.startFetch(transformKey);
    }
  }, [rawDataQuery.isLoading, transformKey, transform, store]);

  // Update store when raw data arrives
  useEffect(() => {
    if (!transformKey) return;

    if (rawDataQuery.data?.data && transform?.status === "fetching") {
      store.setRawData(transformKey, rawDataQuery.data.data);
    } else if (rawDataQuery.error && transform?.status === "fetching") {
      store.setError(transformKey, rawDataQuery.error.message);
    }
  }, [
    rawDataQuery.data,
    rawDataQuery.error,
    transformKey,
    transform?.status,
    store,
  ]);

  // Auto-trigger AI transform when raw data is ready
  useEffect(() => {
    if (
      !transformKey ||
      !template ||
      !metricName ||
      hasTriggeredRef.current === transformKey
    ) {
      return;
    }

    const entry = store.getTransform(transformKey);
    if (
      entry?.status !== "ready" ||
      !entry.rawData ||
      entry.chartData ||
      transformMutation.isPending
    ) {
      return;
    }

    hasTriggeredRef.current = transformKey;
    store.startTransform(transformKey);

    transformMutation.mutate(
      {
        metricConfig: {
          name: metricName,
          description: metricDescription,
          metricTemplate: template.templateId,
          endpointConfig: endpointParams,
        },
        rawData: entry.rawData,
      },
      {
        onSuccess: (result) => {
          store.setChartData(transformKey, result);
        },
        onError: (err) => {
          store.setError(transformKey, err.message);
        },
      },
    );
  }, [
    transformKey,
    template,
    metricName,
    metricDescription,
    endpointParams,
    transform?.status,
    transform?.rawData,
    transform?.chartData,
    transformMutation,
    store,
  ]);

  // Reset function for dropdown changes or dialog close
  const reset = useCallback(() => {
    if (transformKey) {
      store.reset(transformKey);
      hasTriggeredRef.current = null;
    }
  }, [transformKey, store]);

  return {
    status: transform?.status ?? "idle",
    rawData: transform?.rawData ?? null,
    chartData: transform?.chartData ?? null,
    error: transform?.error ?? null,
    reset,
    transformKey,
    isLoading: rawDataQuery.isLoading,
    isTransforming: transformMutation.isPending,
  };
}
