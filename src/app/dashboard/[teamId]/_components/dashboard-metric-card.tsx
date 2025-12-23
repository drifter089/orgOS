"use client";

import { useCallback, useState } from "react";

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
import type { RouterOutputs } from "@/trpc/react";
import { api } from "@/trpc/react";

import {
  DashboardMetricChart,
  type LoadingPhase,
} from "./dashboard-metric-chart";
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
  /** When true, hides settings drawer and dev tool button (for public views) */
  readOnly?: boolean;
}

export function DashboardMetricCard({
  dashboardMetric,
  readOnly = false,
}: DashboardMetricCardProps) {
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isRegeneratingPipeline, setIsRegeneratingPipeline] = useState(false);

  const utils = api.useUtils();
  const { confirm } = useConfirmation();

  // Poll for refresh status when processing
  const { data: pipelineProgress } = api.pipeline.getProgress.useQuery(
    { metricId: dashboardMetric.metric.id },
    {
      enabled: isProcessing || isRegeneratingPipeline,
      refetchInterval: 500,
    },
  );

  // Derive loadingPhase from polled status
  const loadingPhase: LoadingPhase =
    isProcessing || isRegeneratingPipeline
      ? ((pipelineProgress?.currentStep as LoadingPhase) ?? "fetching-api")
      : null;

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

  // Mutations for pipeline operations
  const refreshMetricMutation = api.pipeline.refresh.useMutation();
  const regeneratePipelineMutation = api.pipeline.regenerate.useMutation();

  // Mutations for granular transformer regeneration
  const regenerateIngestionMutation =
    api.pipeline.regenerateIngestionOnly.useMutation({
      onSuccess: () => {
        toast.success("Data transformer regeneration started");
        void utils.dashboard.getDashboardCharts.invalidate();
      },
      onError: (error) => {
        toast.error(`Failed: ${error.message}`);
      },
    });

  const regenerateChartMutation = api.pipeline.regenerateChartOnly.useMutation({
    onSuccess: () => {
      toast.success("Chart transformer regeneration started");
      void utils.dashboard.getDashboardCharts.invalidate();
    },
    onError: (error) => {
      toast.error(`Failed: ${error.message}`);
    },
  });

  // Query for transformer info (only when drawer is open)
  const { data: transformerInfo } = api.pipeline.getTransformerInfo.useQuery(
    { metricId: metric.id },
    { enabled: isDrawerOpen },
  );

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
   * Refresh metric data using existing transformer, or regenerate entire pipeline
   * when forceRebuild is true. Progress status is polled from the database.
   * For manual metrics, regenerates via full pipeline.
   */
  const handleRefresh = useCallback(
    async (forceRebuild = false) => {
      // For manual metrics, regenerate via full pipeline
      if (!isIntegrationMetric) {
        setIsProcessing(true);
        try {
          await regeneratePipelineMutation.mutateAsync({
            metricId: metric.id,
          });
          // Fire-and-forget: will poll for progress via pipelineProgress query
          toast.success("Chart regeneration started");
          // Poll will detect completion and refetch
          const teamId = metric.teamId;
          await utils.dashboard.getDashboardCharts.refetch();
          if (teamId) {
            await utils.dashboard.getDashboardCharts.refetch({ teamId });
          }
        } catch (error) {
          toast.error("Regeneration failed", {
            description:
              error instanceof Error ? error.message : "Unknown error",
          });
        } finally {
          setIsProcessing(false);
        }
        return;
      }

      // For integration metrics
      if (!metric.templateId || !metric.integration) return;

      if (forceRebuild) {
        setIsRegeneratingPipeline(true);
      } else {
        setIsProcessing(true);
      }

      try {
        if (forceRebuild) {
          await regeneratePipelineMutation.mutateAsync({ metricId: metric.id });
          toast.success("Pipeline regeneration started");
        } else {
          await refreshMetricMutation.mutateAsync({ metricId: metric.id });
          toast.success("Data refresh started");
        }
        // Fire-and-forget: will poll for progress
        const teamId = metric.teamId;
        await utils.dashboard.getDashboardCharts.refetch();
        if (teamId) {
          await utils.dashboard.getDashboardCharts.refetch({ teamId });
        }
      } catch (error) {
        toast.error(
          forceRebuild ? "Pipeline regeneration failed" : "Refresh failed",
          {
            description:
              error instanceof Error ? error.message : "Unknown error",
          },
        );
      } finally {
        if (forceRebuild) {
          setIsRegeneratingPipeline(false);
        } else {
          setIsProcessing(false);
        }
      }
    },
    [
      isIntegrationMetric,
      metric.id,
      metric.templateId,
      metric.integration,
      metric.teamId,
      regeneratePipelineMutation,
      refreshMetricMutation,
      utils.dashboard.getDashboardCharts,
    ],
  );

  /**
   * Regenerate chart via full pipeline regeneration
   * Note: chartType, cadence, and userPrompt are ignored in current implementation
   */
  const handleRegenerate = useCallback(
    async (
      _chartType?: string,
      _cadence?: "DAILY" | "WEEKLY" | "MONTHLY",
      _userPrompt?: string,
    ) => {
      setIsProcessing(true);
      try {
        await regeneratePipelineMutation.mutateAsync({
          metricId: metric.id,
        });
        // Fire-and-forget: will poll for progress
        toast.success("Chart regeneration started");
        const teamId = metric.teamId;
        await utils.dashboard.getDashboardCharts.refetch();
        if (teamId) {
          await utils.dashboard.getDashboardCharts.refetch({ teamId });
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
      metric.id,
      metric.teamId,
      regeneratePipelineMutation,
      utils.dashboard.getDashboardCharts,
    ],
  );

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

  const handleRegenerateIngestion = useCallback(() => {
    setIsProcessing(true);
    regenerateIngestionMutation.mutate(
      { metricId: metric.id },
      {
        onSettled: () => {
          setIsProcessing(false);
        },
      },
    );
  }, [metric.id, regenerateIngestionMutation]);

  const handleRegenerateChart = useCallback(() => {
    setIsProcessing(true);
    regenerateChartMutation.mutate(
      { metricId: metric.id },
      {
        onSettled: () => {
          setIsProcessing(false);
        },
      },
    );
  }, [metric.id, regenerateChartMutation]);

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

      {/* Chart content - directly rendered */}
      <DashboardMetricChart
        title={title}
        chartTransform={chartTransform}
        hasChartData={hasChartData}
        isIntegrationMetric={isIntegrationMetric}
        isPending={isPending}
        isProcessing={isProcessing}
        loadingPhase={loadingPhase}
        integrationId={metric.integration?.providerId}
        roles={roles}
        goal={metric.goal}
        goalProgress={dashboardMetric.goalProgress}
        valueLabel={dashboardMetric.valueLabel}
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
            roles={roles}
            valueLabel={dashboardMetric.valueLabel ?? null}
            dataDescription={dashboardMetric.dataDescription ?? null}
            integrationId={metric.integration?.providerId ?? null}
            isIntegrationMetric={isIntegrationMetric}
            lastFetchedAt={metric.lastFetchedAt}
            chartUpdatedAt={dashboardMetric.chartTransformer?.updatedAt ?? null}
            lastError={metric.lastError}
            pollFrequency={metric.pollFrequency}
            goal={metric.goal}
            goalProgress={dashboardMetric.goalProgress ?? null}
            isProcessing={isProcessing}
            isUpdating={updateMetricMutation.isPending}
            isDeleting={isPending || deleteMetricMutation.isPending}
            isRegeneratingPipeline={isRegeneratingPipeline}
            loadingPhase={loadingPhase}
            onRegenerate={handleRegenerate}
            onRefresh={handleRefresh}
            onUpdateMetric={handleUpdateMetric}
            onDelete={handleRemove}
            onClose={() => setIsDrawerOpen(false)}
            onRegenerateIngestion={handleRegenerateIngestion}
            onRegenerateChart={handleRegenerateChart}
            transformerInfo={transformerInfo}
          />
        </div>
      </DrawerContent>
    </Drawer>
  );
}
