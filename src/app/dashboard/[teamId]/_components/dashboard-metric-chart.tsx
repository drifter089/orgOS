"use client";

import { useMemo } from "react";

import type { MetricGoal, Role } from "@prisma/client";
import { format } from "date-fns";
import { Calendar, Clock, Info, Loader2, Target } from "lucide-react";

import {
  MetricAreaChart,
  MetricBarChart,
  MetricPieChart,
  MetricRadarChart,
  MetricRadialChart,
} from "@/components/charts";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { type GoalProgress, calculateTargetDisplayValue } from "@/lib/goals";
import { formatValue } from "@/lib/helpers/format-value";
import { getLatestMetricValue } from "@/lib/metrics/get-latest-value";
import type { ChartTransformResult } from "@/lib/metrics/transformer-types";
import { getPlatformConfig } from "@/lib/platform-config";
import { cn } from "@/lib/utils";

/**
 * Format time remaining based on cadence
 * - DAILY or < 1 day: show hours (e.g., "8 hrs")
 * - WEEKLY/MONTHLY: show days (e.g., "3 days")
 */
function formatTimeRemaining(goalProgress: GoalProgress): string {
  if (goalProgress.cadence === "DAILY" || goalProgress.daysRemaining < 1) {
    const hours = Math.max(0, Math.round(goalProgress.hoursRemaining));
    return `${hours}h`;
  }
  const days = Math.max(0, Math.round(goalProgress.daysRemaining));
  return `${days}d`;
}

interface DashboardMetricChartProps {
  title: string;
  chartTransform: ChartTransformResult | null;
  hasChartData: boolean;
  isIntegrationMetric: boolean;
  integrationId?: string | null;
  roles?: Role[];
  goal?: MetricGoal | null;
  goalProgress?: GoalProgress | null;
  valueLabel?: string | null;
  /** Whether the metric is currently processing */
  isProcessing?: boolean;
}

