"use client";

import { useCallback, useEffect, useRef, useState } from "react";

import { BarChart3, Loader2, Settings, Trash2, Users } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useConfirmation } from "@/providers/ConfirmationDialogProvider";
import type { RouterOutputs } from "@/trpc/react";
import { api } from "@/trpc/react";

import { DashboardMetricChart } from "./dashboard-metric-chart";
import { DashboardMetricRoles } from "./dashboard-metric-roles";
import { DashboardMetricSettings } from "./dashboard-metric-settings";

type DashboardMetrics = RouterOutputs["dashboard"]["getDashboardMetrics"];
type DashboardMetricWithRelations = DashboardMetrics[number];

export type ChartType =
  | "line"
  | "bar"
  | "area"
  | "pie"
  | "radar"
  | "radial"
  | "kpi";

export interface ChartTransformResult {
  chartType: ChartType;
  chartData: Array<Record<string, string | number>>;
  chartConfig: Record<string, { label: string; color: string }>;
  xAxisKey: string;
  dataKeys: string[];
  title: string;
  description: string;
  xAxisLabel: string;
  yAxisLabel: string;
  showLegend: boolean;
  showTooltip: boolean;
  stacked?: boolean;
  centerLabel?: { value: string; label: string };
  reasoning: string;
}

export interface DisplayedChart {
  id: string;
  metricName: string;
  chartTransform: ChartTransformResult;
}

interface DashboardMetricCardProps {
  dashboardMetric: DashboardMetricWithRelations;
  autoTrigger?: boolean;
}

export function DashboardMetricCard({
  dashboardMetric,
  autoTrigger = true,
}: DashboardMetricCardProps) {
  const [prompt, setPrompt] = useState("");
  const [isProcessing, setIsProcessing] = useState(false);
  const [activeTab, setActiveTab] = useState("chart");
  const hasTriggeredRef = useRef(false);

  const utils = api.useUtils();
  const { confirm } = useConfirmation();

  const isPending = dashboardMetric.id.startsWith("temp-");
  const { metric } = dashboardMetric;
  const isIntegrationMetric = !!metric.integrationId;
  const roles = metric.roles ?? [];

  const chartTransform =
    dashboardMetric.graphConfig as unknown as ChartTransformResult | null;
  const hasChartData = !!(
    chartTransform?.chartData && chartTransform.chartData.length > 0
  );
  // Check if metric is being processed (created from dialog with prefetch)
  const isBeingProcessed = !!(
    dashboardMetric.graphConfig as Record<string, unknown> | null
  )?._processing;

  const deleteMetricMutation = api.metric.delete.useMutation({
    onMutate: async ({ id }) => {
      const teamId = metric.teamId;

      await utils.dashboard.getDashboardMetrics.cancel();
      if (teamId) {
        await utils.dashboard.getDashboardMetrics.cancel({ teamId });
      }

      const previousUnscopedMetrics =
        utils.dashboard.getDashboardMetrics.getData();
      const previousTeamMetrics = teamId
        ? utils.dashboard.getDashboardMetrics.getData({ teamId })
        : undefined;

      if (previousUnscopedMetrics) {
        utils.dashboard.getDashboardMetrics.setData(
          undefined,
          previousUnscopedMetrics.filter((dm) => dm.metric.id !== id),
        );
      }

      if (teamId && previousTeamMetrics) {
        utils.dashboard.getDashboardMetrics.setData(
          { teamId },
          previousTeamMetrics.filter((dm) => dm.metric.id !== id),
        );
      }

      return { previousUnscopedMetrics, previousTeamMetrics, teamId };
    },
    onError: (err, _variables, context) => {
      if (context?.previousUnscopedMetrics) {
        utils.dashboard.getDashboardMetrics.setData(
          undefined,
          context.previousUnscopedMetrics,
        );
      }
      if (context?.teamId && context?.previousTeamMetrics) {
        utils.dashboard.getDashboardMetrics.setData(
          { teamId: context.teamId },
          context.previousTeamMetrics,
        );
      }
      toast.info(err.message);
    },
  });

  const refreshMutation = api.dashboard.refreshMetricChart.useMutation({
    onSuccess: (updatedDashboardMetric) => {
      const teamId = updatedDashboardMetric.metric.teamId;

      utils.dashboard.getDashboardMetrics.setData(undefined, (old) =>
        old?.map((dm) =>
          dm.id === updatedDashboardMetric.id ? updatedDashboardMetric : dm,
        ),
      );

      if (teamId) {
        utils.dashboard.getDashboardMetrics.setData({ teamId }, (old) =>
          old?.map((dm) =>
            dm.id === updatedDashboardMetric.id ? updatedDashboardMetric : dm,
          ),
        );
      }
    },
  });

  const handleRefresh = useCallback(
    async (userHint?: string) => {
      if (!isIntegrationMetric) return;

      setIsProcessing(true);
      try {
        await refreshMutation.mutateAsync({
          dashboardMetricId: dashboardMetric.id,
          userHint: userHint ?? undefined,
        });
      } catch (error) {
        console.error("Refresh failed:", error);
      } finally {
        setIsProcessing(false);
        setPrompt("");
      }
    },
    [isIntegrationMetric, refreshMutation, dashboardMetric.id],
  );

  useEffect(() => {
    if (
      autoTrigger &&
      isIntegrationMetric &&
      !hasChartData &&
      !isPending &&
      !hasTriggeredRef.current &&
      !isProcessing &&
      !isBeingProcessed // Don't trigger if metric is being created with prefetch
    ) {
      hasTriggeredRef.current = true;
      void handleRefresh();
    }
  }, [
    autoTrigger,
    isIntegrationMetric,
    hasChartData,
    isPending,
    isProcessing,
    isBeingProcessed,
    handleRefresh,
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

  const handleRegenerate = () => {
    void handleRefresh(prompt);
  };

  const title = chartTransform?.title ?? metric.name;
  const description = chartTransform?.description ?? metric.description;

  return (
    <Tabs
      value={activeTab}
      onValueChange={setActiveTab}
      className="relative h-[380px]"
    >
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
              title={title}
              description={description}
              chartTransform={chartTransform}
              hasChartData={hasChartData}
              integrationId={metric.integration?.integrationId ?? null}
              lastFetchedAt={metric.lastFetchedAt}
              isProcessing={isProcessing}
              prompt={prompt}
              onPromptChange={setPrompt}
              onRegenerate={handleRegenerate}
              onRefresh={() => handleRefresh()}
            />
          </TabsContent>
        )}
      </div>
    </Tabs>
  );
}
