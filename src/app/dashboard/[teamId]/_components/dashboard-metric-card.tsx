"use client";

import { useCallback, useState } from "react";

import { AlertCircle, Bug, Settings } from "lucide-react";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Drawer, DrawerContent, DrawerTrigger } from "@/components/ui/drawer";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
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
}

export function DashboardMetricCard({
  dashboardMetric,
}: DashboardMetricCardProps) {
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isRegeneratingPipeline, setIsRegeneratingPipeline] = useState(false);

  const utils = api.useUtils();
  const { confirm } = useConfirmation();

  const isPending = dashboardMetric.id.startsWith("temp-");
  const { metric } = dashboardMetric;
  const isIntegrationMetric = !!metric.integration?.providerId;
  const roles = metric.roles ?? [];
  const hasError = !!metric.lastError;

  const chartTransform =
    dashboardMetric.chartConfig as unknown as ChartTransformResult | null;
  const hasChartData = !!(
    chartTransform?.chartData && chartTransform.chartData.length > 0
  );

  const deleteMetricMutation = api.metric.delete.useMutation({
    onMutate: async ({ id }) => {
      const teamId = metric.teamId;

      await utils.dashboard.getDashboardCharts.cancel();
      if (teamId) {
        await utils.dashboard.getDashboardCharts.cancel({ teamId });
      }

      const previousUnscopedMetrics =
        utils.dashboard.getDashboardCharts.getData();
      const previousTeamMetrics = teamId
        ? utils.dashboard.getDashboardCharts.getData({ teamId })
        : undefined;

      if (previousUnscopedMetrics) {
        utils.dashboard.getDashboardCharts.setData(
          undefined,
          previousUnscopedMetrics.filter((dm) => dm.metric.id !== id),
        );
      }

      if (teamId && previousTeamMetrics) {
        utils.dashboard.getDashboardCharts.setData(
          { teamId },
          previousTeamMetrics.filter((dm) => dm.metric.id !== id),
        );
      }

      return { previousUnscopedMetrics, previousTeamMetrics, teamId };
    },
    onError: (err, _variables, context) => {
      if (context?.previousUnscopedMetrics) {
        utils.dashboard.getDashboardCharts.setData(
          undefined,
          context.previousUnscopedMetrics,
        );
      }
      if (context?.teamId && context?.previousTeamMetrics) {
        utils.dashboard.getDashboardCharts.setData(
          { teamId: context.teamId },
          context.previousTeamMetrics,
        );
      }
      toast.info(err.message);
    },
  });

  // Mutations for transformer operations
  const refreshMetricMutation = api.transformer.refreshMetric.useMutation();
  const regenerateChartMutation =
    api.transformer.regenerateChartTransformer.useMutation();

  const updateMetricMutation = api.metric.update.useMutation({
    onSuccess: (updatedMetric) => {
      const teamId = metric.teamId;
      utils.dashboard.getDashboardCharts.setData(undefined, (old) =>
        old?.map((dm) =>
          dm.metric.id === updatedMetric.id
            ? { ...dm, metric: { ...dm.metric, ...updatedMetric } }
            : dm,
        ),
      );
      if (teamId) {
        utils.dashboard.getDashboardCharts.setData({ teamId }, (old) =>
          old?.map((dm) =>
            dm.metric.id === updatedMetric.id
              ? { ...dm, metric: { ...dm.metric, ...updatedMetric } }
              : dm,
          ),
        );
      }
    },
  });

  /**
   * Refresh metric data using MetricTransformer
   * 1. Fetch data via MetricTransformer
   * 2. Store in MetricDataPoints
   * 3. Invalidate cache to refresh UI
   */
  const handleRefresh = useCallback(async () => {
    if (!isIntegrationMetric || !metric.templateId || !metric.integration)
      return;

    setIsProcessing(true);
    try {
      const result = await refreshMetricMutation.mutateAsync({
        metricId: metric.id,
      });

      if (result.success) {
        toast.success("Data refreshed", {
          description: `${result.dataPointCount} data points updated`,
        });
        // Invalidate dashboard to refetch with new data
        const teamId = metric.teamId;
        await utils.dashboard.getDashboardCharts.invalidate();
        if (teamId) {
          await utils.dashboard.getDashboardCharts.invalidate({ teamId });
        }
      } else {
        toast.error("Refresh failed", { description: result.error });
      }
    } catch (error) {
      toast.error("Refresh failed", {
        description: error instanceof Error ? error.message : "Unknown error",
      });
    } finally {
      setIsProcessing(false);
    }
  }, [
    isIntegrationMetric,
    metric.templateId,
    metric.integration,
    metric.id,
    metric.teamId,
    refreshMetricMutation,
    utils.dashboard.getDashboardCharts,
  ]);

  /**
   * Regenerate chart with AI using optional prompt, chartType, and cadence
   */
  const handleRegenerate = useCallback(
    async (
      chartType?: string,
      cadence?: "DAILY" | "WEEKLY" | "MONTHLY",
      userPrompt?: string,
    ) => {
      setIsProcessing(true);
      try {
        const result = await regenerateChartMutation.mutateAsync({
          dashboardChartId: dashboardMetric.id,
          chartType,
          cadence,
          userPrompt,
        });

        if (result.success) {
          toast.success("Chart regenerated");
          // Invalidate to refetch with new chart config
          const teamId = metric.teamId;
          await utils.dashboard.getDashboardCharts.invalidate();
          if (teamId) {
            await utils.dashboard.getDashboardCharts.invalidate({ teamId });
          }
        } else {
          toast.error("Regeneration failed", { description: result.error });
        }
      } catch (error) {
        toast.error("Regeneration failed", {
          description: error instanceof Error ? error.message : "Unknown error",
        });
      } finally {
        setIsProcessing(false);
      }
    },
    [
      dashboardMetric.id,
      regenerateChartMutation,
      utils.dashboard.getDashboardCharts,
      metric.teamId,
    ],
  );

  /**
   * Regenerate entire pipeline (both DataIngestion and Chart transformers)
   * This deletes the existing transformer and recreates it from scratch.
   * Uses the same refreshMetric mutation with forceRegenerate flag.
   */
  const handleRegeneratePipeline = useCallback(async () => {
    if (!isIntegrationMetric || !metric.templateId || !metric.integration)
      return;

    setIsRegeneratingPipeline(true);
    try {
      const result = await refreshMetricMutation.mutateAsync({
        metricId: metric.id,
        forceRegenerate: true,
      });

      if (result.success) {
        toast.success("Pipeline regenerated", {
          description: `Transformers recreated with ${result.dataPointCount} data points`,
        });
        // Invalidate dashboard to refetch with new data
        const teamId = metric.teamId;
        await utils.dashboard.getDashboardCharts.invalidate();
        if (teamId) {
          await utils.dashboard.getDashboardCharts.invalidate({ teamId });
        }
      } else {
        toast.error("Pipeline regeneration failed", {
          description: result.error,
        });
      }
    } catch (error) {
      toast.error("Pipeline regeneration failed", {
        description: error instanceof Error ? error.message : "Unknown error",
      });
    } finally {
      setIsRegeneratingPipeline(false);
    }
  }, [
    isIntegrationMetric,
    metric.templateId,
    metric.integration,
    metric.id,
    metric.teamId,
    refreshMetricMutation,
    utils.dashboard.getDashboardCharts,
  ]);

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

  // Use AI-generated chart title when available, fallback to metric name
  const title = chartTransform?.title ?? metric.name;

  return (
    <Drawer open={isDrawerOpen} onOpenChange={setIsDrawerOpen}>
      <Card className="relative h-[420px]">
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

        {/* Settings trigger - top right */}
        <DrawerTrigger asChild>
          <Button
            variant="ghost"
            size="icon"
            className="absolute top-2 right-2 z-10 h-7 w-7"
          >
            <Settings className="h-4 w-4" />
          </Button>
        </DrawerTrigger>

        {/* Dev Tool Button - Only visible in development mode */}
        {isDevMode() && (
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

        {/* Chart content - directly rendered */}
        <DashboardMetricChart
          title={title}
          chartTransform={chartTransform}
          hasChartData={hasChartData}
          isIntegrationMetric={isIntegrationMetric}
          isPending={isPending}
          isProcessing={isProcessing}
          integrationId={metric.integration?.providerId}
          roles={roles}
          goal={metric.goal}
          goalProgress={dashboardMetric.goalProgress}
          valueLabel={dashboardMetric.valueLabel}
        />
      </Card>

      <DrawerContent className="max-h-[90vh] sm:max-w-2xl md:max-w-3xl lg:max-w-4xl">
        <div className="mx-auto w-full">
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
            roles={roles}
            valueLabel={dashboardMetric.valueLabel ?? null}
            dataDescription={dashboardMetric.dataDescription ?? null}
            integrationId={metric.integration?.providerId ?? null}
            isIntegrationMetric={isIntegrationMetric}
            lastFetchedAt={metric.lastFetchedAt}
            lastError={metric.lastError}
            pollFrequency={metric.pollFrequency}
            goal={metric.goal}
            goalProgress={dashboardMetric.goalProgress ?? null}
            isProcessing={isProcessing}
            isUpdating={updateMetricMutation.isPending}
            isDeleting={isPending || deleteMetricMutation.isPending}
            isRegeneratingPipeline={isRegeneratingPipeline}
            onRegenerate={handleRegenerate}
            onRefresh={handleRefresh}
            onRegeneratePipeline={handleRegeneratePipeline}
            onUpdateMetric={handleUpdateMetric}
            onDelete={handleRemove}
            onClose={() => setIsDrawerOpen(false)}
          />
        </div>
      </DrawerContent>
    </Drawer>
  );
}
