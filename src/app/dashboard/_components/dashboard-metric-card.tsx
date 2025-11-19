"use client";

import { useEffect, useRef, useState } from "react";

import { Loader2, RefreshCw, Sparkles, Trash2 } from "lucide-react";

import {
  DashboardAreaChart,
  DashboardBarChart,
  DashboardPieChart,
  DashboardRadarChart,
  DashboardRadialChart,
} from "@/components/charts";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { useConfirmation } from "@/providers/ConfirmationDialogProvider";
import type { RouterOutputs } from "@/trpc/react";
import { api } from "@/trpc/react";

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

  const removeMetricMutation =
    api.dashboard.removeMetricFromDashboard.useMutation({
      onMutate: async ({ dashboardMetricId }) => {
        await utils.dashboard.getDashboardMetrics.cancel();
        await utils.dashboard.getAvailableMetrics.cancel();

        const previousDashboardMetrics =
          utils.dashboard.getDashboardMetrics.getData();
        const previousAvailableMetrics =
          utils.dashboard.getAvailableMetrics.getData();

        if (previousDashboardMetrics) {
          const removedMetric = previousDashboardMetrics.find(
            (dm) => dm.id === dashboardMetricId,
          );

          utils.dashboard.getDashboardMetrics.setData(
            undefined,
            previousDashboardMetrics.filter(
              (dm) => dm.id !== dashboardMetricId,
            ),
          );

          if (removedMetric && previousAvailableMetrics) {
            utils.dashboard.getAvailableMetrics.setData(undefined, [
              ...previousAvailableMetrics,
              removedMetric.metric,
            ]);
          }
        }

        return { previousDashboardMetrics, previousAvailableMetrics };
      },
      onError: (_err, _variables, context) => {
        if (context?.previousDashboardMetrics) {
          utils.dashboard.getDashboardMetrics.setData(
            undefined,
            context.previousDashboardMetrics,
          );
        }
        if (context?.previousAvailableMetrics) {
          utils.dashboard.getAvailableMetrics.setData(
            undefined,
            context.previousAvailableMetrics,
          );
        }
      },
      onSettled: async () => {
        await utils.dashboard.getAvailableMetrics.invalidate();
      },
    });

  const fetchDataMutation = api.dashboard.fetchMetricData.useMutation();
  const transformMutation = api.dashboard.transformMetricForChart.useMutation();
  const updateConfigMutation = api.dashboard.updateGraphConfig.useMutation({
    onSuccess: (updatedDashboardMetric) => {
      utils.dashboard.getDashboardMetrics.setData(undefined, (old) =>
        old?.map((dm) =>
          dm.id === updatedDashboardMetric.id ? updatedDashboardMetric : dm,
        ),
      );
    },
  });

  const handleFetchAndTransform = async (userHint?: string) => {
    if (!isIntegrationMetric) return;

    setIsProcessing(true);
    try {
      const fetchResult = await fetchDataMutation.mutateAsync({
        metricId: metric.id,
      });

      const transformResult = await transformMutation.mutateAsync({
        metricId: metric.id,
        rawData: fetchResult.data,
        userHint: userHint || undefined,
      });

      if (transformResult.success && transformResult.data) {
        await updateConfigMutation.mutateAsync({
          dashboardMetricId: dashboardMetric.id,
          chartTransform: transformResult.data,
        });
      }
    } catch (error) {
      console.error("Fetch and transform failed:", error);
    } finally {
      setIsProcessing(false);
      setPrompt("");
    }
  };

  // Auto-trigger fetch and transform for new metrics
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
      void handleFetchAndTransform();
    }
  }, [autoTrigger, isIntegrationMetric, hasChartData, isPending, isProcessing]);

  const handleRemove = async () => {
    const confirmed = await confirm({
      title: "Remove metric from dashboard",
      description: `Are you sure you want to remove "${metric.name}" from your dashboard? The metric will still be available to add again later.`,
      confirmText: "Remove",
      variant: "destructive",
    });

    if (confirmed) {
      removeMetricMutation.mutate({
        dashboardMetricId: dashboardMetric.id,
      });
    }
  };

  const handleRegenerate = () => {
    void handleFetchAndTransform(prompt);
  };

  const renderChart = () => {
    if (!chartTransform) return null;

    const chartProps = {
      chartData: chartTransform.chartData,
      chartConfig: chartTransform.chartConfig,
      xAxisKey: chartTransform.xAxisKey,
      dataKeys: chartTransform.dataKeys,
      title: "",
      description: "",
      xAxisLabel: chartTransform.xAxisLabel,
      yAxisLabel: chartTransform.yAxisLabel,
      showLegend: chartTransform.showLegend,
      showTooltip: chartTransform.showTooltip,
      stacked: chartTransform.stacked,
      centerLabel: chartTransform.centerLabel,
    };

    switch (chartTransform.chartType) {
      case "line":
      case "area":
        return <DashboardAreaChart {...chartProps} />;
      case "bar":
        return <DashboardBarChart {...chartProps} />;
      case "pie":
        return <DashboardPieChart {...chartProps} />;
      case "radar":
        return <DashboardRadarChart {...chartProps} />;
      case "radial":
        return <DashboardRadialChart {...chartProps} />;
      default:
        return <DashboardBarChart {...chartProps} />;
    }
  };

  return (
    <Card
      className={`flex flex-col ${isPending ? "animate-pulse opacity-70" : ""}`}
    >
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <CardTitle className="truncate text-lg">{metric.name}</CardTitle>
              {(isPending || isProcessing) && (
                <Badge
                  variant="outline"
                  className="text-muted-foreground text-xs"
                >
                  <Loader2 className="mr-1 h-3 w-3 animate-spin" />
                  {isPending ? "Saving..." : "Processing..."}
                </Badge>
              )}
              {metric.integration && (
                <Badge variant="secondary" className="text-xs">
                  {metric.integration.integrationId}
                </Badge>
              )}
              {hasChartData && (
                <Badge variant="outline" className="text-xs">
                  {chartTransform?.chartType}
                </Badge>
              )}
            </div>
            {metric.description && (
              <CardDescription className="mt-1 line-clamp-2">
                {metric.description}
              </CardDescription>
            )}
          </div>
          <Button
            variant="ghost"
            size="icon"
            onClick={handleRemove}
            disabled={isPending || removeMetricMutation.isPending}
            className="h-8 w-8 flex-shrink-0"
          >
            {removeMetricMutation.isPending ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Trash2 className="text-muted-foreground hover:text-destructive h-4 w-4" />
            )}
          </Button>
        </div>
      </CardHeader>

      <CardContent className="flex-1 space-y-3">
        {hasChartData && (
          <div className="rounded-md border p-2">{renderChart()}</div>
        )}

        {!hasChartData && !isProcessing && (
          <div className="text-muted-foreground rounded-md border border-dashed p-4 text-center text-sm">
            {isIntegrationMetric
              ? "Loading chart..."
              : "Manual metrics don't have charts"}
          </div>
        )}

        {isProcessing && (
          <div className="flex items-center justify-center rounded-md border border-dashed p-8">
            <div className="text-center">
              <Loader2 className="text-muted-foreground mx-auto h-6 w-6 animate-spin" />
              <p className="text-muted-foreground mt-2 text-sm">
                Fetching data and generating chart...
              </p>
            </div>
          </div>
        )}

        {hasChartData && isIntegrationMetric && (
          <div className="flex items-center gap-2">
            <Input
              placeholder="Try: 'pie chart' or 'by month'"
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              disabled={isProcessing}
              className="h-8 text-xs"
              onKeyDown={(e) => {
                if (e.key === "Enter" && !isProcessing) {
                  handleRegenerate();
                }
              }}
            />
            <Button
              variant="outline"
              size="icon"
              onClick={handleRegenerate}
              disabled={isProcessing}
              className="h-8 w-8 flex-shrink-0"
              title="Regenerate chart"
            >
              {isProcessing ? (
                <Loader2 className="h-3 w-3 animate-spin" />
              ) : (
                <Sparkles className="h-3 w-3" />
              )}
            </Button>
            <Button
              variant="outline"
              size="icon"
              onClick={() => handleFetchAndTransform()}
              disabled={isProcessing}
              className="h-8 w-8 flex-shrink-0"
              title="Refetch data"
            >
              <RefreshCw className="h-3 w-3" />
            </Button>
          </div>
        )}

        {metric.lastFetchedAt && (
          <div className="text-muted-foreground text-xs">
            Updated: {new Date(metric.lastFetchedAt).toLocaleString()}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
