"use client";

import { MetricPieChart } from "@/components/charts";
import type { ChartConfig } from "@/components/ui/chart";
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
        <MetricPieChart
          chartData={chartData}
          chartConfig={chartConfig}
          xAxisKey="name"
          dataKeys={["value"]}
          showLegend={true}
          showTooltip={true}
          centerLabel={{
            value: totalEffortPoints,
            label: "Total",
          }}
          className="mx-auto aspect-square h-[20rem]"
        />
      </div>
    </div>
  );
}
