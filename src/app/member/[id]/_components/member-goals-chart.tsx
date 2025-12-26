"use client";

import { PolarAngleAxis, PolarGrid, Radar, RadarChart } from "recharts";

import { Badge } from "@/components/ui/badge";
import {
  type ChartConfig,
  ChartContainer,
  ChartTooltip,
} from "@/components/ui/chart";
import { Progress } from "@/components/ui/progress";
import type { GoalProgress } from "@/lib/goals";
import { cn } from "@/lib/utils";

interface GoalData {
  goalName: string;
  progressPercent: number;
  expectedProgressPercent: number;
  status: GoalProgress["status"];
  daysElapsed: number;
  daysTotal: number;
  daysRemaining: number;
  currentValue: number | null;
  targetValue: number;
}

interface MemberGoalsChartProps {
  goalsData: GoalData[];
}

const STATUS_CONFIG: Record<
  GoalProgress["status"],
  { label: string; className: string }
> = {
  exceeded: {
    label: "Exceeded",
    className: "bg-emerald-500/15 text-emerald-600 border-emerald-500/30",
  },
  on_track: {
    label: "On Track",
    className: "bg-green-500/15 text-green-600 border-green-500/30",
  },
  behind: {
    label: "Behind",
    className: "bg-amber-500/15 text-amber-600 border-amber-500/30",
  },
  at_risk: {
    label: "At Risk",
    className: "bg-red-500/15 text-red-600 border-red-500/30",
  },
  no_data: {
    label: "No Data",
    className: "bg-muted text-muted-foreground border-muted",
  },
  invalid_baseline: {
    label: "Invalid",
    className: "bg-muted text-muted-foreground border-muted",
  },
};

interface GoalTooltipProps {
  active?: boolean;
  payload?: Array<{
    payload: {
      goal: string;
      progress: number;
      expectedProgress: number;
      status: GoalProgress["status"];
      daysElapsed: number;
      daysTotal: number;
      daysRemaining: number;
      currentValue: number | null;
      targetValue: number;
    };
  }>;
}

function GoalTooltipContent({ active, payload }: GoalTooltipProps) {
  if (!active || !payload?.length) {
    return null;
  }

  const data = payload[0]?.payload;
  if (!data) return null;

  const statusConfig = STATUS_CONFIG[data.status];
  const timeProgressPercent = Math.round(
    (data.daysElapsed / data.daysTotal) * 100,
  );

  return (
    <div className="border-border/50 bg-background min-w-[200px] rounded-lg border px-3 py-2.5 shadow-xl">
      <div className="mb-2 flex items-center justify-between gap-2">
        <span className="text-sm font-medium">{data.goal}</span>
        <Badge
          variant="outline"
          className={cn("px-1.5 py-0 text-[10px]", statusConfig.className)}
        >
          {statusConfig.label}
        </Badge>
      </div>

      <div className="space-y-2.5">
        <div>
          <div className="mb-1 flex items-center justify-between text-xs">
            <span className="text-muted-foreground">Goal Progress</span>
            <span className="font-medium">{Math.round(data.progress)}%</span>
          </div>
          <div className="relative">
            <Progress value={Math.min(100, data.progress)} className="h-2" />
            {data.expectedProgress > 0 && data.expectedProgress <= 100 && (
              <div
                className="bg-foreground/60 absolute top-0 h-2 w-0.5"
                style={{ left: `${data.expectedProgress}%` }}
                title={`Expected: ${Math.round(data.expectedProgress)}%`}
              />
            )}
          </div>
          <div className="text-muted-foreground mt-0.5 text-[10px]">
            Expected: {Math.round(data.expectedProgress)}%
          </div>
        </div>

        <div>
          <div className="mb-1 flex items-center justify-between text-xs">
            <span className="text-muted-foreground">Time Elapsed</span>
            <span className="font-medium">{timeProgressPercent}%</span>
          </div>
          <Progress value={timeProgressPercent} className="h-2" />
          <div className="text-muted-foreground mt-0.5 text-[10px]">
            {data.daysElapsed} of {data.daysTotal} days ({data.daysRemaining}{" "}
            remaining)
          </div>
        </div>
      </div>
    </div>
  );
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
    expectedProgress: goal.expectedProgressPercent,
    status: goal.status,
    daysElapsed: goal.daysElapsed,
    daysTotal: goal.daysTotal,
    daysRemaining: goal.daysRemaining,
    currentValue: goal.currentValue,
    targetValue: goal.targetValue,
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
            <ChartTooltip cursor={false} content={<GoalTooltipContent />} />
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
              isAnimationActive={true}
              animationDuration={800}
              animationEasing="ease-out"
            />
          </RadarChart>
        </ChartContainer>
      </div>
    </div>
  );
}
