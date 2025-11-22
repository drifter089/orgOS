"use client";

import { useCallback, useEffect, useRef, useState } from "react";

import { Loader2, RefreshCw, Sparkles, Trash2 } from "lucide-react";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Label,
  Pie,
  PieChart,
  PolarAngleAxis,
  PolarGrid,
  Radar,
  RadarChart,
  RadialBar,
  RadialBarChart,
  XAxis,
  YAxis,
} from "recharts";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  ChartContainer,
  ChartLegend,
  ChartLegendContent,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart";
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

        const previousDashboardMetrics =
          utils.dashboard.getDashboardMetrics.getData();

        if (previousDashboardMetrics) {
          utils.dashboard.getDashboardMetrics.setData(
            undefined,
            previousDashboardMetrics.filter(
              (dm) => dm.id !== dashboardMetricId,
            ),
          );
        }

        return { previousDashboardMetrics };
      },
      onError: (_err, _variables, context) => {
        if (context?.previousDashboardMetrics) {
          utils.dashboard.getDashboardMetrics.setData(
            undefined,
            context.previousDashboardMetrics,
          );
        }
      },
    });

  const refreshMutation = api.dashboard.refreshMetricChart.useMutation({
    onSuccess: (updatedDashboardMetric) => {
      utils.dashboard.getDashboardMetrics.setData(undefined, (old) =>
        old?.map((dm) =>
          dm.id === updatedDashboardMetric.id ? updatedDashboardMetric : dm,
        ),
      );
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
    void handleRefresh(prompt);
  };

  const renderChart = () => {
    if (!chartTransform) return null;

    const {
      chartData,
      chartConfig,
      xAxisKey,
      dataKeys,
      xAxisLabel,
      yAxisLabel,
      showLegend,
      showTooltip,
      stacked,
      centerLabel,
      chartType,
    } = chartTransform;

    // Render Area/Line Chart
    if (chartType === "line" || chartType === "area") {
      return (
        <ChartContainer
          config={chartConfig}
          className="aspect-auto h-[250px] w-full"
        >
          <AreaChart data={chartData}>
            <defs>
              {dataKeys.map((key) => (
                <linearGradient
                  key={key}
                  id={`fill${key}`}
                  x1="0"
                  y1="0"
                  x2="0"
                  y2="1"
                >
                  <stop
                    offset="5%"
                    stopColor={`var(--color-${key})`}
                    stopOpacity={0.8}
                  />
                  <stop
                    offset="95%"
                    stopColor={`var(--color-${key})`}
                    stopOpacity={0.1}
                  />
                </linearGradient>
              ))}
            </defs>
            <CartesianGrid vertical={false} />
            <XAxis
              dataKey={xAxisKey}
              tickLine={false}
              axisLine={false}
              tickMargin={8}
              minTickGap={32}
              tickFormatter={(value: string | number) => {
                const strValue = String(value);
                if (strValue.includes("-") && !isNaN(Date.parse(strValue))) {
                  const date = new Date(strValue);
                  return date.toLocaleDateString("en-US", {
                    month: "short",
                    day: "numeric",
                  });
                }
                return strValue.slice(0, 10);
              }}
              label={
                xAxisLabel
                  ? {
                      value: xAxisLabel,
                      position: "insideBottom",
                      offset: -5,
                      className: "fill-muted-foreground text-xs",
                    }
                  : undefined
              }
            />
            <YAxis
              tickLine={false}
              axisLine={false}
              tickMargin={8}
              label={
                yAxisLabel
                  ? {
                      value: yAxisLabel,
                      angle: -90,
                      position: "insideLeft",
                      className: "fill-muted-foreground text-xs",
                    }
                  : undefined
              }
            />
            {showTooltip && (
              <ChartTooltip
                cursor={false}
                content={
                  <ChartTooltipContent
                    labelFormatter={(value: string | number) => {
                      const strValue = String(value);
                      if (
                        strValue.includes("-") &&
                        !isNaN(Date.parse(strValue))
                      ) {
                        return new Date(strValue).toLocaleDateString("en-US", {
                          month: "short",
                          day: "numeric",
                        });
                      }
                      return strValue;
                    }}
                    indicator="dot"
                  />
                }
              />
            )}
            {dataKeys.map((key) => (
              <Area
                key={key}
                dataKey={key}
                type="natural"
                fill={`url(#fill${key})`}
                stroke={`var(--color-${key})`}
                stackId={stacked ? "a" : undefined}
              />
            ))}
            {showLegend && <ChartLegend content={<ChartLegendContent />} />}
          </AreaChart>
        </ChartContainer>
      );
    }

    // Render Bar Chart
    if (chartType === "bar") {
      return (
        <ChartContainer config={chartConfig} className="h-[250px] w-full">
          <BarChart accessibilityLayer data={chartData}>
            <CartesianGrid vertical={false} />
            <XAxis
              dataKey={xAxisKey}
              tickLine={false}
              tickMargin={10}
              axisLine={false}
              tickFormatter={(value: string | number) =>
                String(value).slice(0, 10)
              }
              label={
                xAxisLabel
                  ? {
                      value: xAxisLabel,
                      position: "insideBottom",
                      offset: -5,
                      className: "fill-muted-foreground text-xs",
                    }
                  : undefined
              }
            />
            <YAxis
              tickLine={false}
              axisLine={false}
              tickMargin={8}
              label={
                yAxisLabel
                  ? {
                      value: yAxisLabel,
                      angle: -90,
                      position: "insideLeft",
                      className: "fill-muted-foreground text-xs",
                    }
                  : undefined
              }
            />
            {showTooltip && (
              <ChartTooltip
                cursor={false}
                content={<ChartTooltipContent indicator="dashed" />}
              />
            )}
            {dataKeys.map((key) => (
              <Bar
                key={key}
                dataKey={key}
                fill={`var(--color-${key})`}
                radius={4}
                stackId={stacked ? "a" : undefined}
              />
            ))}
            {showLegend && <ChartLegend content={<ChartLegendContent />} />}
          </BarChart>
        </ChartContainer>
      );
    }

    // Render Pie Chart
    if (chartType === "pie") {
      const dataKey = dataKeys[0] ?? "value";
      return (
        <ChartContainer
          config={chartConfig}
          className="mx-auto aspect-square h-[250px]"
        >
          <PieChart>
            {showTooltip && (
              <ChartTooltip
                cursor={false}
                content={<ChartTooltipContent hideLabel nameKey={xAxisKey} />}
              />
            )}
            <Pie
              data={chartData}
              dataKey={dataKey}
              nameKey={xAxisKey}
              innerRadius={60}
              outerRadius={100}
              strokeWidth={2}
            >
              {chartData.map((entry, index) => (
                <Cell
                  key={`cell-${index}`}
                  fill={
                    (entry.fill as string) ?? `var(--chart-${(index % 12) + 1})`
                  }
                />
              ))}
              {centerLabel && (
                <Label
                  content={({ viewBox }) => {
                    if (viewBox && "cx" in viewBox && "cy" in viewBox) {
                      return (
                        <text
                          x={viewBox.cx}
                          y={viewBox.cy}
                          textAnchor="middle"
                          dominantBaseline="middle"
                        >
                          <tspan
                            x={viewBox.cx}
                            y={viewBox.cy}
                            className="fill-foreground text-2xl font-bold"
                          >
                            {centerLabel.value}
                          </tspan>
                          <tspan
                            x={viewBox.cx}
                            y={(viewBox.cy ?? 0) + 20}
                            className="fill-muted-foreground text-xs"
                          >
                            {centerLabel.label}
                          </tspan>
                        </text>
                      );
                    }
                  }}
                />
              )}
            </Pie>
            {showLegend && (
              <ChartLegend
                content={<ChartLegendContent nameKey={xAxisKey} />}
              />
            )}
          </PieChart>
        </ChartContainer>
      );
    }

    // Render Radar Chart
    if (chartType === "radar") {
      return (
        <ChartContainer
          config={chartConfig}
          className="mx-auto aspect-square max-h-[250px]"
        >
          <RadarChart data={chartData}>
            {showTooltip && (
              <ChartTooltip cursor={false} content={<ChartTooltipContent />} />
            )}
            <PolarAngleAxis dataKey={xAxisKey} />
            <PolarGrid />
            {dataKeys.map((key) => (
              <Radar
                key={key}
                dataKey={key}
                fill={`var(--color-${key})`}
                fillOpacity={0.6}
                dot={{
                  r: 4,
                  fillOpacity: 1,
                }}
              />
            ))}
            {showLegend && <ChartLegend content={<ChartLegendContent />} />}
          </RadarChart>
        </ChartContainer>
      );
    }

    // Render Radial Chart
    if (chartType === "radial") {
      const dataKey = dataKeys[0] ?? "value";
      return (
        <ChartContainer
          config={chartConfig}
          className="mx-auto aspect-square max-h-[250px]"
        >
          <RadialBarChart data={chartData} innerRadius={30} outerRadius={100}>
            {showTooltip && (
              <ChartTooltip
                cursor={false}
                content={<ChartTooltipContent hideLabel nameKey={xAxisKey} />}
              />
            )}
            <PolarGrid gridType="circle" />
            <RadialBar dataKey={dataKey}>
              {centerLabel && (
                <Label
                  content={({ viewBox }) => {
                    if (viewBox && "cx" in viewBox && "cy" in viewBox) {
                      return (
                        <text
                          x={viewBox.cx}
                          y={viewBox.cy}
                          textAnchor="middle"
                          dominantBaseline="middle"
                        >
                          <tspan
                            x={viewBox.cx}
                            y={viewBox.cy}
                            className="fill-foreground text-2xl font-bold"
                          >
                            {centerLabel.value}
                          </tspan>
                          <tspan
                            x={viewBox.cx}
                            y={(viewBox.cy ?? 0) + 20}
                            className="fill-muted-foreground text-xs"
                          >
                            {centerLabel.label}
                          </tspan>
                        </text>
                      );
                    }
                  }}
                />
              )}
            </RadialBar>
          </RadialBarChart>
        </ChartContainer>
      );
    }

    // Default to Bar Chart
    return (
      <ChartContainer config={chartConfig} className="h-[250px] w-full">
        <BarChart accessibilityLayer data={chartData}>
          <CartesianGrid vertical={false} />
          <XAxis
            dataKey={xAxisKey}
            tickLine={false}
            tickMargin={10}
            axisLine={false}
            tickFormatter={(value: string | number) =>
              String(value).slice(0, 10)
            }
          />
          <YAxis tickLine={false} axisLine={false} tickMargin={8} />
          {showTooltip && (
            <ChartTooltip
              cursor={false}
              content={<ChartTooltipContent indicator="dashed" />}
            />
          )}
          {dataKeys.map((key) => (
            <Bar
              key={key}
              dataKey={key}
              fill={`var(--color-${key})`}
              radius={4}
            />
          ))}
          {showLegend && <ChartLegend content={<ChartLegendContent />} />}
        </BarChart>
      </ChartContainer>
    );
  };

  return (
    <Card
      className={`flex flex-col ${isPending ? "animate-pulse opacity-70" : ""}`}
    >
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <CardTitle className="truncate text-lg">
                {chartTransform?.title || metric.name}
              </CardTitle>
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
            {(chartTransform?.description || metric.description) && (
              <CardDescription className="mt-1 line-clamp-2">
                {chartTransform?.description || metric.description}
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
        {hasChartData && renderChart()}

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
              onClick={() => handleRefresh()}
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
