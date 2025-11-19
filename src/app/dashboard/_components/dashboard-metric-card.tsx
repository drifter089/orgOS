"use client";

import { BarChart3, Loader2, Trash2 } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { useConfirmation } from "@/providers/ConfirmationDialogProvider";
import type { RouterOutputs } from "@/trpc/react";
import { api } from "@/trpc/react";

// Infer types from tRPC router
type DashboardMetrics = RouterOutputs["dashboard"]["getDashboardMetrics"];
type DashboardMetricWithRelations = DashboardMetrics[number];

// Chart type union
export type ChartType =
  | "line"
  | "bar"
  | "area"
  | "pie"
  | "radar"
  | "radial"
  | "kpi";

// Chart transform result type with rich metadata
export interface ChartTransformResult {
  chartType: ChartType;
  chartData: Array<Record<string, string | number>>;
  chartConfig: Record<string, { label: string; color: string }>;
  xAxisKey: string;
  dataKeys: string[];
  // Rich chart metadata
  title: string;
  description: string;
  xAxisLabel: string;
  yAxisLabel: string;
  // Feature flags
  showLegend: boolean;
  showTooltip: boolean;
  stacked?: boolean;
  // Pie/Radial specific
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
  onShowChart?: (chart: DisplayedChart) => void;
}

export function DashboardMetricCard({
  dashboardMetric,
  onShowChart,
}: DashboardMetricCardProps) {
  const utils = api.useUtils();
  const { confirm } = useConfirmation();

  const isPending = dashboardMetric.id.startsWith("temp-");

  // Remove from dashboard mutation with optimistic update
  const removeMetricMutation =
    api.dashboard.removeMetricFromDashboard.useMutation({
      onMutate: async ({ dashboardMetricId }) => {
        // Cancel pending refetches
        await utils.dashboard.getDashboardMetrics.cancel();
        await utils.dashboard.getAvailableMetrics.cancel();

        // Snapshot previous data
        const previousDashboardMetrics =
          utils.dashboard.getDashboardMetrics.getData();
        const previousAvailableMetrics =
          utils.dashboard.getAvailableMetrics.getData();

        // Optimistically remove from dashboard
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

          // Optimistically add back to available metrics
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
        // Revert on error
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

  const handleRemove = async () => {
    const confirmed = await confirm({
      title: "Remove metric from dashboard",
      description: `Are you sure you want to remove "${dashboardMetric.metric.name}" from your dashboard? The metric will still be available to add again later.`,
      confirmText: "Remove",
      variant: "destructive",
    });

    if (confirmed) {
      removeMetricMutation.mutate({
        dashboardMetricId: dashboardMetric.id,
      });
    }
  };

  const { metric } = dashboardMetric;

  // Get chart transform result from graphConfig
  const chartTransform =
    dashboardMetric.graphConfig as unknown as ChartTransformResult | null;
  const hasChartData = !!(
    chartTransform?.chartData && chartTransform.chartData.length > 0
  );

  const handleShowChart = () => {
    if (chartTransform && onShowChart) {
      onShowChart({
        id: dashboardMetric.id,
        metricName: metric.name,
        chartTransform,
      });
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
              {isPending && (
                <Badge
                  variant="outline"
                  className="text-muted-foreground text-xs"
                >
                  <Loader2 className="mr-1 h-3 w-3 animate-spin" />
                  Saving...
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
            className="flex-shrink-0"
          >
            {removeMetricMutation.isPending ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Trash2 className="text-muted-foreground hover:text-destructive h-4 w-4" />
            )}
          </Button>
        </div>

        {/* Metric Stats */}
        <div className="text-muted-foreground mt-2 flex gap-4 text-sm">
          <div>
            <span className="font-medium">Current: </span>
            {metric.currentValue !== null
              ? `${metric.currentValue}${metric.unit ? ` ${metric.unit}` : ""}`
              : "N/A"}
          </div>
          {metric.targetValue !== null && (
            <div>
              <span className="font-medium">Target: </span>
              {metric.targetValue}
              {metric.unit ? ` ${metric.unit}` : ""}
            </div>
          )}
        </div>
      </CardHeader>

      <CardContent className="flex-1 space-y-4">
        {hasChartData && onShowChart && (
          <Button
            variant="secondary"
            size="sm"
            onClick={handleShowChart}
            className="w-full"
          >
            <BarChart3 className="mr-2 h-3 w-3" />
            Show Chart
          </Button>
        )}

        {!hasChartData && (
          <div className="text-muted-foreground rounded-md border border-dashed p-3 text-center text-sm">
            No chart configured yet
          </div>
        )}

        {/* Last Fetched */}
        {metric.lastFetchedAt && (
          <div className="text-muted-foreground text-xs">
            Last updated: {new Date(metric.lastFetchedAt).toLocaleString()}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
