"use client";

import type { MetricGoal, Role } from "@prisma/client";
import { AlertTriangle, Info, Loader2, Target, User } from "lucide-react";
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
import { formatValue } from "@/lib/helpers/format-value";
import { getUserName } from "@/lib/helpers/get-user-name";
import { getLatestMetricValue } from "@/lib/metrics/get-latest-value";
import { getPlatformConfig } from "@/lib/platform-config";
import { cn } from "@/lib/utils";
import type { GoalProgress } from "@/server/api/utils/goal-calculation";
import { calculateGoalTargetValue } from "@/server/api/utils/goal-calculation";
import { api } from "@/trpc/react";

import type { ChartTransformResult } from "./dashboard-metric-card";

export type LoadingPhase =
  | "fetching-api"
  | "running-transformer"
  | "ai-regenerating"
  | "saving-data"
  | "updating-chart"
  | null;

function getLoadingMessage(phase: LoadingPhase | undefined): string {
  switch (phase) {
    case "fetching-api":
      return "Fetching data from API...";
    case "running-transformer":
      return "Processing data...";
    case "ai-regenerating":
      return "AI is regenerating...";
    case "saving-data":
      return "Saving data points...";
    case "updating-chart":
      return "Updating chart...";
    default:
      return "Processing...";
  }
}

interface DashboardMetricChartProps {
  title: string;
  chartTransform: ChartTransformResult | null;
  hasChartData: boolean;
  isIntegrationMetric: boolean;
  isPending: boolean;
  isProcessing: boolean;
  loadingPhase?: LoadingPhase;
  integrationId?: string | null;
  roles?: Role[];
  // Goal data from parent - eliminates N+1 query
  goal?: MetricGoal | null;
  goalProgress?: GoalProgress | null;
  // Value label from DataIngestionTransformer (e.g., "commits", "stars", "issues")
  valueLabel?: string | null;
}

export function DashboardMetricChart({
  title,
  chartTransform,
  hasChartData,
  isIntegrationMetric,
  isPending,
  isProcessing,
  loadingPhase,
  integrationId,
  roles = [],
  goal,
  goalProgress,
  valueLabel,
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
    goal && goalProgress ? calculateGoalTargetValue(goal, goalProgress) : null;

  const currentValue = getLatestMetricValue(chartTransform);

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
                strokeDasharray="4 4"
                strokeWidth={2}
                label={{
                  value: `Goal: ${formatValue(goalTargetValue)}`,
                  position: "right",
                  fill: "hsl(var(--destructive))",
                  fontSize: 10,
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
                strokeDasharray="4 4"
                strokeWidth={2}
                label={{
                  value: `Goal: ${formatValue(goalTargetValue)}`,
                  position: "right",
                  fill: "hsl(var(--destructive))",
                  fontSize: 10,
                }}
              />
            )}
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
              strokeDasharray="4 4"
              strokeWidth={2}
              label={{
                value: `Goal: ${formatValue(goalTargetValue)}`,
                position: "right",
                fill: "hsl(var(--destructive))",
                fontSize: 10,
              }}
            />
          )}
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
      className={`flex h-full flex-col ${isPending ? "animate-pulse opacity-70" : ""}`}
    >
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
          {(isPending || isProcessing || loadingPhase) && (
            <Badge
              variant="outline"
              className="text-muted-foreground shrink-0 text-[10px]"
            >
              <Loader2 className="mr-1 h-2.5 w-2.5 animate-spin" />
              {isPending
                ? "Saving..."
                : loadingPhase === "fetching-api"
                  ? "Fetching..."
                  : loadingPhase === "running-transformer"
                    ? "Transforming..."
                    : loadingPhase === "ai-regenerating"
                      ? "AI Regenerating..."
                      : loadingPhase === "saving-data"
                        ? "Saving..."
                        : loadingPhase === "updating-chart"
                          ? "Updating..."
                          : "Processing..."}
            </Badge>
          )}
        </div>

        {currentValue && (
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-bold tracking-tight">
              {formatValue(currentValue.value)}
            </span>
            {/* Show valueLabel from transformer, fallback to chart data key */}
            <span className="text-muted-foreground text-xs">
              {valueLabel ??
                chartTransform?.dataKeys?.[0] ??
                chartTransform?.title?.split(" ")[0] ??
                ""}
            </span>
            {goalTargetValue !== null && goalProgress && (
              <span className="text-muted-foreground ml-auto flex items-center gap-1 text-xs">
                <Target className="text-destructive h-3 w-3" />
                <span className="text-destructive">
                  {formatValue(goalTargetValue)}
                  {valueLabel && (
                    <span className="ml-0.5 text-[10px]">{valueLabel}</span>
                  )}
                </span>
                <span className="text-muted-foreground">
                  ({Math.round(goalProgress.progressPercent)}%)
                </span>
              </span>
            )}
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
              {assignedUserName ? (
                <>
                  <span>•</span>
                  <User className="h-2.5 w-2.5" />
                  <span>{assignedUserName}</span>
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

          {hasNoGoal && (
            <span className="text-muted-foreground ml-auto flex items-center gap-1">
              <AlertTriangle className="h-2.5 w-2.5 text-amber-500" />
              <span className="text-amber-500">No goal</span>
            </span>
          )}
        </div>

        {currentValue?.date && (
          <p className="text-muted-foreground/70 text-[10px]">
            {currentValue.date}
          </p>
        )}
      </CardHeader>

      <CardContent className="relative flex flex-1 flex-col overflow-hidden px-4 pt-0 pb-4">
        {hasChartData && renderChart()}

        {!hasChartData && !isProcessing && !loadingPhase && (
          <div className="text-muted-foreground flex flex-1 items-center justify-center rounded-md border border-dashed p-4 text-center text-sm">
            {isIntegrationMetric
              ? "Loading chart..."
              : "Add data points via check-in to see chart"}
          </div>
        )}

        {(isProcessing || loadingPhase) && hasChartData && (
          <div className="bg-background/80 absolute inset-0 flex items-center justify-center rounded-md backdrop-blur-sm">
            <div className="text-center">
              <Loader2 className="text-muted-foreground mx-auto h-6 w-6 animate-spin" />
              <p className="text-muted-foreground mt-2 text-sm">
                {getLoadingMessage(loadingPhase)}
              </p>
            </div>
          </div>
        )}

        {(isProcessing || loadingPhase) && !hasChartData && (
          <div className="flex flex-1 items-center justify-center rounded-md border border-dashed">
            <div className="text-center">
              <Loader2 className="text-muted-foreground mx-auto h-6 w-6 animate-spin" />
              <p className="text-muted-foreground mt-2 text-sm">
                {getLoadingMessage(loadingPhase)}
              </p>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
