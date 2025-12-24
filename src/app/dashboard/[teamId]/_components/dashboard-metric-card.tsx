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
import { useMetricMutations } from "@/hooks/use-metric-mutations";
import { type MetricStatus, useMetricStatus } from "@/hooks/use-metric-status";
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
   * When provided, derives status from this data instead of calling the hook.
   * Useful for: public views, default dashboard, member cards, chart nodes.
   */
  dataOverride?: DashboardChartData;
}

/**
 * Dashboard metric card component.
 *
 * Uses useMetricStatus hook for status tracking.
 * Owns the status and passes it to drawer - no duplicate polling.
 */
export function DashboardMetricCard({
  metricId,
  teamId,
  readOnly = false,
  dataOverride,
}: DashboardMetricCardProps) {
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const { confirm } = useConfirmation();

  // Status tracking - single source of truth
  const { status, startPolling, isFetching } = useMetricStatus(
    metricId,
    teamId,
  );

  // Get chart data from cache
  const { data: dashboardCharts } = api.dashboard.getDashboardCharts.useQuery(
    { teamId },
    { enabled: !dataOverride },
  );
  const hookChart = dashboardCharts?.find((dc) => dc.metric.id === metricId);

  // Use override if provided, otherwise use hook data
  const dashboardChart = dataOverride ?? hookChart ?? null;

  // For dataOverride, derive status from the override data (for read-only views)
  const effectiveStatus: MetricStatus = dataOverride
    ? {
        isProcessing: !!dataOverride.metric.refreshStatus,
        processingStep: dataOverride.metric.refreshStatus,
        hasError: !!dataOverride.metric.lastError,
        lastError: dataOverride.metric.lastError,
        isOptimistic: dataOverride.id.startsWith("temp-"),
      }
    : status;

  // All mutations
  const mutations = useMetricMutations({ teamId });

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

  // ==========================================================================
  // Handlers
  // ==========================================================================

  const handleRefresh = useCallback(
    async (forceRebuild = false) => {
      if (!metric) return;
      try {
        if (!isIntegrationMetric) {
          await mutations.regenerate.mutateAsync({ metricId: metric.id });
          startPolling(); // Start polling immediately
          toast.success("Chart regeneration started");
          return;
        }

        if (!metric.templateId || !metric.integration) return;

        if (forceRebuild) {
          await mutations.regenerate.mutateAsync({ metricId: metric.id });
          startPolling(); // Start polling immediately
          toast.success("Pipeline regeneration started");
        } else {
          await mutations.refresh.mutateAsync({ metricId: metric.id });
          startPolling(); // Start polling immediately
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
    [metric, isIntegrationMetric, mutations, startPolling],
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
      mutations.delete.mutate({ id: metric.id });
    }
  }, [metric, confirm, mutations]);

  const handleUpdateMetric = useCallback(
    (name: string, description: string) => {
      if (!metric) return;
      mutations.update.mutate({
        id: metric.id,
        name,
        description: description || undefined,
      });
    },
    [metric, mutations],
  );

  const handleRegenerateChart = useCallback(
    (chartType: string, cadence: Cadence, selectedDimension?: string) => {
      if (!metric) return;
      mutations.regenerateChartOnly.mutate({
        metricId: metric.id,
        chartType,
        cadence,
        selectedDimension,
      });
      startPolling(); // Start polling immediately
    },
    [metric, mutations, startPolling],
  );

  // ==========================================================================
  // Render
  // ==========================================================================

  if (!dashboardChart || !metric) {
    return (
      <div className="bg-card flex h-[420px] items-center justify-center rounded-lg border">
        <Loader2 className="text-muted-foreground h-8 w-8 animate-spin" />
      </div>
    );
  }

  const cardContent = (
    <div className="relative">
      {effectiveStatus.hasError && (
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
            <p className="text-sm">{effectiveStatus.lastError}</p>
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
        isOptimistic={effectiveStatus.isOptimistic}
        integrationId={metric.integration?.providerId}
        roles={roles}
        goal={metric.goal}
        goalProgress={dashboardChart.goalProgress}
        valueLabel={dashboardChart.valueLabel}
        isProcessing={effectiveStatus.isProcessing}
        processingStep={effectiveStatus.processingStep}
        isFetching={dataOverride ? false : isFetching}
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
            status={effectiveStatus}
            isFetching={isFetching}
            isDeleting={mutations.delete.isPending}
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
