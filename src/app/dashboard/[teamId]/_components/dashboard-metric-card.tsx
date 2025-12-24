"use client";

import { useCallback, useState } from "react";

import type { Cadence } from "@prisma/client";
import { AlertCircle, Bug, Settings } from "lucide-react";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Drawer,
  DrawerContent,
  DrawerTitle,
  DrawerTrigger,
} from "@/components/ui/drawer";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { isDevMode } from "@/lib/dev-mode";
import type { ChartTransformResult } from "@/lib/metrics/transformer-types";
import { useConfirmation } from "@/providers/ConfirmationDialogProvider";
import { api } from "@/trpc/react";
import type { DashboardChartWithRelations } from "@/types/dashboard";

import { DashboardMetricChart } from "./dashboard-metric-chart";
import { DashboardMetricDrawer } from "./dashboard-metric-drawer";
import { useDashboardCharts } from "./use-dashboard-charts";

interface DashboardMetricCardProps {
  dashboardChart: DashboardChartWithRelations;
  teamId: string;
}

export function DashboardMetricCard({
  dashboardChart,
  teamId,
}: DashboardMetricCardProps) {
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const { confirm } = useConfirmation();
  const utils = api.useUtils();
  const { isProcessing, getError } = useDashboardCharts(teamId);

  const metric = dashboardChart.metric;
  const metricId = metric.id;
  const processing = isProcessing(metricId);
  const error = getError(metricId);

  const isIntegrationMetric = !!metric.integration?.providerId;
  const chartTransform =
    dashboardChart.chartConfig as ChartTransformResult | null;
  const hasChartData = !!chartTransform?.chartData?.length;
  const title = chartTransform?.title ?? metric.name;

  // ---------------------------------------------------------------------------
  // Mutations with optimistic updates
  // ---------------------------------------------------------------------------
  const setOptimisticProcessing = useCallback(
    (id: string) => {
      utils.dashboard.getDashboardCharts.setData({ teamId }, (old) =>
        old?.map((dc) =>
          dc.metric.id === id
            ? { ...dc, metric: { ...dc.metric, refreshStatus: "processing" } }
            : dc,
        ),
      );
    },
    [utils, teamId],
  );

  const refreshMutation = api.pipeline.refresh.useMutation({
    onMutate: () => setOptimisticProcessing(metricId),
    onError: (err) =>
      toast.error("Refresh failed", { description: err.message }),
  });

  const regenerateMutation = api.pipeline.regenerate.useMutation({
    onMutate: () => setOptimisticProcessing(metricId),
    onError: (err) =>
      toast.error("Regenerate failed", { description: err.message }),
  });

  const regenerateChartMutation = api.pipeline.regenerateChartOnly.useMutation({
    onMutate: () => setOptimisticProcessing(metricId),
    onError: (err) =>
      toast.error("Chart update failed", { description: err.message }),
  });

  const deleteMutation = api.metric.delete.useMutation({
    onSuccess: () => utils.dashboard.getDashboardCharts.invalidate({ teamId }),
    onError: (err) =>
      toast.error("Delete failed", { description: err.message }),
  });

  const updateMutation = api.metric.update.useMutation({
    onSuccess: () => utils.dashboard.getDashboardCharts.invalidate({ teamId }),
    onError: (err) =>
      toast.error("Update failed", { description: err.message }),
  });

  // ---------------------------------------------------------------------------
  // Handlers
  // ---------------------------------------------------------------------------
  const handleRefresh = useCallback(
    (forceRebuild = false) => {
      if (!isIntegrationMetric || forceRebuild) {
        regenerateMutation.mutate({ metricId });
      } else {
        refreshMutation.mutate({ metricId });
      }
    },
    [metricId, isIntegrationMetric, refreshMutation, regenerateMutation],
  );

  const handleDelete = useCallback(async () => {
    const confirmed = await confirm({
      title: "Delete metric",
      description: `Are you sure you want to delete "${metric.name}"? This action cannot be undone.`,
      confirmText: "Delete",
      variant: "destructive",
    });

    if (confirmed) {
      deleteMutation.mutate({ id: metricId });
      setIsDrawerOpen(false);
    }
  }, [metric.name, metricId, confirm, deleteMutation]);

  const handleUpdateMetric = useCallback(
    (name: string, description: string) => {
      updateMutation.mutate({
        id: metricId,
        name,
        description: description || undefined,
      });
    },
    [metricId, updateMutation],
  );

  const handleRegenerateChart = useCallback(
    (chartType: string, cadence: Cadence, selectedDimension?: string) => {
      regenerateChartMutation.mutate({
        metricId,
        chartType,
        cadence,
        selectedDimension,
      });
    },
    [metricId, regenerateChartMutation],
  );

  // ---------------------------------------------------------------------------
  // Render
  // ---------------------------------------------------------------------------
  const cardContent = (
    <div className="relative">
      {error && !processing && (
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
            <p className="text-sm">{error}</p>
          </TooltipContent>
        </Tooltip>
      )}

      <DrawerTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="absolute top-2 right-2 z-10 h-7 w-7"
        >
          <Settings className="h-4 w-4" />
        </Button>
      </DrawerTrigger>

      {isDevMode() && (
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="ghost"
              size="sm"
              className="text-muted-foreground absolute top-0 left-0 z-10 h-7 w-7 p-0 hover:text-amber-600"
              onClick={() =>
                window.open(`/dev-metric-tool/${metricId}`, "_blank")
              }
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
        chartTransform={chartTransform}
        hasChartData={hasChartData}
        isIntegrationMetric={isIntegrationMetric}
        integrationId={metric.integration?.providerId}
        roles={metric.roles ?? []}
        goal={metric.goal}
        goalProgress={dashboardChart.goalProgress}
        valueLabel={dashboardChart.valueLabel}
        isProcessing={processing}
      />
    </div>
  );

  return (
    <Drawer open={isDrawerOpen} onOpenChange={setIsDrawerOpen}>
      {cardContent}

      <DrawerContent className="flex h-[90vh] max-h-[90vh] flex-col overflow-hidden">
        <DrawerTitle className="sr-only">{metric.name} Settings</DrawerTitle>
        <div className="min-h-0 w-full flex-1">
          <DashboardMetricDrawer
            dashboardChart={dashboardChart}
            isProcessing={processing}
            error={error}
            isDeleting={deleteMutation.isPending}
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
// Read-Only Card (for public views)
// =============================================================================

export function ReadOnlyMetricCard({
  dashboardChart,
}: {
  dashboardChart: DashboardChartWithRelations;
}) {
  const metric = dashboardChart.metric;
  const chartTransform =
    dashboardChart.chartConfig as ChartTransformResult | null;
  const hasChartData = !!chartTransform?.chartData?.length;

  return (
    <div className="relative">
      {metric.lastError && !metric.refreshStatus && (
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
        chartTransform={chartTransform}
        hasChartData={hasChartData}
        isIntegrationMetric={!!metric.integration?.providerId}
        integrationId={metric.integration?.providerId}
        roles={metric.roles ?? []}
        goal={metric.goal}
        goalProgress={dashboardChart.goalProgress}
        valueLabel={dashboardChart.valueLabel}
        isProcessing={!!metric.refreshStatus}
      />
    </div>
  );
}
