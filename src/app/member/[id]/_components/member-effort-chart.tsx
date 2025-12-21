"use client";

import { Cell, Label, Pie, PieChart } from "recharts";

import {
  type ChartConfig,
  ChartContainer,
  ChartLegend,
  ChartLegendContent,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart";
import type { RouterOutputs } from "@/trpc/react";

type Role = RouterOutputs["role"]["getByUser"][number];

interface MemberEffortChartProps {
  roles: Role[];
  totalEffortPoints: number;
}

export function MemberEffortChart({
  roles,
  totalEffortPoints,
}: MemberEffortChartProps) {
  const rolesWithEffort = roles.filter(
    (role) => role.effortPoints && role.effortPoints > 0,
  );

  if (rolesWithEffort.length === 0) {
    return (
      <div className="border-border/60 bg-card flex flex-col border">
        <div className="border-border/60 flex items-center justify-between border-b px-4 py-3">
          <h3 className="text-sm font-semibold tracking-wider uppercase">
            Effort Distribution
          </h3>
        </div>
        <div className="text-muted-foreground flex h-[18.75rem] items-center justify-center text-sm">
          No effort points assigned
        </div>
      </div>
    );
  }

  const chartData = rolesWithEffort.map((role, index) => ({
    name: role.title,
    value: role.effortPoints!,
    fill: role.color ?? `hsl(var(--chart-${(index % 5) + 1}))`,
  }));

  const chartConfig: ChartConfig = rolesWithEffort.reduce((acc, role) => {
    acc[role.title] = {
      label: role.title,
      color: role.color,
    };
    return acc;
  }, {} as ChartConfig);

  return (
    <div className="border-border/60 bg-card flex flex-col border">
      <div className="border-border/60 flex items-center justify-between border-b px-4 py-3">
        <h3 className="text-sm font-semibold tracking-wider uppercase">
          Effort Distribution
        </h3>
        <span className="text-muted-foreground text-xs">
          {totalEffortPoints} pts total
        </span>
      </div>
      <div className="flex-1 p-4">
        <ChartContainer
          config={chartConfig}
          className="mx-auto aspect-square h-[20rem]"
        >
          <PieChart>
            <ChartTooltip
              cursor={false}
              content={<ChartTooltipContent hideLabel nameKey="name" />}
            />
            <Pie
              data={chartData}
              dataKey="value"
              nameKey="name"
              innerRadius={50}
              outerRadius={85}
              strokeWidth={2}
            >
              {chartData.map((entry, index) => (
                <Cell
                  key={`cell-${index}`}
                  fill={entry.fill ?? `var(--chart-${(index % 12) + 1})`}
                />
              ))}
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
                          {totalEffortPoints}
                        </tspan>
                        <tspan
                          x={viewBox.cx}
                          y={(viewBox.cy ?? 0) + 18}
                          className="fill-muted-foreground text-xs"
                        >
                          Total
                        </tspan>
                      </text>
                    );
                  }
                }}
              />
            </Pie>
            <ChartLegend content={<ChartLegendContent nameKey="name" />} />
          </PieChart>
        </ChartContainer>
      </div>
    </div>
  );
}
