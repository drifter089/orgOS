"use client";

import { PolarAngleAxis, PolarGrid, Radar, RadarChart } from "recharts";

import {
  type ChartConfig,
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart";
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
      <div className="border-border/60 bg-card flex flex-col border">
        <div className="border-border/60 flex items-center justify-between border-b px-4 py-3">
          <div>
            <h3 className="text-sm font-semibold tracking-wider uppercase">
              Goal Progress
            </h3>
            <p className="text-muted-foreground text-xs">
              Progress toward metric goals
            </p>
          </div>
        </div>
        <div className="text-muted-foreground flex h-[200px] items-center justify-center text-sm">
          No goals assigned to roles
        </div>
      </div>
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
    <div className="border-border/60 bg-card flex flex-col border">
      <div className="border-border/60 flex items-center justify-between border-b px-4 py-3">
        <div>
          <h3 className="text-sm font-semibold tracking-wider uppercase">
            Goal Progress
          </h3>
          <p className="text-muted-foreground text-xs">
            Progress toward metric goals
          </p>
        </div>
        <span className="text-muted-foreground text-xs">
          {goalsData.length} {goalsData.length === 1 ? "goal" : "goals"}
        </span>
      </div>
      <div className="flex-1 p-4">
        <ChartContainer
          config={chartConfig}
          className="mx-auto aspect-square max-h-[220px]"
        >
          <RadarChart data={chartData}>
            <ChartTooltip cursor={false} content={<ChartTooltipContent />} />
            <PolarAngleAxis dataKey="goal" />
            <PolarGrid />
            <Radar
              dataKey="progress"
              fill="var(--color-progress)"
              fillOpacity={0.6}
              dot={{
                r: 4,
                fillOpacity: 1,
              }}
            />
          </RadarChart>
        </ChartContainer>
      </div>
    </div>
  );
}
