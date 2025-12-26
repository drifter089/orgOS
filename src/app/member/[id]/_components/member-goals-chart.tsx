"use client";

import {
  AlertTriangle,
  Calendar,
  Check,
  Target,
  TrendingUp,
} from "lucide-react";
import { PolarAngleAxis, PolarGrid, Radar, RadarChart } from "recharts";

import { Badge } from "@/components/ui/badge";
import {
  type ChartConfig,
  ChartContainer,
  ChartTooltip,
} from "@/components/ui/chart";
import type { GoalProgress } from "@/lib/goals";
import { formatValue } from "@/lib/helpers/format-value";
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
  {
    label: string;
    variant: "default" | "secondary" | "outline" | "destructive";
    icon: React.ReactNode;
  }
> = {
  exceeded: {
    label: "Exceeded",
    variant: "default",
    icon: <Check className="h-3 w-3" />,
  },
  on_track: {
    label: "On Track",
    variant: "secondary",
    icon: <TrendingUp className="h-3 w-3" />,
  },
  behind: {
    label: "Behind",
    variant: "outline",
    icon: <AlertTriangle className="h-3 w-3" />,
  },
  at_risk: {
    label: "At Risk",
    variant: "destructive",
    icon: <AlertTriangle className="h-3 w-3" />,
  },
  no_data: {
    label: "No Data",
    variant: "outline",
    icon: <Target className="h-3 w-3" />,
  },
  invalid_baseline: {
    label: "Invalid",
    variant: "outline",
    icon: <AlertTriangle className="h-3 w-3" />,
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
  const progressPercent = Math.round(data.progress);
  const expectedPercent = Math.round(data.expectedProgress);

  return (
    <div className="border-border/50 bg-background min-w-[220px] space-y-3 rounded-lg border p-3 shadow-xl">
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-1.5">
          <Target className="text-muted-foreground h-3.5 w-3.5" />
          <span className="text-sm font-semibold">{data.goal}</span>
        </div>
        <Badge variant={statusConfig.variant} className="gap-1 text-[10px]">
          {statusConfig.icon}
          {statusConfig.label}
        </Badge>
      </div>

      <div className="grid grid-cols-3 gap-3">
        <div>
          <p className="text-muted-foreground text-[10px] font-medium uppercase">
            Current
          </p>
          <p className="text-base font-bold">
            {data.currentValue !== null ? formatValue(data.currentValue) : "--"}
          </p>
        </div>
        <div>
          <p className="text-muted-foreground text-[10px] font-medium uppercase">
            Target
          </p>
          <p className="text-base font-bold">{formatValue(data.targetValue)}</p>
        </div>
        <div>
          <p className="text-muted-foreground text-[10px] font-medium uppercase">
            Progress
          </p>
          <p className="text-base font-bold">{progressPercent}%</p>
        </div>
      </div>

      <div>
        <div className="bg-muted h-2 w-full overflow-hidden rounded-full">
          <div
            className={cn(
              "h-full transition-[width] duration-300 ease-out",
              progressPercent >= 100
                ? "bg-green-500"
                : progressPercent >= expectedPercent
                  ? "bg-blue-500"
                  : progressPercent >= expectedPercent * 0.7
                    ? "bg-amber-500"
                    : "bg-red-500",
            )}
            style={{ width: `${Math.min(progressPercent, 100)}%` }}
          />
        </div>
        <div className="text-muted-foreground mt-1 flex items-center justify-between text-[10px]">
          <span>Expected: {expectedPercent}%</span>
          <span
            className={cn(
              "font-medium",
              progressPercent >= expectedPercent
                ? "text-green-600"
                : "text-amber-600",
            )}
          >
            {progressPercent >= expectedPercent ? "Ahead" : "Behind"} by{" "}
            {Math.abs(progressPercent - expectedPercent)}%
          </span>
        </div>
      </div>

      <div className="text-muted-foreground flex items-center gap-1 text-[10px]">
        <Calendar className="h-3 w-3" />
        <span>
          Day {data.daysElapsed} of {data.daysTotal}
        </span>
        <span className="text-foreground ml-1 font-medium">
          ({data.daysRemaining}d left)
        </span>
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
              stroke="var(--color-progress)"
              fill="var(--color-progress)"
              fillOpacity={0.3}
              strokeWidth={2}
              dot={{
                r: 4,
                fill: "var(--color-progress)",
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
