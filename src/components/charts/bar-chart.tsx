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
  return (
    <Card>
      <CardHeader className="pb-2">
        {title && <CardTitle className="text-base">{title}</CardTitle>}
        {description && (
          <CardDescription className="text-xs">{description}</CardDescription>
        )}
      </CardHeader>
      <CardContent>
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
