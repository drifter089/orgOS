"use client";

import {
  Bar,
  BarChart,
  CartesianGrid,
  ReferenceLine,
  XAxis,
  YAxis,
} from "recharts";

import {
  ChartContainer,
  ChartLegend,
  ChartLegendContent,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart";
import { formatValue } from "@/lib/helpers/format-value";
import { cn } from "@/lib/utils";

import type { BarChartProps } from "./types";
import { formatAxisLabel, formatYAxisLabel, hasLongLabels } from "./utils";

export function MetricBarChart({
  chartData,
  chartConfig,
  xAxisKey,
  dataKeys,
  xAxisLabel,
  yAxisLabel,
  showLegend = false,
  showTooltip = true,
  stacked = false,
  goalValue,
  goalLabel,
  className,
}: BarChartProps) {
  const needsRotation = hasLongLabels(chartData, xAxisKey);

  return (
    <ChartContainer
      config={chartConfig}
      className={cn(
        needsRotation ? "h-[240px] w-full" : "h-[220px] w-full",
        className,
      )}
    >
      <BarChart
        accessibilityLayer
        data={chartData}
        margin={needsRotation ? { bottom: 30 } : undefined}
      >
        <CartesianGrid vertical={false} />
        <XAxis
          dataKey={xAxisKey}
          tickLine={false}
          tickMargin={needsRotation ? 8 : 10}
          axisLine={false}
          angle={needsRotation ? -35 : 0}
          textAnchor={needsRotation ? "end" : "middle"}
          height={needsRotation ? 50 : 30}
          interval={0}
          tickFormatter={formatAxisLabel}
          tick={{ fontSize: 11 }}
          label={
            xAxisLabel
              ? {
                  value: xAxisLabel,
                  position: "insideBottom",
                  offset: needsRotation ? -25 : -5,
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
          tickFormatter={formatYAxisLabel}
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
        {goalValue != null && (
          <ReferenceLine
            y={goalValue}
            stroke="var(--goal)"
            strokeDasharray="6 3"
            strokeWidth={2}
            className="goal-line-animated"
            label={{
              value: goalLabel ?? `Goal: ${formatValue(goalValue)}`,
              position: "insideTopLeft",
              fill: "var(--goal)",
              fontSize: 11,
              fontWeight: 700,
            }}
          />
        )}
        {showLegend && <ChartLegend content={<ChartLegendContent />} />}
      </BarChart>
    </ChartContainer>
  );
}
