"use client";

import {
  Area,
  AreaChart,
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

import type { AreaChartProps } from "./types";
import { formatAxisLabel, formatYAxisLabel, hasLongLabels } from "./utils";

export function MetricAreaChart({
  chartData,
  chartConfig,
  xAxisKey,
  dataKeys,
  xAxisLabel,
  yAxisLabel,
  showLegend = true,
  showTooltip = true,
  stacked = true,
  goalValue,
  goalLabel,
  className,
}: AreaChartProps) {
  const needsRotation = hasLongLabels(chartData, xAxisKey);

  return (
    <ChartContainer
      config={chartConfig}
      className={cn(
        needsRotation
          ? "aspect-auto h-[240px] w-full"
          : "aspect-auto h-[220px] w-full",
        className,
      )}
    >
      <AreaChart
        data={chartData}
        margin={needsRotation ? { bottom: 30 } : undefined}
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
          tickMargin={8}
          minTickGap={32}
          angle={needsRotation ? -35 : 0}
          textAnchor={needsRotation ? "end" : "middle"}
          height={needsRotation ? 50 : 30}
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
            content={
              <ChartTooltipContent
                labelFormatter={(value: string | number) => {
                  const strValue = String(value);
                  if (strValue.includes("-") && !isNaN(Date.parse(strValue))) {
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
      </AreaChart>
    </ChartContainer>
  );
}
