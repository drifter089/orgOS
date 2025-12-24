"use client";

import { useCallback, useState } from "react";

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
import { isDevMode } from "@/lib/dev-mode";
import type { ChartTransformResult } from "@/lib/metrics/transformer-types";
import { useConfirmation } from "@/providers/ConfirmationDialogProvider";
import type { DashboardChartWithRelations } from "@/types/dashboard";

import { DashboardMetricChart } from "./dashboard-metric-chart";
import { DashboardMetricDrawer } from "./dashboard-metric-drawer";
import { usePipelineStatus } from "./pipeline-status-provider";

interface DashboardMetricCardProps {
  dashboardChart: DashboardChartWithRelations;
}

/**
 * Dashboard metric card component.
 *
 * Architecture:
 * - Receives dashboardChart as prop (no query)
 * - Uses PipelineStatusProvider for status and mutations
 * - Simple, no optimistic updates
 */
export function DashboardMetricCard({
  dashboardChart,
}: DashboardMetricCardProps) {
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const { confirm } = useConfirmation();
  const pipeline = usePipelineStatus();

  const metric = dashboardChart.metric;
  const metricId = metric.id;
  const status = pipeline.getStatus(metricId);

  const isIntegrationMetric = !!metric.integration?.providerId;
  const chartTransform =
    dashboardChart.chartConfig as ChartTransformResult | null;
  const hasChartData = !!chartTransform?.chartData?.length;
  const title = chartTransform?.title ?? metric.name;

  // ---------------------------------------------------------------------------
  // Handlers
  // ---------------------------------------------------------------------------
  const handleRefresh = useCallback(
    async (forceRebuild = false) => {
      try {
        if (!isIntegrationMetric || forceRebuild) {
          await pipeline.regenerateMetric(metricId);
        } else {
          await pipeline.refreshMetric(metricId);
        }
      } catch (error) {
        toast.error("Operation failed", {
          description: error instanceof Error ? error.message : "Unknown error",
        });
      }
    },
    [metricId, isIntegrationMetric, pipeline],
  );

  const handleDelete = useCallback(async () => {
    const confirmed = await confirm({
      title: "Delete metric",
      description: `Are you sure you want to delete "${metric.name}"? This action cannot be undone.`,
      confirmText: "Delete",
      variant: "destructive",
    });

    if (confirmed) {
      await pipeline.deleteMetric(metricId);
      setIsDrawerOpen(false);
    }
  }, [metric.name, metricId, confirm, pipeline]);

  const handleUpdateMetric = useCallback(
    async (name: string, description: string) => {
      try {
        await pipeline.updateMetric(metricId, {
          name,
          description: description || undefined,
        });
      } catch (error) {
        console.error("Failed to update metric:", error);
        toast.error("Failed to update metric", {
          description: error instanceof Error ? error.message : "Unknown error",
        });
      }
    },
    [metricId, pipeline],
  );

  const handleRegenerateChart = useCallback(
    async (chartType: string, cadence: Cadence, selectedDimension?: string) => {
      try {
        await pipeline.regenerateChart(metricId, {
          chartType,
          cadence,
          selectedDimension,
        });
      } catch (error) {
        toast.error("Failed to regenerate chart", {
          description: error instanceof Error ? error.message : "Unknown error",
        });
      }
    },
    [metricId, pipeline],
  );

  // ---------------------------------------------------------------------------
  // Render
  // ---------------------------------------------------------------------------
  const cardContent = (
    <div className="relative">
      {status.error && !status.isProcessing && (
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
            <p className="text-sm">{status.error}</p>
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
        isOptimistic={false}
        integrationId={metric.integration?.providerId}
        roles={metric.roles ?? []}
        goal={metric.goal}
        goalProgress={dashboardChart.goalProgress}
        valueLabel={dashboardChart.valueLabel}
        isProcessing={status.isProcessing}
        processingStep={status.step}
        isFetching={status.isProcessing}
      />
    </div>
  );

  return (
    <Drawer open={isDrawerOpen} onOpenChange={setIsDrawerOpen}>
      {cardContent}

      <DrawerContent className="flex h-[96vh] max-h-[96vh] flex-col">
        <div className="mx-auto min-h-0 w-full flex-1">
          <DashboardMetricDrawer
            dashboardChart={dashboardChart}
            status={status}
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
        isOptimistic={false}
        integrationId={metric.integration?.providerId}
        roles={metric.roles ?? []}
        goal={metric.goal}
        goalProgress={dashboardChart.goalProgress}
        valueLabel={dashboardChart.valueLabel}
        isProcessing={!!metric.refreshStatus}
        processingStep={metric.refreshStatus}
        isFetching={false}
      />
    </div>
  );
}
