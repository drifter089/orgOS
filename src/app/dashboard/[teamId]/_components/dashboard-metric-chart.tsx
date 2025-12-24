"use client";

import { useMemo } from "react";

import type { MetricGoal, Role } from "@prisma/client";
import { format } from "date-fns";
import {
  AlertTriangle,
  Calendar,
  Clock,
  Info,
  Loader2,
  Target,
  User,
} from "lucide-react";
import { Link } from "next-transition-router";
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
  ReferenceLine,
  XAxis,
  YAxis,
} from "recharts";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  ChartContainer,
  ChartLegend,
  ChartLegendContent,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { type GoalProgress, calculateTargetDisplayValue } from "@/lib/goals";
import { formatValue } from "@/lib/helpers/format-value";
import { getUserName } from "@/lib/helpers/get-user-name";
import { getLatestMetricValue } from "@/lib/metrics/get-latest-value";
import type { ChartTransformResult } from "@/lib/metrics/transformer-types";
import { getPlatformConfig } from "@/lib/platform-config";
import { cn } from "@/lib/utils";
import { api } from "@/trpc/react";

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

  const { data: members } = api.organization.getMembers.useQuery();

  const primaryRole = roles[0];
  const assignedUserName = primaryRole
    ? getUserName(primaryRole.assignedUserId, members)
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

  // Generate a stable key for chart re-renders (no JSON serialization)
  const chartKey = useMemo(() => {
    if (!chartTransform?.chartData?.length) return "empty";
    // Use length and chart type as a cheap stable key
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

    // Render Area/Line Chart
    if (chartType === "line" || chartType === "area") {
      return (
        <ChartContainer
          config={chartConfig}
          className="aspect-auto h-[220px] w-full"
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
            {goalTargetValue !== null && (
              <ReferenceLine
                y={goalTargetValue}
                stroke="hsl(var(--destructive))"
                strokeDasharray="8 4"
                strokeWidth={2.5}
                label={{
                  value: `Target: ${formatValue(goalTargetValue)}`,
                  position: "insideTopRight",
                  fill: "hsl(var(--destructive))",
                  fontSize: 11,
                  fontWeight: 600,
                }}
              />
            )}
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
            {dataKeys.map((key, index) => (
              <Area
                key={key}
                dataKey={key}
                type="natural"
                fill={`url(#fill${key})`}
                stroke={`var(--color-${key})`}
                stackId={stacked ? "a" : undefined}
                isAnimationActive={true}
                animationDuration={800}
                animationEasing="ease-out"
                animationBegin={index * 100}
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
        <ChartContainer config={chartConfig} className="h-[220px] w-full">
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
            {goalTargetValue !== null && (
              <ReferenceLine
                y={goalTargetValue}
                stroke="hsl(var(--destructive))"
                strokeDasharray="8 4"
                strokeWidth={2.5}
                label={{
                  value: `Target: ${formatValue(goalTargetValue)}`,
                  position: "insideTopRight",
                  fill: "hsl(var(--destructive))",
                  fontSize: 11,
                  fontWeight: 600,
                }}
              />
            )}
            {showTooltip && (
              <ChartTooltip
                cursor={false}
                content={<ChartTooltipContent indicator="dashed" />}
              />
            )}
            {dataKeys.map((key, index) => (
              <Bar
                key={key}
                dataKey={key}
                fill={`var(--color-${key})`}
                radius={4}
                stackId={stacked ? "a" : undefined}
                isAnimationActive={true}
                animationDuration={600}
                animationEasing="ease-out"
                animationBegin={index * 80}
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
          className="mx-auto h-[250px] w-full"
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
              isAnimationActive={true}
              animationDuration={800}
              animationEasing="ease-out"
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
          className="mx-auto h-[250px] w-full"
        >
          <RadarChart data={chartData}>
            {showTooltip && (
              <ChartTooltip cursor={false} content={<ChartTooltipContent />} />
            )}
            <PolarAngleAxis dataKey={xAxisKey} />
            <PolarGrid />
            {dataKeys.map((key, index) => (
              <Radar
                key={key}
                dataKey={key}
                fill={`var(--color-${key})`}
                fillOpacity={0.6}
                dot={{
                  r: 4,
                  fillOpacity: 1,
                }}
                isAnimationActive={true}
                animationDuration={800}
                animationEasing="ease-out"
                animationBegin={index * 100}
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
          className="mx-auto h-[250px] w-full"
        >
          <RadialBarChart data={chartData} innerRadius={30} outerRadius={100}>
            {showTooltip && (
              <ChartTooltip
                cursor={false}
                content={<ChartTooltipContent hideLabel nameKey={xAxisKey} />}
              />
            )}
            <PolarGrid gridType="circle" />
            <RadialBar
              dataKey={dataKey}
              isAnimationActive={true}
              animationDuration={1000}
              animationEasing="ease-out"
            >
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
      <ChartContainer config={chartConfig} className="h-[220px] w-full">
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
          {goalTargetValue !== null && (
            <ReferenceLine
              y={goalTargetValue}
              stroke="hsl(var(--destructive))"
              strokeDasharray="8 4"
              strokeWidth={2.5}
              label={{
                value: `Target: ${formatValue(goalTargetValue)}`,
                position: "insideTopRight",
                fill: "hsl(var(--destructive))",
                fontSize: 11,
                fontWeight: 600,
              }}
            />
          )}
          {showTooltip && (
            <ChartTooltip
              cursor={false}
              content={<ChartTooltipContent indicator="dashed" />}
            />
          )}
          {dataKeys.map((key, index) => (
            <Bar
              key={key}
              dataKey={key}
              fill={`var(--color-${key})`}
              radius={4}
              isAnimationActive={true}
              animationDuration={600}
              animationEasing="ease-out"
              animationBegin={index * 80}
            />
          ))}
          {showLegend && <ChartLegend content={<ChartLegendContent />} />}
        </BarChart>
      </ChartContainer>
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
            {/* Chart description tooltip - always visible if chart exists */}
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
            {/* Spacer to push platform badge to the right */}
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
              <span className="text-muted-foreground ml-auto flex items-center gap-1 text-xs">
                <Target className="text-destructive h-3 w-3" />
                <span className="text-destructive font-medium">
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
                <div className="bg-muted h-1.5 w-16 overflow-hidden rounded-full">
                  <div
                    className="h-full bg-blue-500 transition-all duration-300"
                    style={{ width: `${Math.min(timeElapsedPercent, 100)}%` }}
                  />
                </div>
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
          <div className="flex items-center gap-1.5 text-[10px]">
            <AlertTriangle className="h-3 w-3 text-amber-500" />
            <span className="text-amber-500">No goal set</span>
          </div>
        )}

        <div className="flex items-center gap-2 text-[10px]">
          {primaryRole ? (
            <span className="text-muted-foreground flex items-center gap-1">
              <div
                className="h-2 w-2 rounded-full"
                style={{ backgroundColor: primaryRole.color }}
              />
              <span className="font-medium">{primaryRole.title}</span>
              {assignedUserName && primaryRole.assignedUserId ? (
                <>
                  <span>•</span>
                  <User className="h-2.5 w-2.5" />
                  <Link
                    href={`/member/${primaryRole.assignedUserId}`}
                    className="hover:text-foreground hover:underline"
                  >
                    {assignedUserName}
                  </Link>
                </>
              ) : (
                <span className="text-warning flex items-center gap-0.5">
                  <AlertTriangle className="h-2.5 w-2.5 text-amber-500" />
                </span>
              )}
            </span>
          ) : (
            <span className="text-muted-foreground flex items-center gap-1">
              <AlertTriangle className="h-2.5 w-2.5 text-amber-500" />
              <span className="text-amber-500">No role</span>
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
            className="animate-in fade-in zoom-in-95 h-full w-full duration-500 ease-out"
          >
            {renderChart()}
          </div>
        )}

        {/* Processing state - show loading */}
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

        {/* No data state */}
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
