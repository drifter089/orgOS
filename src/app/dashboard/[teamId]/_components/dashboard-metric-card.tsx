"use client";

import { useCallback, useEffect, useRef, useState } from "react";

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
import { PIPELINE_CONFIGS } from "@/lib/pipeline/configs";
import type { PipelineStepName } from "@/lib/pipeline/types";
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

// Initial steps set by backend for each mutation type (matches pipeline.ts)
const INITIAL_STEPS = {
  softRefresh: PIPELINE_CONFIGS["soft-refresh"][0]!.step,
  hardRefresh: "deleting-old-data" as PipelineStepName,
  regenerateIngestion: "deleting-old-transformer" as PipelineStepName,
  regenerateChart: "deleting-old-transformer" as PipelineStepName,
} as const;

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

type ActiveOperation =
  | "soft-refresh"
  | "hard-refresh"
  | "regenerate-chart"
  | "regenerate-ingestion"
  | null;

export function DashboardMetricCard({
  dashboardMetric,
  readOnly = false,
}: DashboardMetricCardProps) {
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [activeOperation, setActiveOperation] = useState<ActiveOperation>(null);

  const utils = api.useUtils();
  const { confirm } = useConfirmation();

  // Mutations defined before polling query to use isPending states
  const {
    delete: deleteMetricMutation,
    refresh: refreshMetricMutation,
    regenerate: regeneratePipelineMutation,
  } = useMetricMutations({
    teamId: dashboardMetric.metric.teamId ?? undefined,
  });

  const regenerateIngestionMutation =
    api.pipeline.regenerateIngestionOnly.useMutation({
      onSuccess: () => {
        toast.success("Data transformer regeneration started");
        void utils.dashboard.getDashboardCharts.invalidate();
      },
      onError: (error) => {
        setActiveOperation(null);
        toast.error(`Failed: ${error.message}`);
      },
    });

  const regenerateChartMutation = api.pipeline.regenerateChartOnly.useMutation({
    onSuccess: () => {
      toast.success("Chart transformer regeneration started");
      void utils.dashboard.getDashboardCharts.invalidate();
    },
    onError: (error) => {
      setActiveOperation(null);
      toast.error(`Failed: ${error.message}`);
    },
  });

  const isAnyMutationPending =
    refreshMetricMutation.isPending ||
    regeneratePipelineMutation.isPending ||
    regenerateIngestionMutation.isPending ||
    regenerateChartMutation.isPending;

  const shouldPoll =
    !!dashboardMetric.metric.refreshStatus ||
    isAnyMutationPending ||
    activeOperation !== null;

  const { data: pipelineProgress } = api.pipeline.getProgress.useQuery(
    { metricId: dashboardMetric.metric.id },
    {
      enabled: shouldPoll,
      refetchInterval: shouldPoll ? 500 : false,
    },
  );

  // Clear activeOperation when polling confirms done
  useEffect(() => {
    if (
      activeOperation !== null &&
      pipelineProgress !== undefined &&
      !pipelineProgress.isProcessing
    ) {
      setActiveOperation(null);
    }
  }, [activeOperation, pipelineProgress]);

  const isProcessing =
    activeOperation !== null ||
    isAnyMutationPending ||
    (pipelineProgress?.isProcessing ?? false) ||
    !!dashboardMetric.metric.refreshStatus;

  const isRegeneratingPipeline =
    activeOperation === "hard-refresh" ||
    activeOperation === "regenerate-chart" ||
    regeneratePipelineMutation.isPending ||
    regenerateChartMutation.isPending ||
    dashboardMetric.metric.refreshStatus === "deleting-old-data" ||
    dashboardMetric.metric.refreshStatus === "deleting-old-transformer" ||
    (pipelineProgress?.completedSteps?.some(
      (s) => s.step === "deleting-old-data",
    ) ??
      false);

  // Detect pipeline completion (isProcessing: true -> false) and refetch charts
  const prevIsProcessingRef = useRef<boolean | null>(null);
  useEffect(() => {
    const prevProcessing = prevIsProcessingRef.current;
    const currentProcessing = pipelineProgress?.isProcessing ?? false;

    if (pipelineProgress !== undefined) {
      prevIsProcessingRef.current = currentProcessing;
    }

    if (prevProcessing === true && currentProcessing === false) {
      const teamId = dashboardMetric.metric.teamId;
      void utils.dashboard.getDashboardCharts.refetch();
      if (teamId) {
        void utils.dashboard.getDashboardCharts.refetch({ teamId });
      }
    }
  }, [
    pipelineProgress?.isProcessing,
    pipelineProgress,
    dashboardMetric.metric.teamId,
    utils.dashboard.getDashboardCharts,
  ]);

  const loadingPhase: LoadingPhase = (() => {
    if (pipelineProgress?.currentStep) {
      return pipelineProgress.currentStep as LoadingPhase;
    }
    if (!isProcessing && !isRegeneratingPipeline) {
      return null;
    }

    // Fallback based on activeOperation or mutation.isPending
    switch (activeOperation) {
      case "hard-refresh":
        return INITIAL_STEPS.hardRefresh;
      case "regenerate-chart":
        return INITIAL_STEPS.regenerateChart;
      case "regenerate-ingestion":
        return INITIAL_STEPS.regenerateIngestion;
      case "soft-refresh":
        return INITIAL_STEPS.softRefresh;
    }
    if (regeneratePipelineMutation.isPending) return INITIAL_STEPS.hardRefresh;
    if (regenerateChartMutation.isPending) return INITIAL_STEPS.regenerateChart;
    if (regenerateIngestionMutation.isPending)
      return INITIAL_STEPS.regenerateIngestion;
    if (refreshMetricMutation.isPending) return INITIAL_STEPS.softRefresh;

    return INITIAL_STEPS.softRefresh;
  })();

  // Track if we've shown error toast to avoid duplicates
  const lastErrorShownRef = useRef<string | null>(null);

  // Show error toast when pipeline fails
  useEffect(() => {
    const error = pipelineProgress?.error;
    if (error && error !== lastErrorShownRef.current) {
      lastErrorShownRef.current = error;
      toast.error("Pipeline failed", {
        description: error,
        duration: 10000, // Show longer for errors
      });
    }
    // Clear ref when no error
    if (!isProcessing) {
      lastErrorShownRef.current = null;
    }
  }, [pipelineProgress?.error, isProcessing]);

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
      try {
        // For manual metrics, regenerate via full pipeline
        if (!isIntegrationMetric) {
          setActiveOperation("hard-refresh");
          await regeneratePipelineMutation.mutateAsync({ metricId: metric.id });
          toast.success("Chart regeneration started");
          return;
        }

        // For integration metrics
        if (!metric.templateId || !metric.integration) return;

        if (forceRebuild) {
          setActiveOperation("hard-refresh");
          await regeneratePipelineMutation.mutateAsync({ metricId: metric.id });
          toast.success("Pipeline regeneration started");
        } else {
          setActiveOperation("soft-refresh");
          await refreshMetricMutation.mutateAsync({ metricId: metric.id });
          toast.success("Data refresh started");
        }
      } catch (error) {
        setActiveOperation(null);
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
   * Note: chartType, cadence, and userPrompt are ignored in current implementation
   */
  const handleRegenerate = useCallback(
    async (
      _chartType?: string,
      _cadence?: "DAILY" | "WEEKLY" | "MONTHLY",
      _userPrompt?: string,
    ) => {
      try {
        setActiveOperation("hard-refresh");
        await regeneratePipelineMutation.mutateAsync({ metricId: metric.id });
        toast.success("Chart regeneration started");
      } catch (error) {
        setActiveOperation(null);
        toast.error("Regeneration failed", {
          description: error instanceof Error ? error.message : "Unknown error",
        });
      }
    },
    [metric.id, regeneratePipelineMutation],
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
    setActiveOperation("regenerate-ingestion");
    regenerateIngestionMutation.mutate({ metricId: metric.id });
  }, [metric.id, regenerateIngestionMutation]);

  const handleRegenerateChart = useCallback(
    (chartType: string, cadence: Cadence, selectedDimension?: string) => {
      setActiveOperation("regenerate-chart");
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
            currentSelectedDimension={
              dashboardMetric.chartTransformer?.selectedDimension ?? null
            }
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
