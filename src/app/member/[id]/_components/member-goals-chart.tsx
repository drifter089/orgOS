"use client";

import { DashboardRadarChart } from "@/components/charts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { ChartConfig } from "@/components/ui/chart";
import type { GoalProgress } from "@/server/api/utils/goal-calculation";

interface GoalData {
  goalName: string;
  progressPercent: number;
  status: GoalProgress["status"];
}

interface MemberGoalsChartProps {
  goalsData: GoalData[];
}

export function MemberGoalsChart({ goalsData }: MemberGoalsChartProps) {
  if (goalsData.length === 0) {
    return (
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Goal Progress</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-muted-foreground flex h-[200px] items-center justify-center text-sm">
            No goals assigned to roles
          </div>
        </CardContent>
      </Card>
    );
  }

  const chartData = goalsData.map((goal) => ({
    goal: goal.goalName,
    progress: Math.max(0, Math.min(100, goal.progressPercent)),
  }));

  const chartConfig: ChartConfig = {
    progress: {
      label: "Progress",
      color: "hsl(var(--primary))",
    },
  };

  return (
    <DashboardRadarChart
      title="Goal Progress"
      description="Progress toward metric goals (%)"
      chartData={chartData}
      chartConfig={chartConfig}
      xAxisKey="goal"
      dataKeys={["progress"]}
      showLegend={false}
    />
  );
}
