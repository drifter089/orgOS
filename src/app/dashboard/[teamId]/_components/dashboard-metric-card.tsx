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
import { useMetricMutations } from "@/hooks/use-metric-mutations";
import { isDevMode } from "@/lib/dev-mode";
import type { ChartTransformResult } from "@/lib/metrics/transformer-types";
import { useConfirmation } from "@/providers/ConfirmationDialogProvider";
import type { RouterOutputs } from "@/trpc/react";
import { api } from "@/trpc/react";

import { DashboardMetricChart } from "./dashboard-metric-chart";
import { DashboardMetricDrawer } from "./dashboard-metric-drawer";

type DashboardMetrics = RouterOutputs["dashboard"]["getDashboardCharts"];
type DashboardMetricWithRelations = DashboardMetrics[number];

// Re-export for components that import from here
export type {
  ChartType,
  ChartTransformResult,
} from "@/lib/metrics/transformer-types";

export interface DisplayedChart {
  id: string;
  metricName: string;
  chartTransform: ChartTransformResult;
}

interface DashboardMetricCardProps {
  dashboardMetric: DashboardMetricWithRelations & {
    valueLabel?: string | null;
    dataDescription?: string | null;
  };
  /** Team ID for targeted cache invalidation (optional for non-dashboard contexts) */
  teamId?: string;
  /** When true, hides settings drawer and dev tool button (for public views) */
  readOnly?: boolean;
  /** Whether the parent dashboard query is currently fetching */
  isFetching?: boolean;
}

/**
 * Dashboard metric card component.
 *
 * Key simplifications:
 * - Single source of truth: metric.refreshStatus from server
 * - Targeted invalidation using teamId prop
 */
