"use client";

import { useCallback, useEffect, useState } from "react";

import type { Cadence } from "@prisma/client";
import { AlertCircle, Bug, Settings } from "lucide-react";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Drawer, DrawerContent, DrawerTrigger } from "@/components/ui/drawer";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  type PipelineStatus,
  isTempId,
  usePipelineOperations,
} from "@/hooks/use-pipeline-operations";
import { isDevMode } from "@/lib/dev-mode";
import type { ChartTransformResult } from "@/lib/metrics/transformer-types";
import { useConfirmation } from "@/providers/ConfirmationDialogProvider";
import type { RouterOutputs } from "@/trpc/react";
import { api } from "@/trpc/react";

import { DashboardMetricChart } from "./dashboard-metric-chart";
import { DashboardMetricDrawer } from "./dashboard-metric-drawer";

type DashboardChartData =
  RouterOutputs["dashboard"]["getDashboardCharts"][number];

// Re-export for components that import from here
export type {
  ChartType,
  ChartTransformResult,
} from "@/lib/metrics/transformer-types";

interface DashboardMetricCardProps {
  /** Metric ID - required to find data in TanStack Query cache */
  metricId: string;
  /** Team ID - required for cache query subscription */
  teamId: string;
  /** When true, hides settings drawer and dev tool button (for public views) */
  readOnly?: boolean;
}

/**
 * Dashboard metric card component.
 *
 * Architecture:
 * - Single query subscription to getDashboardCharts
 * - Uses usePipelineOperations for all mutations and status tracking
 * - Pipeline operations are awaited before polling starts (no race conditions)
 */
export function DashboardMetricCard({
  metricId,
  teamId,
  readOnly = false,
}: DashboardMetricCardProps) {
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const { confirm } = useConfirmation();

  // Single query subscription with select to prevent re-renders from other metrics
  const { data: dashboardChart } = api.dashboard.getDashboardCharts.useQuery(
    { teamId },
    {
      enabled: Boolean(teamId),
      select: (data) => data?.find((dc) => dc.metric.id === metricId),
    },
  );
  const metric = dashboardChart?.metric;

  // Pipeline operations hook
  const pipeline = usePipelineOperations({
    teamId,
    onComplete: useCallback(
      (result: { success: boolean; error: string | null }) => {
        if (result.success) {
          toast.success("Chart updated successfully");
        }
        // Error toasts are handled in the hook
      },
      [],
    ),
  });

  // Get current status
  const status: PipelineStatus = pipeline.getStatus(
    metricId,
    metric?.refreshStatus,
    metric?.lastError,
  );

  // Derived state
  const isOptimistic = isTempId(metricId);
  const isIntegrationMetric = !!metric?.integration?.providerId;
  const roles = metric?.roles ?? [];
  const chartTransform = dashboardChart?.chartConfig as unknown as
    | ChartTransformResult
    | null
    | undefined;
  const hasChartData = !!(
    chartTransform?.chartData && chartTransform.chartData.length > 0
  );
  const title = chartTransform?.title ?? metric?.name ?? "Loading...";
  const isPollingThisCard = pipeline.isPolling(metricId);

  // Auto-start polling for metrics that are already processing on mount
  // (e.g., from another session or cron job)
  useEffect(() => {
    if (
      metric?.refreshStatus &&
      !isOptimistic &&
      !pipeline.isPolling(metricId)
    ) {
      pipeline.startPolling(metricId);
    }
  }, [metric?.refreshStatus, metricId, isOptimistic, pipeline]);

  // ==========================================================================
  // Handlers
  // ==========================================================================

  const handleRefresh = useCallback(
    async (forceRebuild = false) => {
      if (!metric) return;

      try {
        if (!isIntegrationMetric) {
          // Manual metrics - always regenerate
          await pipeline.regenerate(metric.id);
          toast.success("Chart regeneration started");
          return;
        }

        if (!metric.templateId || !metric.integration) return;

        if (forceRebuild) {
          await pipeline.regenerate(metric.id);
          toast.success("Pipeline regeneration started");
        } else {
          await pipeline.refresh(metric.id);
          toast.success("Data refresh started");
        }
      } catch (error) {
        toast.error(
          forceRebuild ? "Pipeline regeneration failed" : "Refresh failed",
          {
            description:
              error instanceof Error ? error.message : "Unknown error",
          },
        );
      }
    },
    [metric, isIntegrationMetric, pipeline],
  );

  const handleDelete = useCallback(async () => {
    if (!metric) return;

    const confirmed = await confirm({
      title: "Delete metric",
      description: `Are you sure you want to delete "${metric.name}"? This action cannot be undone.`,
      confirmText: "Delete",
      variant: "destructive",
    });

    if (confirmed) {
      pipeline.delete.mutate({ id: metric.id });
      setIsDrawerOpen(false);
    }
  }, [metric, confirm, pipeline]);

  const handleUpdateMetric = useCallback(
    (name: string, description: string) => {
      if (!metric) return;
      pipeline.update.mutate({
        id: metric.id,
        name,
        description: description || undefined,
      });
    },
    [metric, pipeline],
  );

  const handleRegenerateChart = useCallback(
    async (chartType: string, cadence: Cadence, selectedDimension?: string) => {
      if (!metric) return;

      try {
        await pipeline.regenerateChart(metric.id, {
          chartType,
          cadence,
          selectedDimension,
        });
        toast.success("Chart regeneration started");
      } catch (error) {
        toast.error("Failed to regenerate chart", {
          description: error instanceof Error ? error.message : "Unknown error",
        });
      }
    },
    [metric, pipeline],
  );

  // ==========================================================================
  // Render
  // ==========================================================================

  // Loading state for missing data (temp card or loading)
  if (!dashboardChart || !metric) {
    return (
      <DashboardMetricChart
        title="Creating metric..."
        chartTransform={null}
        hasChartData={false}
        isIntegrationMetric={false}
        isOptimistic={true}
        roles={[]}
        goal={null}
        goalProgress={null}
        valueLabel={null}
        isProcessing={true}
        processingStep="creating-metric"
        isFetching={false}
      />
    );
  }

  const cardContent = (
    <div className="relative">
      {status.hasError && !status.isProcessing && (
        <Tooltip>
          <TooltipTrigger asChild>
            <Badge
              variant="destructive"
              className="absolute top-4 left-3 z-10 h-6 gap-1 px-2"
            >
              <AlertCircle className="h-3 w-3" />
              <span className="text-xs">Error</span>
            </Badge>
          </TooltipTrigger>
          <TooltipContent side="bottom" className="max-w-[300px]">
            <p className="text-sm">{status.lastError}</p>
          </TooltipContent>
        </Tooltip>
      )}

      {!readOnly && (
        <DrawerTrigger asChild>
          <Button
            variant="ghost"
            size="icon"
            className="absolute top-2 right-2 z-10 h-7 w-7"
          >
            <Settings className="h-4 w-4" />
          </Button>
        </DrawerTrigger>
      )}

      {!readOnly && isDevMode() && (
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="ghost"
              size="sm"
              className="text-muted-foreground absolute top-0 left-0 z-10 h-7 w-7 p-0 hover:text-amber-600"
              onClick={() => {
                window.open(`/dev-metric-tool/${metric.id}`, "_blank");
              }}
            >
              <Bug className="h-3.5 w-3.5" />
            </Button>
          </TooltipTrigger>
          <TooltipContent side="right">
            <p className="text-xs">Open Pipeline Debug Tool</p>
          </TooltipContent>
        </Tooltip>
      )}

      <DashboardMetricChart
        title={title}
        chartTransform={chartTransform ?? null}
        hasChartData={hasChartData}
        isIntegrationMetric={isIntegrationMetric}
        isOptimistic={isOptimistic}
        integrationId={metric.integration?.providerId}
        roles={roles}
        goal={metric.goal}
        goalProgress={dashboardChart.goalProgress}
        valueLabel={dashboardChart.valueLabel}
        isProcessing={status.isProcessing}
        processingStep={status.processingStep}
        isFetching={isPollingThisCard}
      />
    </div>
  );

  if (readOnly) {
    return cardContent;
  }

  return (
    <Drawer open={isDrawerOpen} onOpenChange={setIsDrawerOpen}>
      {cardContent}

      <DrawerContent className="flex h-[96vh] max-h-[96vh] flex-col">
        <div className="mx-auto min-h-0 w-full flex-1">
          <DashboardMetricDrawer
            dashboardChart={dashboardChart}
            status={status}
            isPolling={isPollingThisCard}
            isDeleting={pipeline.isDeleting}
            onRefresh={handleRefresh}
            onUpdateMetric={handleUpdateMetric}
            onDelete={handleDelete}
            onClose={() => setIsDrawerOpen(false)}
            onRegenerateChart={handleRegenerateChart}
          />
        </div>
      </DrawerContent>
    </Drawer>
  );
}

