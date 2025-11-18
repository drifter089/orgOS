"use client";

import { PolarGrid, RadialBar, RadialBarChart } from "recharts";

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
            <ChartTooltip
              cursor={false}
              content={<ChartTooltipContent hideLabel nameKey={xAxisKey} />}
            />
            <PolarGrid gridType="circle" />
            <RadialBar dataKey={dataKey} />
          </RadialBarChart>
        </ChartContainer>
      </CardContent>
    </Card>
  );
}
