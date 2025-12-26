"use client";

import { Cell, Label, Pie, PieChart } from "recharts";

import {
  ChartContainer,
  ChartLegend,
  ChartLegendContent,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart";
import { cn } from "@/lib/utils";

import type { PieChartProps } from "./types";

export function MetricPieChart({
  chartData,
  chartConfig,
  xAxisKey,
  dataKeys,
  showLegend = true,
  showTooltip = true,
  centerLabel,
  className,
}: PieChartProps) {
  const dataKey = dataKeys[0] ?? "value";

  return (
    <ChartContainer
      config={chartConfig}
      className={cn("mx-auto h-[250px] w-full", className)}
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
          <ChartLegend content={<ChartLegendContent nameKey={xAxisKey} />} />
        )}
      </PieChart>
    </ChartContainer>
  );
}
