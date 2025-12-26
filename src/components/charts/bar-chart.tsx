"use client";

import { Bar, BarChart, CartesianGrid, XAxis, YAxis } from "recharts";

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
  // Handle date strings
  if (strValue.includes("-") && !isNaN(Date.parse(strValue))) {
    const date = new Date(strValue);
    return date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
  }
  // Abbreviate long labels
  if (strValue.length > 12) {
    return strValue.slice(0, 10) + "…";
  }
  return strValue;
}

export function DashboardBarChart({
  chartData,
  chartConfig,
  xAxisKey,
  dataKeys,
  title,
  description,
  xAxisLabel,
  yAxisLabel,
  showLegend = false,
  showTooltip = true,
  stacked = false,
}: ChartComponentProps) {
  // Check if labels are long (need rotation)
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
      <CardContent>
        <ChartContainer
          config={chartConfig}
          className={hasLongLabels ? "h-[280px] w-full" : "h-[250px] w-full"}
        >
          <BarChart
            accessibilityLayer
            data={chartData}
            margin={hasLongLabels ? { bottom: 40 } : undefined}
          >
            <CartesianGrid vertical={false} />
            <XAxis
              dataKey={xAxisKey}
              tickLine={false}
              tickMargin={hasLongLabels ? 8 : 10}
              axisLine={false}
              angle={hasLongLabels ? -35 : 0}
              textAnchor={hasLongLabels ? "end" : "middle"}
              height={hasLongLabels ? 60 : 30}
              interval={0}
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
      </CardContent>
    </Card>
  );
}
