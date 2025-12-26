"use client";

import { Label, PolarGrid, RadialBar, RadialBarChart } from "recharts";

import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart";
import { cn } from "@/lib/utils";

import type { RadialChartProps } from "./types";

export function MetricRadialChart({
  chartData,
  chartConfig,
  xAxisKey,
  dataKeys,
  showTooltip = true,
  centerLabel,
  className,
}: RadialChartProps) {
  const dataKey = dataKeys[0] ?? "value";

  return (
    <ChartContainer
      config={chartConfig}
      className={cn("mx-auto h-[250px] w-full", className)}
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