export function DashboardMetricCard({
  dashboardMetric,
  teamId: teamIdProp,
  readOnly = false,
  isFetching = false,
}: DashboardMetricCardProps) {
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);

  const utils = api.useUtils();
  const { confirm } = useConfirmation();

  const { metric } = dashboardMetric;
  const teamId = teamIdProp ?? metric.teamId ?? undefined;
  const isPending = dashboardMetric.id.startsWith("temp-");
  const isIntegrationMetric = !!metric.integration?.providerId;
  const roles = metric.roles ?? [];
  const hasError = !!metric.lastError;
  const isProcessing = !!metric.refreshStatus;
  const processingStep = metric.refreshStatus;

  const {
    delete: deleteMetricMutation,
    refresh: refreshMetricMutation,
    regenerate: regeneratePipelineMutation,
  } = useMetricMutations({
    teamId,
  });

  const regenerateChartMutation = api.pipeline.regenerateChartOnly.useMutation({
    onSuccess: async () => {
      await Promise.all([
        utils.dashboard.getDashboardCharts.invalidate(),
        teamId
          ? utils.dashboard.getDashboardCharts.invalidate({ teamId })
          : Promise.resolve(),
      ]);
    },
    onError: (error) => {
      toast.error(`Failed: ${error.message}`);
    },
  });

  const chartTransform =
    dashboardMetric.chartConfig as unknown as ChartTransformResult | null;
  const hasChartData = !!(
    chartTransform?.chartData && chartTransform.chartData.length > 0
  );

  const updateMetricMutation = api.metric.update.useMutation({
    onSuccess: (updatedMetric) => {
      // Update both query variants
      utils.dashboard.getDashboardCharts.setData(undefined, (old) =>
        old?.map((dm) =>
          dm.metric.id === updatedMetric.id
            ? { ...dm, metric: { ...dm.metric, ...updatedMetric } }
            : dm,
        ),
      );
      utils.dashboard.getDashboardCharts.setData({ teamId }, (old) =>
        old?.map((dm) =>
          dm.metric.id === updatedMetric.id
            ? { ...dm, metric: { ...dm.metric, ...updatedMetric } }
            : dm,
        ),
      );
    },
  });

  /**
   * Refresh metric data using existing transformer, or regenerate entire pipeline
   * when forceRebuild is true. Progress status is polled centrally by parent.
   */
  const handleRefresh = useCallback(
    async (forceRebuild = false) => {
      try {
        // For manual metrics, regenerate via full pipeline
        if (!isIntegrationMetric) {
          await regeneratePipelineMutation.mutateAsync({ metricId: metric.id });
          toast.success("Chart regeneration started");
          return;
        }

        // For integration metrics
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
      isIntegrationMetric,
      metric.id,
      metric.templateId,
      metric.integration,
      regeneratePipelineMutation,
      refreshMetricMutation,
    ],
  );

  /**
   * Regenerate chart via full pipeline regeneration
   */
  const handleRegenerate = useCallback(async () => {
    try {
      await regeneratePipelineMutation.mutateAsync({ metricId: metric.id });
      toast.success("Chart regeneration started");
    } catch (error) {
      toast.error("Regeneration failed", {
        description: error instanceof Error ? error.message : "Unknown error",
      });
    }
  }, [metric.id, regeneratePipelineMutation]);

  const handleRemove = async () => {
    const confirmed = await confirm({
      title: "Delete metric",
      description: `Are you sure you want to delete "${metric.name}"? This action cannot be undone.`,
      confirmText: "Delete",
      variant: "destructive",
    });

    if (confirmed) {
      deleteMetricMutation.mutate({ id: metric.id });
    }
  };

  const handleUpdateMetric = (name: string, description: string) => {
    updateMetricMutation.mutate({
      id: metric.id,
      name,
      description: description || undefined,
    });
  };

  const handleRegenerateChart = useCallback(
    (chartType: string, cadence: Cadence, selectedDimension?: string) => {
      regenerateChartMutation.mutate({
        metricId: metric.id,
        chartType,
        cadence,
        selectedDimension,
      });
    },
    [metric.id, regenerateChartMutation],
  );

  // Use AI-generated chart title when available, fallback to metric name
  const title = chartTransform?.title ?? metric.name;

  // Card content shared between readOnly and editable modes
  const cardContent = (
    <div className="relative">
      {/* Error indicator */}
      {hasError && (
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
            <p className="text-sm">{metric.lastError}</p>
          </TooltipContent>
        </Tooltip>
      )}

      {/* Settings trigger - top right (hidden in readOnly mode) */}
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

      {/* Dev Tool Button - Only visible in development mode (hidden in readOnly mode) */}
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

      {/* Chart content */}
      <DashboardMetricChart
        title={title}
        chartTransform={chartTransform}
        hasChartData={hasChartData}
        isIntegrationMetric={isIntegrationMetric}
        isPending={isPending}
        integrationId={metric.integration?.providerId}
        roles={roles}
        goal={metric.goal}
        goalProgress={dashboardMetric.goalProgress}
        valueLabel={dashboardMetric.valueLabel}
        isProcessing={isProcessing}
        processingStep={processingStep}
        isFetching={isFetching}
      />
    </div>
  );

  // In readOnly mode, just render the card without the Drawer wrapper
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
            metricName={metric.name}
            metricDescription={metric.description}
            teamId={metric.teamId}
            chartTransform={chartTransform}
            currentChartType={
              dashboardMetric.chartTransformer?.chartType ?? null
            }
            currentCadence={dashboardMetric.chartTransformer?.cadence ?? null}
            currentSelectedDimension={
              dashboardMetric.chartTransformer?.selectedDimension ?? null
            }
            roles={roles}
            valueLabel={dashboardMetric.valueLabel ?? null}
            integrationId={metric.integration?.providerId ?? null}
            isIntegrationMetric={isIntegrationMetric}
            lastFetchedAt={metric.lastFetchedAt}
            chartUpdatedAt={dashboardMetric.chartTransformer?.updatedAt ?? null}
            lastError={metric.lastError}
            goal={metric.goal}
            goalProgress={dashboardMetric.goalProgress ?? null}
            isUpdating={updateMetricMutation.isPending}
            isDeleting={isPending || deleteMetricMutation.isPending}
            onRegenerate={handleRegenerate}
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
