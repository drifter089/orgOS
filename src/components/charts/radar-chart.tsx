"use client";

import { PolarAngleAxis, PolarGrid, Radar, RadarChart } from "recharts";

import {
  ChartContainer,
  ChartLegend,
  ChartLegendContent,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart";
import { cn } from "@/lib/utils";

import type { RadarChartProps } from "./types";

export function MetricRadarChart({
  chartData,
  chartConfig,
  xAxisKey,
  dataKeys,
  showLegend = true,
  showTooltip = true,
  className,
}: RadarChartProps) {
  return (
    <ChartContainer
      config={chartConfig}
      className={cn("mx-auto h-[250px] w-full", className)}
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
