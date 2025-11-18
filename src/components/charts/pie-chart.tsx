"use client";

import { Cell, Pie, PieChart } from "recharts";

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

export function DashboardPieChart({
  chartData,
  chartConfig,
  xAxisKey,
  dataKeys,
  title,
  description,
}: ChartComponentProps) {
  const dataKey = dataKeys[0] ?? "value";

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
          className="mx-auto aspect-square h-[250px]"
        >
          <PieChart>
            <ChartTooltip
              cursor={false}
              content={<ChartTooltipContent hideLabel nameKey={xAxisKey} />}
            />
            <Pie
              data={chartData}
              dataKey={dataKey}
              nameKey={xAxisKey}
              innerRadius={60}
              outerRadius={100}
              strokeWidth={2}
            >
              {chartData.map((entry, index) => (
                <Cell
                  key={`cell-${index}`}
                  fill={
                    (entry.fill as string) ?? `var(--chart-${(index % 5) + 1})`
                  }
                />
              ))}
            </Pie>
            <ChartLegend content={<ChartLegendContent />} />
          </PieChart>
        </ChartContainer>
      </CardContent>
    </Card>
  );
}
