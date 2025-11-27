"use client";

import { Loader2 } from "lucide-react";
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
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  ChartContainer,
  ChartLegend,
  ChartLegendContent,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart";

import type { ChartTransformResult } from "./dashboard-metric-card";

export type LoadingPhase =
  | "fetching-api"
  | "ai-transforming"
  | "loading-chart"
  | null;

interface DashboardMetricChartProps {
  title: string;
  chartTransform: ChartTransformResult | null;
  hasChartData: boolean;
  isIntegrationMetric: boolean;
  isPending: boolean;
  isProcessing: boolean;
  loadingPhase?: LoadingPhase;
}

export function DashboardMetricChart({
  title,
  chartTransform,
  hasChartData,
  isIntegrationMetric,
  isPending,
  isProcessing,
  loadingPhase,
}: DashboardMetricChartProps) {
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
      className={`flex h-full flex-col ${isPending ? "animate-pulse opacity-70" : ""}`}
    >
      <CardHeader className="flex-shrink-0 pb-2">
        <div className="flex items-center justify-between gap-2 pr-24">
          <CardTitle className="truncate text-lg">{title}</CardTitle>
          {(isPending || isProcessing || loadingPhase) && (
            <Badge variant="outline" className="text-muted-foreground text-xs">
              <Loader2 className="mr-1 h-3 w-3 animate-spin" />
              {isPending
                ? "Saving..."
                : loadingPhase === "fetching-api"
                  ? "Fetching..."
                  : loadingPhase === "ai-transforming"
                    ? "AI analyzing..."
                    : loadingPhase === "loading-chart"
                      ? "Loading..."
                      : "Processing..."}
            </Badge>
          )}
        </div>
      </CardHeader>

      <CardContent className="flex flex-1 flex-col overflow-hidden">
        {hasChartData && renderChart()}

        {!hasChartData && !isProcessing && (
          <div className="text-muted-foreground flex flex-1 items-center justify-center rounded-md border border-dashed text-center text-sm">
            {isIntegrationMetric
              ? "Loading chart..."
              : "Manual metrics don't have charts"}
          </div>
        )}

        {(isProcessing || loadingPhase) && (
          <div className="flex flex-1 items-center justify-center rounded-md border border-dashed">
            <div className="text-center">
              <Loader2 className="text-muted-foreground mx-auto h-6 w-6 animate-spin" />
              <p className="text-muted-foreground mt-2 text-sm">
                {loadingPhase === "fetching-api"
                  ? "Fetching data from API..."
                  : loadingPhase === "ai-transforming"
                    ? "AI is analyzing your data..."
                    : loadingPhase === "loading-chart"
                      ? "Rendering chart..."
                      : "Generating chart..."}
              </p>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
