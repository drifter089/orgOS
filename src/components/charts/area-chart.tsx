"use client";

import { Area, AreaChart, CartesianGrid, XAxis, YAxis } from "recharts";

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

import type { ChartComponentProps } from "./types";

function formatAxisLabel(value: string | number): string {
  const strValue = String(value);
  if (strValue.includes("-") && !isNaN(Date.parse(strValue))) {
    const date = new Date(strValue);
    return date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
  }
  if (strValue.length > 12) {
    return strValue.slice(0, 10) + "…";
  }
  return strValue;
}

export function DashboardAreaChart({
  chartData,
  chartConfig,
  xAxisKey,
  dataKeys,
  title,
  description,
  xAxisLabel,
  yAxisLabel,
  showLegend = true,
  showTooltip = true,
  stacked = true,
}: ChartComponentProps) {
  const hasLongLabels = chartData.some((d) => {
    const rawLabel = d[xAxisKey];
    const label =
      typeof rawLabel === "string" || typeof rawLabel === "number"
        ? String(rawLabel)
        : "";
    return label.length > 8;
  });

  return (
    <Card>
      <CardHeader className="pb-2">
        {title && <CardTitle className="text-base">{title}</CardTitle>}
        {description && (
          <CardDescription className="text-xs">{description}</CardDescription>
        )}
      </CardHeader>
      <CardContent className="px-2 pt-4 sm:px-6 sm:pt-6">
        <ChartContainer
          config={chartConfig}
          className={
            hasLongLabels
              ? "aspect-auto h-[280px] w-full"
              : "aspect-auto h-[250px] w-full"
          }
        >
          <AreaChart
            data={chartData}
            margin={hasLongLabels ? { bottom: 40 } : undefined}
          >
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
              tickMargin={hasLongLabels ? 8 : 8}
              minTickGap={32}
              angle={hasLongLabels ? -35 : 0}
              textAnchor={hasLongLabels ? "end" : "middle"}
              height={hasLongLabels ? 60 : 30}
              tickFormatter={formatAxisLabel}
              tick={{ fontSize: 11 }}
              label={
                xAxisLabel
                  ? {
                      value: xAxisLabel,
                      position: "insideBottom",
                      offset: hasLongLabels ? -35 : -5,
                      className: "fill-muted-foreground text-xs",
                    }
                  : undefined
              }
            />
            <YAxis
              tickLine={false}
              axisLine={false}
              tickMargin={8}
              width={45}
              tick={{ fontSize: 11 }}
              tickFormatter={(value: number) => {
                if (value >= 1000000) return `${(value / 1000000).toFixed(1)}M`;
                if (value >= 1000) return `${(value / 1000).toFixed(1)}K`;
                return String(value);
              }}
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
      </CardContent>
    </Card>
  );
}
