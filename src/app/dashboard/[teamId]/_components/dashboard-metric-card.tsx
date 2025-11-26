"use client";

import { useCallback, useEffect, useRef, useState } from "react";

import { toast } from "sonner";

import { useConfirmation } from "@/providers/ConfirmationDialogProvider";
import type { RouterOutputs } from "@/trpc/react";
import { api } from "@/trpc/react";

import { DashboardMetricChart } from "./dashboard-metric-chart";
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
  const [isFlipped, setIsFlipped] = useState(false);
  const hasTriggeredRef = useRef(false);

  const utils = api.useUtils();
  const { confirm } = useConfirmation();

  const isPending = dashboardMetric.id.startsWith("temp-");
  const { metric } = dashboardMetric;
  const isIntegrationMetric = !!metric.integrationId;

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
      !isProcessing
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

  const title = chartTransform?.title || metric.name;
  const description = chartTransform?.description || metric.description;

  return (
    <div className="relative h-[380px]" style={{ perspective: "1000px" }}>
      <div
        className="relative h-full w-full transition-transform duration-500"
        style={{
          transformStyle: "preserve-3d",
          transform: isFlipped ? "rotateY(180deg)" : "rotateY(0deg)",
        }}
      >
        <DashboardMetricChart
          title={title}
          chartTransform={chartTransform}
          hasChartData={hasChartData}
          isIntegrationMetric={isIntegrationMetric}
          isPending={isPending}
          isProcessing={isProcessing}
          isRemoving={deleteMetricMutation.isPending}
          onFlip={() => setIsFlipped(true)}
          onRemove={handleRemove}
        />

        <DashboardMetricSettings
          title={title}
          description={description}
          chartTransform={chartTransform}
          hasChartData={hasChartData}
          integrationId={metric.integration?.integrationId ?? null}
          lastFetchedAt={metric.lastFetchedAt}
          isPending={isPending}
          isProcessing={isProcessing}
          isRemoving={deleteMetricMutation.isPending}
          prompt={prompt}
          onPromptChange={setPrompt}
          onFlip={() => setIsFlipped(false)}
          onRemove={handleRemove}
          onRegenerate={handleRegenerate}
          onRefresh={() => handleRefresh()}
        />
      </div>
    </div>
  );
}
