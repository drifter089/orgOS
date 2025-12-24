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
  /** Whether the dashboard charts query is currently fetching */
  isFetching?: boolean;
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
  isFetching = false,
}: DashboardClientProps) {
  const utils = api.useUtils();

  // Get initial processing IDs from server data (props)
  const serverProcessingIds = useMemo(
    () =>
      new Set(
        dashboardCharts
          .filter((dc) => !!dc.metric.refreshStatus)
          .map((dc) => dc.metric.id),
      ),
    [dashboardCharts],
  );

  // Single centralized poll for ALL processing metrics
  // Uses server data as initial list, batchProgress refines it
  const { data: batchProgress } = api.pipeline.getBatchProgress.useQuery(
    { metricIds: Array.from(serverProcessingIds) },
    {
      enabled: serverProcessingIds.size > 0,
      refetchInterval: serverProcessingIds.size > 0 ? 1000 : false,
    },
  );

  // Track previous processing state for completion detection
  const prevProcessingRef = useRef<Set<string>>(new Set());

  // Detect completions and errors, then invalidate
  useEffect(() => {
    if (!batchProgress) return;

    const justCompleted: string[] = [];
    const justFailed: Array<{ id: string; error: string }> = [];

    // Check each metric in batchProgress for completion
    for (const [metricId, status] of Object.entries(batchProgress)) {
      const wasProcessing = prevProcessingRef.current.has(metricId);

      if (wasProcessing && !status.isProcessing) {
        if (status.error) {
          justFailed.push({ id: metricId, error: status.error });
        } else {
          justCompleted.push(metricId);
        }
      }
    }

    // Show error toasts
    for (const { error } of justFailed) {
      toast.error("Pipeline failed", {
        description: error,
        duration: 10000,
      });
    }

    // Invalidate on completion (refetchInterval in parent will also catch this)
    if (justCompleted.length > 0 || justFailed.length > 0) {
      void utils.dashboard.getDashboardCharts.invalidate({ teamId });
    }

    // Update ref - track what batchProgress says is processing
    const nowProcessing = new Set<string>();
    for (const [metricId, status] of Object.entries(batchProgress)) {
      if (status.isProcessing) {
        nowProcessing.add(metricId);
      }
    }
    prevProcessingRef.current = nowProcessing;
  }, [batchProgress, teamId, utils]);

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
              isFetching={isFetching}
            />
          ))}
        </div>
      )}
    </div>
  );
}
