"use client";

import { Label, PolarGrid, RadialBar, RadialBarChart } from "recharts";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart";

import type { ChartComponentProps } from "./types";

export function DashboardRadialChart({
  chartData,
  chartConfig,
  xAxisKey,
  dataKeys,
  title,
  description,
  showTooltip = true,
  centerLabel,
}: ChartComponentProps) {
  const dataKey = dataKeys[0] ?? "value";

  return (
    <Card className="flex flex-col">
      <CardHeader className="items-center pb-0">
        {title && <CardTitle className="text-base">{title}</CardTitle>}
        {description && (
          <CardDescription className="text-xs">{description}</CardDescription>
        )}
      </CardHeader>
      <CardContent className="flex-1 pb-0">
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
      </CardContent>
    </Card>
  );
}
