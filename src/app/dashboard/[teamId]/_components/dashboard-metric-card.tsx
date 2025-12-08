"use client";

import { useCallback, useState } from "react";

import {
  AlertCircle,
  BarChart3,
  Loader2,
  Settings,
  Trash2,
  Users,
} from "lucide-react";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import type { ChartTransformResult } from "@/lib/metrics/transformer-types";
import { useConfirmation } from "@/providers/ConfirmationDialogProvider";
import type { RouterOutputs } from "@/trpc/react";
import { api } from "@/trpc/react";

import { DashboardMetricChart } from "./dashboard-metric-chart";
import { DashboardMetricRoles } from "./dashboard-metric-roles";
import { DashboardMetricSettings } from "./dashboard-metric-settings";

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
  dashboardMetric: DashboardMetricWithRelations;
}

export function DashboardMetricCard({
  dashboardMetric,
}: DashboardMetricCardProps) {
  const [prompt, setPrompt] = useState("");
  const [isProcessing, setIsProcessing] = useState(false);
  const [activeTab, setActiveTab] = useState("chart");

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
        await utils.dashboard.getDashboardCharts.invalidate();
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
    refreshMetricMutation,
    utils.dashboard.getDashboardCharts,
  ]);

  /**
   * Regenerate chart with AI using optional prompt
   */
  const handleRegenerate = useCallback(
    async (userPrompt?: string) => {
      setIsProcessing(true);
      try {
        const result = await regenerateChartMutation.mutateAsync({
          dashboardChartId: dashboardMetric.id,
          userPrompt,
        });

        if (result.success) {
          toast.success("Chart regenerated");
          // Invalidate to refetch with new chart config
          await utils.dashboard.getDashboardCharts.invalidate();
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

  const title = chartTransform?.title ?? metric.name;

  return (
    <Tabs
      value={activeTab}
      onValueChange={setActiveTab}
      className="relative h-[380px]"
    >
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

      <TabsList className="bg-muted/80 absolute top-4 right-3 z-10 h-7 backdrop-blur-sm">
        <TabsTrigger value="chart" className="h-6 px-2 text-xs">
          <BarChart3 className="h-3 w-3" />
        </TabsTrigger>
        <TabsTrigger value="roles" className="h-6 px-2 text-xs">
          <Users className="h-3 w-3" />
        </TabsTrigger>
        {isIntegrationMetric && (
          <TabsTrigger value="settings" className="h-6 px-2 text-xs">
            <Settings className="h-3 w-3" />
          </TabsTrigger>
        )}
        <Button
          variant="ghost"
          size="icon"
          onClick={handleRemove}
          disabled={isPending || deleteMetricMutation.isPending}
          className="ml-1 h-6 w-6 flex-shrink-0 rounded-md"
          title="Remove from dashboard"
        >
          {deleteMetricMutation.isPending ? (
            <Loader2 className="h-3 w-3 animate-spin" />
          ) : (
            <Trash2 className="text-muted-foreground hover:text-destructive h-3 w-3" />
          )}
        </Button>
      </TabsList>

      <div className="relative h-full w-full overflow-hidden">
        <TabsContent
          value="chart"
          className="animate-tab-slide-in absolute inset-0 m-0 data-[state=inactive]:hidden"
        >
          <DashboardMetricChart
            title={title}
            chartTransform={chartTransform}
            hasChartData={hasChartData}
            isIntegrationMetric={isIntegrationMetric}
            isPending={isPending}
            isProcessing={isProcessing}
            integrationId={metric.integration?.providerId}
          />
        </TabsContent>

        <TabsContent
          value="roles"
          className="animate-tab-slide-in absolute inset-0 m-0 data-[state=inactive]:hidden"
        >
          <DashboardMetricRoles title={title} roles={roles} />
        </TabsContent>

        {isIntegrationMetric && (
          <TabsContent
            value="settings"
            className="animate-tab-slide-in absolute inset-0 m-0 data-[state=inactive]:hidden"
          >
            <DashboardMetricSettings
              metricId={metric.id}
              metricName={metric.name}
              metricDescription={metric.description}
              chartTransform={chartTransform}
              hasChartData={hasChartData}
              integrationId={metric.integration?.providerId ?? null}
              lastFetchedAt={metric.lastFetchedAt}
              lastError={metric.lastError}
              pollFrequency={metric.pollFrequency}
              isProcessing={isProcessing}
              isUpdating={updateMetricMutation.isPending}
              prompt={prompt}
              onPromptChange={setPrompt}
              onRegenerate={() => handleRegenerate(prompt || undefined)}
              onRefresh={handleRefresh}
              onUpdateMetric={handleUpdateMetric}
            />
          </TabsContent>
        )}
      </div>
    </Tabs>
  );
}
