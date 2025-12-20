"use client";

import { DashboardPieChart } from "@/components/charts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Effort Distribution</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-muted-foreground flex h-[200px] items-center justify-center text-sm">
            No effort points assigned
          </div>
        </CardContent>
      </Card>
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
    <DashboardPieChart
      title="Effort Distribution"
      chartData={chartData}
      chartConfig={chartConfig}
      xAxisKey="name"
      dataKeys={["value"]}
      centerLabel={{
        value: totalEffortPoints.toString(),
        label: "Total Points",
      }}
      showLegend={rolesWithEffort.length <= 6}
    />
  );
}