export function DashboardMetricChart({
  title,
  chartTransform,
  hasChartData,
  isIntegrationMetric,
  integrationId,
  roles = [],
  goal,
  goalProgress,
  valueLabel,
  isProcessing = false,
}: DashboardMetricChartProps) {
  const platformConfig = integrationId
    ? getPlatformConfig(integrationId)
    : null;

  const hasNoGoal = !goal;

  // Calculate goal target value using the shared utility
  const goalTargetValue =
    goal && goalProgress
      ? calculateTargetDisplayValue(
          goal.goalType,
          goal.targetValue,
          goal.baselineValue ?? goalProgress.baselineValue,
        )
      : null;

  const currentValue = getLatestMetricValue(chartTransform);

  // Calculate time elapsed percentage for the goal period
  const timeElapsedPercent = goalProgress
    ? (goalProgress.daysElapsed /
        (goalProgress.daysElapsed + goalProgress.daysRemaining)) *
      100
    : null;

  // Calculate data availability percentage (where latest data point falls in goal period)
  const dataAvailabilityPercent = useMemo(() => {
    if (!goalProgress || !chartTransform?.chartData?.length) return null;

    const { chartData, xAxisKey } = chartTransform;
    const latestData = chartData[chartData.length - 1];
    if (!latestData) return null;

    const dateValue = latestData[xAxisKey];
    if (!dateValue || typeof dateValue !== "string") return null;
    if (!dateValue.includes("-") || isNaN(Date.parse(dateValue))) return null;

    const latestDataDate = new Date(dateValue);
    const periodStart = new Date(goalProgress.periodStart);
    const periodEnd = new Date(goalProgress.periodEnd);

    if (latestDataDate < periodStart) return 0;
    if (latestDataDate > periodEnd) return 100;

    const totalMs = periodEnd.getTime() - periodStart.getTime();
    const elapsedMs = latestDataDate.getTime() - periodStart.getTime();

    return (elapsedMs / totalMs) * 100;
  }, [goalProgress, chartTransform]);

  // Generate a stable key for chart re-renders
  const chartKey = useMemo(() => {
    if (!chartTransform?.chartData?.length) return "empty";
    return `${chartTransform.chartType}-${chartTransform.chartData.length}`;
  }, [chartTransform?.chartData?.length, chartTransform?.chartType]);

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

    const goalLabel = goalTargetValue
      ? `Goal: ${formatValue(goalTargetValue)}`
      : undefined;

    if (chartType === "line" || chartType === "area") {
      return (
        <MetricAreaChart
          chartData={chartData}
          chartConfig={chartConfig}
          xAxisKey={xAxisKey}
          dataKeys={dataKeys}
          xAxisLabel={xAxisLabel}
          yAxisLabel={yAxisLabel}
          showLegend={showLegend}
          showTooltip={showTooltip}
          stacked={stacked}
          goalValue={goalTargetValue}
          goalLabel={goalLabel}
        />
      );
    }

    if (chartType === "bar") {
      return (
        <MetricBarChart
          chartData={chartData}
          chartConfig={chartConfig}
          xAxisKey={xAxisKey}
          dataKeys={dataKeys}
          xAxisLabel={xAxisLabel}
          yAxisLabel={yAxisLabel}
          showLegend={showLegend}
          showTooltip={showTooltip}
          stacked={stacked}
          goalValue={goalTargetValue}
          goalLabel={goalLabel}
        />
      );
    }

    if (chartType === "pie") {
      return (
        <MetricPieChart
          chartData={chartData}
          chartConfig={chartConfig}
          xAxisKey={xAxisKey}
          dataKeys={dataKeys}
          showLegend={showLegend}
          showTooltip={showTooltip}
          centerLabel={centerLabel}
        />
      );
    }

    if (chartType === "radar") {
      return (
        <MetricRadarChart
          chartData={chartData}
          chartConfig={chartConfig}
          xAxisKey={xAxisKey}
          dataKeys={dataKeys}
          showLegend={showLegend}
          showTooltip={showTooltip}
        />
      );
    }

    if (chartType === "radial") {
      return (
        <MetricRadialChart
          chartData={chartData}
          chartConfig={chartConfig}
          xAxisKey={xAxisKey}
          dataKeys={dataKeys}
          showTooltip={showTooltip}
          centerLabel={centerLabel}
        />
      );
    }

    // Default to Bar Chart
    return (
      <MetricBarChart
        chartData={chartData}
        chartConfig={chartConfig}
        xAxisKey={xAxisKey}
        dataKeys={dataKeys}
        showLegend={showLegend}
        showTooltip={showTooltip}
        goalValue={goalTargetValue}
        goalLabel={goalLabel}
      />
    );
  };

  return (
    <Card className="flex h-[420px] flex-col">
      <CardHeader className="flex-shrink-0 space-y-0.5 px-5 pt-3 pb-1">
        <div className="flex items-center justify-between gap-2">
          <div className="flex min-w-0 items-center gap-1.5">
            <CardTitle className="truncate text-sm font-medium">
              {title}
            </CardTitle>
            {chartTransform && (
              <Tooltip>
                <TooltipTrigger asChild>
                  <button
                    type="button"
                    className="text-muted-foreground/60 hover:text-muted-foreground shrink-0 transition-colors"
                  >
                    <Info className="h-3 w-3" />
                  </button>
                </TooltipTrigger>
                <TooltipContent side="bottom" className="max-w-[280px]">
                  <p className="text-xs">
                    {chartTransform.description ??
                      `Showing ${chartTransform.chartType} chart with ${chartTransform.dataKeys?.join(", ") ?? "data"}`}
                  </p>
                </TooltipContent>
              </Tooltip>
            )}
            <div className="flex-1" />
            {platformConfig && (
              <Badge
                className={cn(
                  "shrink-0 text-[10px]",
                  platformConfig.bgColor,
                  platformConfig.textColor,
                )}
              >
                {platformConfig.name}
              </Badge>
            )}
          </div>
          {isProcessing && (
            <Badge
              variant="outline"
              className="text-muted-foreground shrink-0 text-[10px]"
            >
              <Loader2 className="mr-1 h-2.5 w-2.5 animate-spin" />
              Processing...
            </Badge>
          )}
        </div>

        {currentValue && (
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-bold tracking-tight">
              {formatValue(currentValue.value)}
            </span>
            <span className="text-muted-foreground text-xs">
              {chartTransform?.valueLabelOverride ??
                chartTransform?.valueLabel ??
                valueLabel ??
                chartTransform?.dataKeys?.[0] ??
                ""}
            </span>
            {goalTargetValue !== null && goalProgress && (
              <span
                className="ml-auto flex items-center gap-1 text-xs"
                style={{ color: "var(--goal)" }}
              >
                <Target className="h-3 w-3" />
                <span className="font-medium">
                  {formatValue(goalTargetValue)}
                </span>
              </span>
            )}
          </div>
        )}

        {goalProgress && (
          <div className="flex items-center gap-4 text-[10px]">
            <div className="flex items-center gap-1.5">
              <Target className="text-muted-foreground h-3 w-3" />
              <div className="bg-muted h-1.5 w-16 overflow-hidden rounded-full">
                <div
                  className={cn(
                    "h-full transition-all duration-300",
                    goalProgress.progressPercent >= 100
                      ? "bg-green-500"
                      : goalProgress.progressPercent >= 70
                        ? "bg-primary"
                        : "bg-amber-500",
                  )}
                  style={{
                    width: `${Math.min(goalProgress.progressPercent, 100)}%`,
                  }}
                />
              </div>
              <span className="font-medium">
                {Math.round(goalProgress.progressPercent)}%
              </span>
            </div>

            {timeElapsedPercent !== null && (
              <div className="flex items-center gap-1.5">
                <Clock className="text-muted-foreground h-3 w-3" />
                <Tooltip>
                  <TooltipTrigger asChild>
                    <div className="relative h-1.5 w-16">
                      <div className="bg-muted absolute inset-0 overflow-hidden rounded-full">
                        <div
                          className="h-full bg-blue-500 transition-all duration-300"
                          style={{
                            width: `${Math.min(timeElapsedPercent, 100)}%`,
                          }}
                        />
                      </div>
                      {dataAvailabilityPercent !== null && (
                        <div
                          className="absolute -top-0.5 h-2.5 w-0.5 rounded-full bg-amber-500 shadow-sm"
                          style={{
                            left: `${Math.min(dataAvailabilityPercent, 100)}%`,
                          }}
                        />
                      )}
                    </div>
                  </TooltipTrigger>
                  <TooltipContent side="bottom" className="text-xs">
                    <p>Time elapsed: {Math.round(timeElapsedPercent)}%</p>
                    {dataAvailabilityPercent !== null && (
                      <p className="text-amber-500">
                        Data up to: {currentValue?.date ?? "unknown"}
                      </p>
                    )}
                  </TooltipContent>
                </Tooltip>
                <span className="text-muted-foreground">
                  {formatTimeRemaining(goalProgress)} left
                </span>
              </div>
            )}

            <div className="text-muted-foreground ml-auto flex items-center gap-1">
              <Calendar className="h-3 w-3" />
              <span>
                {format(new Date(goalProgress.periodStart), "MMM d")} -{" "}
                {format(new Date(goalProgress.periodEnd), "MMM d")}
              </span>
            </div>
          </div>
        )}

        {hasNoGoal && (
          <div className="text-muted-foreground/60 flex items-center gap-1.5 text-[10px]">
            <Target className="h-3 w-3" />
            <span>No goal</span>
          </div>
        )}

        <div className="flex items-center gap-2 text-[10px]">
          {roles.length > 0 ? (
            <div className="text-muted-foreground flex items-center gap-2">
              {roles.slice(0, 3).map((role) => (
                <span key={role.id} className="flex items-center gap-1">
                  <div
                    className="h-2 w-2 rounded-full"
                    style={{ backgroundColor: role.color }}
                  />
                  <span className="font-medium">{role.title}</span>
                </span>
              ))}
            </div>
          ) : (
            <span className="text-muted-foreground/60 flex items-center gap-1">
              <div className="bg-muted-foreground/30 h-2 w-2 rounded-full" />
              <span>No role</span>
            </span>
          )}

          {currentValue?.date && (
            <span className="text-muted-foreground/70 ml-auto">
              {currentValue.date}
            </span>
          )}
        </div>
      </CardHeader>

      <CardContent className="relative flex flex-1 flex-col overflow-hidden px-4 pt-0 pb-4">
        {hasChartData && (
          <div
            key={chartKey}
            className="animate-in fade-in h-full w-full duration-300"
          >
            {renderChart()}
          </div>
        )}

        {!hasChartData && isProcessing && (
          <div className="animate-in fade-in flex flex-1 items-center justify-center rounded-md border border-dashed p-4 duration-300">
            <div className="text-center">
              <div className="bg-primary/10 mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full">
                <Loader2 className="text-primary h-6 w-6 animate-spin" />
              </div>
              <p className="text-muted-foreground text-sm">
                Building your chart...
              </p>
            </div>
          </div>
        )}

        {!hasChartData && !isProcessing && (
          <div className="text-muted-foreground animate-in fade-in flex flex-1 items-center justify-center rounded-md border border-dashed p-4 text-center text-sm duration-300">
            {isIntegrationMetric
              ? "No data available"
              : "Add data points via check-in to see chart"}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