// =============================================================================
// Read-Only Card Variant (for public views with dataOverride)
// =============================================================================

/**
 * Read-only metric card for public views.
 * No mutations, no polling, just displays data.
 */
export function ReadOnlyMetricCard({
  dashboardChart,
}: {
  dashboardChart: DashboardChartData;
}) {
  const metric = dashboardChart.metric;
  const chartTransform = dashboardChart.chartConfig as unknown as
    | ChartTransformResult
    | null
    | undefined;
  const hasChartData = !!(
    chartTransform?.chartData && chartTransform.chartData.length > 0
  );

  // Derive status from data (no polling for read-only)
  const status: PipelineStatus = {
    isProcessing: !!metric.refreshStatus,
    processingStep: metric.refreshStatus,
    hasError: !!metric.lastError,
    lastError: metric.lastError,
  };

  return (
    <div className="relative">
      {status.hasError && !status.isProcessing && (
        <Badge
          variant="destructive"
          className="absolute top-4 left-3 z-10 h-6 gap-1 px-2"
        >
          <AlertCircle className="h-3 w-3" />
          <span className="text-xs">Error</span>
        </Badge>
      )}

      <DashboardMetricChart
        title={chartTransform?.title ?? metric.name}
        chartTransform={chartTransform ?? null}
        hasChartData={hasChartData}
        isIntegrationMetric={!!metric.integration?.providerId}
        isOptimistic={false}
        integrationId={metric.integration?.providerId}
        roles={metric.roles ?? []}
        goal={metric.goal}
        goalProgress={dashboardChart.goalProgress}
        valueLabel={dashboardChart.valueLabel}
        isProcessing={status.isProcessing}
        processingStep={status.processingStep}
        isFetching={false}
      />
    </div>
  );
}
