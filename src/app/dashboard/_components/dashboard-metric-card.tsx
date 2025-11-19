"use client";

import { useState } from "react";

import {
  BarChart3,
  ChevronDown,
  ChevronUp,
  Database,
  Loader2,
  Sparkles,
  Trash2,
} from "lucide-react";

import { JsonViewer } from "@/components/json-viewer";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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

// Chart transform result type
export interface ChartTransformResult {
  chartType: ChartType;
  chartData: Array<Record<string, string | number>>;
  chartConfig: Record<string, { label: string; color: string }>;
  xAxisKey: string;
  dataKeys: string[];
  reasoning: string;
}

export interface DisplayedChart {
  id: string;
  metricName: string;
  chartTransform: ChartTransformResult;
}

// Available chart types for the dropdown
const CHART_TYPES = [
  { value: "line", label: "Line" },
  { value: "area", label: "Area" },
  { value: "bar", label: "Bar" },
  { value: "pie", label: "Pie" },
  { value: "radar", label: "Radar" },
  { value: "radial", label: "Radial" },
] as const;

interface DashboardMetricCardProps {
  dashboardMetric: DashboardMetricWithRelations;
  onShowChart?: (chart: DisplayedChart) => void;
}

export function DashboardMetricCard({
  dashboardMetric,
  onShowChart,
}: DashboardMetricCardProps) {
  const [chartDataExpanded, setChartDataExpanded] = useState(true);
  const [transformHint, setTransformHint] = useState("");
  const [fetchedData, setFetchedData] = useState<unknown>(null);

  const utils = api.useUtils();
  const { confirm } = useConfirmation();

  // Check if this is a pending optimistic update (temp ID)
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
        // Only invalidate available metrics to sync with server
        // Dashboard metrics are already correctly updated in onMutate
        await utils.dashboard.getAvailableMetrics.invalidate();
      },
    });

  // Fetch metric data mutation
  const fetchDataMutation = api.dashboard.fetchMetricData.useMutation({
    onSuccess: (result) => {
      setFetchedData(result.data);
    },
  });

  // Transform with AI mutation
  const transformMutation = api.dashboard.transformMetricForChart.useMutation();
  const updateConfigMutation = api.dashboard.updateGraphConfig.useMutation({
    onSuccess: (updatedDashboardMetric) => {
      // Direct cache update instead of invalidation
      utils.dashboard.getDashboardMetrics.setData(undefined, (old) =>
        old?.map((dm) =>
          dm.id === updatedDashboardMetric.id ? updatedDashboardMetric : dm,
        ),
      );
      setTransformHint("");
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

  const handleFetchData = () => {
    fetchDataMutation.mutate({
      metricId: dashboardMetric.metric.id,
    });
  };

  const handleTransform = async () => {
    try {
      const result = await transformMutation.mutateAsync({
        metricId: dashboardMetric.metric.id,
        rawData: fetchedData ?? undefined,
        userHint: transformHint || undefined,
      });

      if (result.success && result.data) {
        await updateConfigMutation.mutateAsync({
          dashboardMetricId: dashboardMetric.id,
          chartTransform: result.data,
        });
      }
    } catch (error) {
      console.error("Transform failed:", error);
    }
  };

  const { metric } = dashboardMetric;
  const isIntegrationMetric = !!metric.integrationId;

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

  const handleChartTypeChange = async (newType: string) => {
    if (!chartTransform) return;

    // Update the chart config with the new type
    await updateConfigMutation.mutateAsync({
      dashboardMetricId: dashboardMetric.id,
      chartTransform: {
        ...chartTransform,
        chartType: newType as ChartType,
      },
    });
  };

  const isFetching = fetchDataMutation.isPending;
  const isTransforming =
    transformMutation.isPending || updateConfigMutation.isPending;

  // AI button is enabled only if data has been fetched
  const canTransform = fetchedData !== null;

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
                <Select
                  value={chartTransform?.chartType}
                  onValueChange={handleChartTypeChange}
                  disabled={updateConfigMutation.isPending}
                >
                  <SelectTrigger className="border-primary/50 h-7 w-[100px] text-xs font-medium">
                    <SelectValue placeholder="Chart type" />
                  </SelectTrigger>
                  <SelectContent>
                    {CHART_TYPES.map((type) => (
                      <SelectItem key={type.value} value={type.value}>
                        {type.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
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
        {/* Action Buttons - Fetch Data and Transform */}
        {isIntegrationMetric && (
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={handleFetchData}
              disabled={isPending || isFetching}
              className="flex-1"
            >
              {isFetching ? (
                <>
                  <Loader2 className="mr-2 h-3 w-3 animate-spin" />
                  Fetching...
                </>
              ) : (
                <>
                  <Database className="mr-2 h-3 w-3" />
                  Fetch Data
                </>
              )}
            </Button>
            <Button
              size="sm"
              onClick={handleTransform}
              disabled={isPending || !canTransform || isTransforming}
              className="flex-1"
              title={
                !canTransform
                  ? "Fetch data first before transforming"
                  : undefined
              }
            >
              {isTransforming ? (
                <>
                  <Loader2 className="mr-2 h-3 w-3 animate-spin" />
                  Analyzing...
                </>
              ) : (
                <>
                  <Sparkles className="mr-2 h-3 w-3" />
                  Transform with AI
                </>
              )}
            </Button>
          </div>
        )}

        {/* Show Chart Button - enabled after AI transform */}
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

        {/* Transform Hint Input */}
        {canTransform && (
          <Input
            placeholder="Optional: 'show as pie chart' or 'group by week'"
            value={transformHint}
            onChange={(e) => setTransformHint(e.target.value)}
            disabled={isTransforming}
            className="text-sm"
          />
        )}

        {/* Fetched Raw Data Preview */}
        {fetchedData !== null && (
          <div className="space-y-2">
            <div className="text-sm font-medium">Raw Fetched Data</div>
            <JsonViewer data={fetchedData} maxPreviewHeight="200px" />
          </div>
        )}

        {/* AI Reasoning */}
        {chartTransform?.reasoning && (
          <div className="bg-muted/50 rounded-md p-3">
            <div className="mb-1 flex items-center gap-2 text-xs font-medium">
              <Sparkles className="h-3 w-3" />
              AI Analysis
            </div>
            <p className="text-muted-foreground text-sm">
              {chartTransform.reasoning}
            </p>
          </div>
        )}

        {/* Transformed Chart Config Preview */}
        {hasChartData && (
          <div className="space-y-2">
            <button
              onClick={() => setChartDataExpanded(!chartDataExpanded)}
              className="hover:text-primary flex items-center gap-2 text-sm font-medium transition-colors"
            >
              {chartDataExpanded ? (
                <ChevronUp className="h-4 w-4" />
              ) : (
                <ChevronDown className="h-4 w-4" />
              )}
              Transformed Chart Data ({chartTransform?.chartData?.length ?? 0}{" "}
              points)
            </button>

            {chartDataExpanded && (
              <div className="space-y-3">
                {/* Summary */}
                <div className="bg-muted/30 rounded-md px-3 py-2">
                  <div className="flex flex-wrap gap-3 text-xs">
                    <span>
                      <strong>Type:</strong> {chartTransform?.chartType}
                    </span>
                    <span>
                      <strong>X-Axis:</strong> {chartTransform?.xAxisKey}
                    </span>
                    <span>
                      <strong>Data Keys:</strong>{" "}
                      {chartTransform?.dataKeys?.join(", ")}
                    </span>
                  </div>
                </div>

                {/* Full Transform Result */}
                <JsonViewer data={chartTransform} maxPreviewHeight="250px" />
              </div>
            )}
          </div>
        )}

        {/* No chart data message */}
        {!hasChartData && !fetchedData && (
          <div className="text-muted-foreground rounded-md border border-dashed p-4 text-center text-sm">
            Click &quot;Fetch Data&quot; to load raw data, then &quot;Transform
            with AI&quot; to generate chart config.
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
