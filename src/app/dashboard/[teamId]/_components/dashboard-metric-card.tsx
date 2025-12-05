"use client";

import { useCallback, useState } from "react";

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
  const isIntegrationMetric = !!metric.integrationId;
  const roles = metric.roles ?? [];

  const chartTransform =
    dashboardMetric.graphConfig as unknown as ChartTransformResult | null;
  const hasChartData = !!(
    chartTransform?.chartData && chartTransform.chartData.length > 0
  );

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

  // Direct mutations for save (transform removed - see METRICS_ARCHITECTURE_PLAN.md)
  const updateChartMutation =
    api.dashboard.updateDashboardMetricChart.useMutation();
  const updateMetricMutation = api.metric.update.useMutation({
    onSuccess: (updatedMetric) => {
      const teamId = metric.teamId;
      utils.dashboard.getDashboardMetrics.setData(undefined, (old) =>
        old?.map((dm) =>
          dm.metric.id === updatedMetric.id
            ? { ...dm, metric: { ...dm.metric, ...updatedMetric } }
            : dm,
        ),
      );
      if (teamId) {
        utils.dashboard.getDashboardMetrics.setData({ teamId }, (old) =>
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
   * TODO: Chart refresh will be reimplemented as part of METRICS_ARCHITECTURE_PLAN.md
   *
   * The new flow will:
   * 1. Fetch data via MetricTransformer
   * 2. Store in MetricDataPoints
   * 3. Execute ChartTransformer to update graphConfig
   *
   * For now, refresh is disabled.
   */
  const handleRefresh = useCallback(
    async (_userHint?: string) => {
      if (!isIntegrationMetric || !metric.metricTemplate || !metric.integration)
        return;

      toast.info(
        "Chart refresh is temporarily disabled. Will be available after architecture update.",
      );
    },
    [isIntegrationMetric, metric.metricTemplate, metric.integration],
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

  const handleRegenerate = () => {
    void handleRefresh(prompt);
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
            integrationId={metric.integration?.integrationId}
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
              integrationId={metric.integration?.integrationId ?? null}
              lastFetchedAt={metric.lastFetchedAt}
              isProcessing={isProcessing}
              isUpdating={updateMetricMutation.isPending}
              prompt={prompt}
              onPromptChange={setPrompt}
              onRegenerate={handleRegenerate}
              onRefresh={() => handleRefresh()}
              onUpdateMetric={handleUpdateMetric}
            />
          </TabsContent>
        )}
      </div>
    </Tabs>
  );
}
