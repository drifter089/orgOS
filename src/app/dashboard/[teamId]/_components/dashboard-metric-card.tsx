"use client";

import { useCallback, useState } from "react";

import type { Cadence } from "@prisma/client";
import { AlertCircle, Bug, Loader2, Settings } from "lucide-react";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Drawer, DrawerContent, DrawerTrigger } from "@/components/ui/drawer";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { useDashboardMetric } from "@/hooks/use-dashboard-metric";
import { useMetricMutations } from "@/hooks/use-metric-mutations";
import { useMetricStatusPolling } from "@/hooks/use-metric-status-polling";
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
  /**
   * Optional data override - use when data comes from a different query.
   * When provided, skips the hook and uses this data directly.
   * Useful for: public views, default dashboard, member cards, chart nodes.
   */
  dataOverride?: DashboardChartData;
}

/**
 * Dashboard metric card component.
 *
 * Uses useDashboardMetric hook to get live data from TanStack Query cache.
 * No props drilling needed - just metricId and teamId.
 *
 * Data flow:
 * 1. Parent (DashboardPageClient) queries with polling
 * 2. This card subscribes to same cache via hook
 * 3. When parent polls, this card automatically updates
 */
export function DashboardMetricCard({
  metricId,
  teamId,
  readOnly = false,
  dataOverride,
}: DashboardMetricCardProps) {
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);

  const utils = api.useUtils();
  const { confirm } = useConfirmation();

  const hookResult = useDashboardMetric(metricId, teamId);

  const dashboardChart = dataOverride ?? hookResult.dashboardChart;
  const isFetching = dataOverride ? false : hookResult.isFetching;

  // Get initial status from cache
  const initialStatus = dataOverride
    ? dataOverride.metric.refreshStatus
    : hookResult.status.processingStep;

  // Use card-level polling for live status updates
  const pollingResult = useMetricStatusPolling(metricId, initialStatus);

  // Compute final status - polling takes precedence for processing state
  const status = dataOverride
    ? {
        isProcessing:
          pollingResult.isProcessing || !!dataOverride.metric.refreshStatus,
        processingStep:
          pollingResult.refreshStatus ?? dataOverride.metric.refreshStatus,
        hasError: !!pollingResult.lastError || !!dataOverride.metric.lastError,
        lastError: pollingResult.lastError ?? dataOverride.metric.lastError,
        isPending: dataOverride.id.startsWith("temp-"),
      }
    : {
        ...hookResult.status,
        isProcessing:
          pollingResult.isProcessing || hookResult.status.isProcessing,
        processingStep:
          pollingResult.refreshStatus ?? hookResult.status.processingStep,
        hasError: !!pollingResult.lastError || hookResult.status.hasError,
        lastError: pollingResult.lastError ?? hookResult.status.lastError,
      };

  const {
    delete: deleteMetricMutation,
    refresh: refreshMetricMutation,
    regenerate: regeneratePipelineMutation,
  } = useMetricMutations({ teamId });

  const regenerateChartMutation = api.pipeline.regenerateChartOnly.useMutation({
    onSuccess: () => {
      void utils.dashboard.getDashboardCharts.invalidate();
    },
    onError: (error) => {
      toast.error(`Failed: ${error.message}`);
    },
  });

  const updateMetricMutation = api.metric.update.useMutation({
    onSuccess: () => {
      void utils.dashboard.getDashboardCharts.invalidate();
    },
  });

  const metric = dashboardChart?.metric;
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

  const handleRefresh = useCallback(
    async (forceRebuild = false) => {
      if (!metric) return;
      try {
        if (!isIntegrationMetric) {
          await regeneratePipelineMutation.mutateAsync({ metricId: metric.id });
          toast.success("Chart regeneration started");
          return;
        }

        if (!metric.templateId || !metric.integration) return;

        if (forceRebuild) {
          await regeneratePipelineMutation.mutateAsync({ metricId: metric.id });
          toast.success("Pipeline regeneration started");
        } else {
          await refreshMetricMutation.mutateAsync({ metricId: metric.id });
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
    [
      metric,
      isIntegrationMetric,
      regeneratePipelineMutation,
      refreshMetricMutation,
    ],
  );

  const handleRemove = useCallback(async () => {
    if (!metric) return;
    const confirmed = await confirm({
      title: "Delete metric",
      description: `Are you sure you want to delete "${metric.name}"? This action cannot be undone.`,
      confirmText: "Delete",
      variant: "destructive",
    });

    if (confirmed) {
      deleteMetricMutation.mutate({ id: metric.id });
    }
  }, [metric, confirm, deleteMetricMutation]);

  const handleUpdateMetric = useCallback(
    (name: string, description: string) => {
      if (!metric) return;
      updateMetricMutation.mutate({
        id: metric.id,
        name,
        description: description || undefined,
      });
    },
    [metric, updateMetricMutation],
  );

  const handleRegenerateChart = useCallback(
    (chartType: string, cadence: Cadence, selectedDimension?: string) => {
      if (!metric) return;
      regenerateChartMutation.mutate({
        metricId: metric.id,
        chartType,
        cadence,
        selectedDimension,
      });
    },
    [metric, regenerateChartMutation],
  );

  if (!dashboardChart || !metric) {
    return (
      <div className="bg-card flex h-[420px] items-center justify-center rounded-lg border">
        <Loader2 className="text-muted-foreground h-8 w-8 animate-spin" />
      </div>
    );
  }

  const cardContent = (
    <div className="relative">
      {status.hasError && (
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
        isPending={status.isPending}
        integrationId={metric.integration?.providerId}
        roles={roles}
        goal={metric.goal}
        goalProgress={dashboardChart.goalProgress}
        valueLabel={dashboardChart.valueLabel}
        isProcessing={status.isProcessing}
        processingStep={status.processingStep}
        isFetching={isFetching}
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
            metricId={metric.id}
            teamId={teamId}
            isDeleting={status.isPending || deleteMetricMutation.isPending}
            onRefresh={handleRefresh}
            onUpdateMetric={handleUpdateMetric}
            onDelete={handleRemove}
            onClose={() => setIsDrawerOpen(false)}
            onRegenerateChart={handleRegenerateChart}
          />
        </div>
      </DrawerContent>
    </Drawer>
  );
}
