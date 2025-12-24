"use client";

import { useEffect, useMemo, useRef } from "react";

import { toast } from "sonner";

import type { RouterOutputs } from "@/trpc/react";
import { api } from "@/trpc/react";

import { DashboardMetricCard } from "./dashboard-metric-card";

type DashboardMetrics = RouterOutputs["dashboard"]["getDashboardCharts"];

/** Pipeline progress data for a single metric */
export interface PipelineProgressData {
  isProcessing: boolean;
  currentStep: string | null;
  error: string | null;
}

interface DashboardClientProps {
  teamId: string;
  dashboardCharts: DashboardMetrics;
}

/**
 * Dashboard client component with centralized polling.
 *
 * Key improvements:
 * - Receives data from parent (no duplicate query)
 * - Single batch poll for ALL processing metrics (not per-card)
 * - Targeted cache invalidation with teamId
 * - Clean completion detection without complex refs
 */
export function DashboardClient({
  teamId,
  dashboardCharts,
}: DashboardClientProps) {
  const utils = api.useUtils();

  // Find metrics currently processing (from server data - single source of truth)
  const processingMetricIds = useMemo(
    () =>
      dashboardCharts
        .filter((dc) => !!dc.metric.refreshStatus)
        .map((dc) => dc.metric.id),
    [dashboardCharts],
  );

  const hasProcessingMetrics = processingMetricIds.length > 0;

  // Single centralized poll for ALL processing metrics
  const { data: batchProgress } = api.pipeline.getBatchProgress.useQuery(
    { metricIds: processingMetricIds },
    {
      enabled: hasProcessingMetrics,
      refetchInterval: hasProcessingMetrics ? 1000 : false,
    },
  );

  // Track previous processing state for completion detection
  const prevProcessingRef = useRef<Set<string>>(new Set());

  // Detect completions and errors, then invalidate
  useEffect(() => {
    if (!batchProgress) return;

    const currentProcessing = new Set<string>();
    const completed: string[] = [];
    const failed: Array<{ id: string; error: string }> = [];

    // Check each metric that was previously processing
    for (const metricId of prevProcessingRef.current) {
      const status = batchProgress[metricId];

      if (status && !status.isProcessing) {
        // This metric just finished
        if (status.error) {
          failed.push({ id: metricId, error: status.error });
        } else {
          completed.push(metricId);
        }
      }
    }

    // Build current processing set
    for (const [metricId, status] of Object.entries(batchProgress)) {
      if (status.isProcessing) {
        currentProcessing.add(metricId);
      }
    }

    // Also add metrics that server says are processing but haven't been polled yet
    for (const metricId of processingMetricIds) {
      if (!batchProgress[metricId]) {
        currentProcessing.add(metricId);
      }
    }

    // Show error toasts
    for (const { error } of failed) {
      toast.error("Pipeline failed", {
        description: error,
        duration: 10000,
      });
    }

    // Invalidate if any completed (success or error)
    if (completed.length > 0 || failed.length > 0) {
      void utils.dashboard.getDashboardCharts.invalidate({ teamId });
    }

    // Update tracking ref
    prevProcessingRef.current = currentProcessing;
  }, [batchProgress, processingMetricIds, teamId, utils]);

  // Create lookup map for cards to access their pipeline status
  const pipelineStatusMap = useMemo(() => {
    const map = new Map<string, PipelineProgressData>();

    if (batchProgress) {
      for (const [metricId, status] of Object.entries(batchProgress)) {
        map.set(metricId, status);
      }
    }

    // For metrics that are processing but not yet in batch response,
    // derive status from server data
    for (const dc of dashboardCharts) {
      if (dc.metric.refreshStatus && !map.has(dc.metric.id)) {
        map.set(dc.metric.id, {
          isProcessing: true,
          currentStep: dc.metric.refreshStatus,
          error: null,
        });
      }
    }

    return map;
  }, [batchProgress, dashboardCharts]);

  return (
    <div className="space-y-6">
      {dashboardCharts.length > 0 && (
        <div>
          <p className="text-muted-foreground text-sm">
            {`Showing ${dashboardCharts.length} metric${dashboardCharts.length === 1 ? "" : "s"}`}
          </p>
        </div>
      )}

      {dashboardCharts.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-lg border-2 border-dashed py-16">
          <div className="space-y-2 text-center">
            <h3 className="text-lg font-semibold">No KPIs yet</h3>
            <p className="text-muted-foreground max-w-sm text-sm">
              Add KPIs from connected integrations using the sidebar to start
              tracking and visualizing your data
            </p>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
          {dashboardCharts.map((dashboardMetric) => (
            <DashboardMetricCard
              key={dashboardMetric.id}
              dashboardMetric={dashboardMetric}
              pipelineStatus={pipelineStatusMap.get(dashboardMetric.metric.id)}
              teamId={teamId}
            />
          ))}
        </div>
      )}
    </div>
  );
}
