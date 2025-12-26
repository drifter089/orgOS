"use client";

import { format } from "date-fns";
import {
  AlertTriangle,
  BarChart3,
  Calendar,
  Check,
  Clock,
  Target,
  TrendingDown,
  TrendingUp,
} from "lucide-react";
import { PolarAngleAxis, PolarGrid, Radar, RadarChart } from "recharts";

import { Badge } from "@/components/ui/badge";
import {
  type ChartConfig,
  ChartContainer,
  ChartTooltip,
} from "@/components/ui/chart";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import type { GoalProgress } from "@/lib/goals";
import { formatCadence } from "@/lib/helpers/format-cadence";
import { formatValue } from "@/lib/helpers/format-value";
import { cn } from "@/lib/utils";

export interface GoalData {
  goalName: string;
  progressPercent: number;
  expectedProgressPercent: number;
  status: GoalProgress["status"];
  daysElapsed: number;
  daysTotal: number;
  daysRemaining: number;
  hoursRemaining: number;
  currentValue: number | null;
  targetValue: number;
  baselineValue: number | null;
  cadence: GoalProgress["cadence"];
  periodStart: Date;
  periodEnd: Date;
  trend: GoalProgress["trend"];
  projectedEndValue: number | null;
  valueLabel: string | null;
  latestDataTimestamp: Date | null;
  selectedDimension: string | null;
}

interface GoalsRadarChartProps {
  goalsData: GoalData[];
  showHeader?: boolean;
  className?: string;
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

const TREND_CONFIG: Record<
  GoalProgress["trend"],
  { label: string; icon: React.ReactNode; className: string }
> = {
  accelerating: {
    label: "Accelerating",
    icon: <TrendingUp className="h-3 w-3" />,
    className: "text-green-600",
  },
  stable: {
    label: "Stable",
    icon: <BarChart3 className="h-3 w-3" />,
    className: "text-blue-600",
  },
  decelerating: {
    label: "Decelerating",
    icon: <TrendingDown className="h-3 w-3" />,
    className: "text-amber-600",
  },
  unknown: {
    label: "Unknown",
    icon: <BarChart3 className="h-3 w-3" />,
    className: "text-muted-foreground",
  },
};

function formatTimeRemaining(
  cadence: GoalProgress["cadence"],
  daysRemaining: number,
  hoursRemaining: number,
): string {
  if (cadence === "DAILY") {
    return `${hoursRemaining}h left`;
  }
  return `${daysRemaining}d left`;
}

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
      hoursRemaining: number;
      currentValue: number | null;
      targetValue: number;
      baselineValue: number | null;
      cadence: GoalProgress["cadence"];
      periodStart: Date;
      periodEnd: Date;
      trend: GoalProgress["trend"];
      projectedEndValue: number | null;
      valueLabel: string | null;
      latestDataTimestamp: Date | null;
      selectedDimension: string | null;
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
  const trendConfig = TREND_CONFIG[data.trend];
  const progressPercent = Math.round(data.progress);
  const expectedPercent = Math.round(data.expectedProgress);
  const timeProgressPercent = Math.round(
    (data.daysElapsed / data.daysTotal) * 100,
  );

  return (
    <div className="border-border/50 bg-background min-w-[260px] space-y-3 rounded-lg border p-3 shadow-xl">
      <div className="flex items-start justify-between gap-2">
        <div>
          <div className="flex items-center gap-1.5">
            <Target className="text-muted-foreground h-3.5 w-3.5" />
            <span className="text-sm font-semibold">{data.goal}</span>
          </div>
          <span className="text-muted-foreground text-[10px]">
            {formatCadence(data.cadence)} Goal
            {data.selectedDimension && ` · ${data.selectedDimension}`}
          </span>
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
          <p className="text-lg font-bold">
            {data.currentValue !== null ? formatValue(data.currentValue) : "--"}
          </p>
          {data.valueLabel && (
            <p className="text-muted-foreground truncate text-[10px]">
              {data.valueLabel}
            </p>
          )}
        </div>
        <div>
          <p className="text-muted-foreground text-[10px] font-medium uppercase">
            Target
          </p>
          <p className="text-lg font-bold">{formatValue(data.targetValue)}</p>
          {data.valueLabel && (
            <p className="text-muted-foreground truncate text-[10px]">
              {data.valueLabel}
            </p>
          )}
        </div>
        <div>
          <p className="text-muted-foreground text-[10px] font-medium uppercase">
            Progress
          </p>
          <p className="text-lg font-bold">{progressPercent}%</p>
          <p
            className={cn(
              "text-[10px] font-medium",
              progressPercent >= expectedPercent
                ? "text-green-600"
                : "text-amber-600",
            )}
          >
            {progressPercent >= expectedPercent ? "+" : ""}
            {progressPercent - expectedPercent}% vs expected
          </p>
        </div>
      </div>

      <div className="space-y-1">
        <div className="text-muted-foreground flex items-center justify-between text-[10px]">
          <span className="font-medium uppercase">Goal Progress</span>
          <span>{progressPercent}%</span>
        </div>
        <div className="relative">
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
          <div
            className="bg-foreground/60 absolute top-0 h-2 w-0.5"
            style={{ left: `${Math.min(expectedPercent, 100)}%` }}
            title={`Expected: ${expectedPercent}%`}
          />
        </div>
        <div className="text-muted-foreground flex items-center justify-between text-[10px]">
          <span>Expected: {expectedPercent}%</span>
          {data.trend !== "unknown" && (
            <span
              className={cn("flex items-center gap-0.5", trendConfig.className)}
            >
              {trendConfig.icon}
              {trendConfig.label}
            </span>
          )}
        </div>
      </div>

      <div className="space-y-1">
        <div className="text-muted-foreground flex items-center justify-between text-[10px]">
          <span className="font-medium uppercase">Time Progress</span>
          <span>
            {formatTimeRemaining(
              data.cadence,
              data.daysRemaining,
              data.hoursRemaining,
            )}
          </span>
        </div>
        <div className="bg-muted h-2 w-full overflow-hidden rounded-full">
          <div
            className="bg-primary/50 h-full transition-[width] duration-300 ease-out"
            style={{ width: `${Math.min(timeProgressPercent, 100)}%` }}
          />
        </div>
        <div className="text-muted-foreground flex items-center gap-1 text-[10px]">
          <Calendar className="h-3 w-3" />
          <span>
            {format(new Date(data.periodStart), "MMM d")} –{" "}
            {format(new Date(data.periodEnd), "MMM d")}
          </span>
          <span className="text-foreground ml-auto font-medium">
            Day {data.daysElapsed}/{data.daysTotal}
          </span>
        </div>
      </div>

      {data.latestDataTimestamp && (
        <div className="border-border/50 flex items-center gap-1.5 border-t pt-2 text-[10px]">
          <Clock className="text-muted-foreground h-3 w-3" />
          <span className="text-muted-foreground">Data as of:</span>
          <span className="text-foreground font-medium">
            {format(new Date(data.latestDataTimestamp), "MMM d, h:mm a")}
          </span>
        </div>
      )}

      {data.projectedEndValue !== null && data.trend !== "unknown" && (
        <div className="text-muted-foreground flex items-center gap-1.5 text-[10px]">
          <TrendingUp className="h-3 w-3" />
          <span>Projected end value:</span>
          <span className="text-foreground font-medium">
            {formatValue(data.projectedEndValue)}
          </span>
        </div>
      )}
    </div>
  );
}

function GoalProgressBar({ goal }: { goal: GoalData }) {
  const statusConfig = STATUS_CONFIG[goal.status];
  const progressPercent = Math.round(goal.progressPercent);
  const expectedPercent = Math.round(goal.expectedProgressPercent);

  return (
    <div className="space-y-2 rounded-lg border p-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Target className="text-muted-foreground h-4 w-4" />
          <span className="text-sm font-medium">{goal.goalName}</span>
        </div>
        <Badge variant={statusConfig.variant} className="gap-1 text-[10px]">
          {statusConfig.icon}
          {statusConfig.label}
        </Badge>
      </div>
      <div className="flex items-center gap-3">
        <div className="relative flex-1">
          <div className="bg-muted h-2.5 w-full overflow-hidden rounded-full">
            <div
              className={cn(
                "h-full transition-[width] duration-300",
                progressPercent >= 100
                  ? "bg-green-500"
                  : progressPercent >= expectedPercent
                    ? "bg-blue-500"
                    : "bg-amber-500",
              )}
              style={{ width: `${Math.min(progressPercent, 100)}%` }}
            />
          </div>
          <div
            className="bg-foreground/50 absolute top-0 h-2.5 w-0.5"
            style={{ left: `${Math.min(expectedPercent, 100)}%` }}
          />
        </div>
        <span className="w-12 text-right text-sm font-bold">
          {progressPercent}%
        </span>
      </div>
    </div>
  );
}

export function GoalsRadarChart({
  goalsData,
  showHeader = true,
  className,
}: GoalsRadarChartProps) {
  if (goalsData.length === 0) {
    return (
      <div
        className={cn(
          "border-border/60 bg-card flex flex-col border",
          className,
        )}
      >
        {showHeader && (
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
        )}
        <div className="text-muted-foreground flex h-[200px] items-center justify-center text-sm">
          No goals data
        </div>
      </div>
    );
  }

  if (goalsData.length < 3) {
    return (
      <div
        className={cn(
          "border-border/60 bg-card flex flex-col border",
          className,
        )}
      >
        {showHeader && (
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
        )}
        <div className="flex-1 space-y-2 p-4">
          {goalsData.map((goal) => (
            <GoalProgressBar key={goal.goalName} goal={goal} />
          ))}
        </div>
      </div>
    );
  }

  const chartData = goalsData.map((goal) => ({
    goal: goal.goalName,
    progress: Math.max(0, Math.min(100, goal.progressPercent ?? 0)),
    expectedProgress: goal.expectedProgressPercent,
    status: goal.status,
    daysElapsed: goal.daysElapsed,
    daysTotal: goal.daysTotal,
    daysRemaining: goal.daysRemaining,
    hoursRemaining: goal.hoursRemaining,
    currentValue: goal.currentValue,
    targetValue: goal.targetValue,
    baselineValue: goal.baselineValue,
    cadence: goal.cadence,
    periodStart: goal.periodStart,
    periodEnd: goal.periodEnd,
    trend: goal.trend,
    projectedEndValue: goal.projectedEndValue,
    valueLabel: goal.valueLabel,
    latestDataTimestamp: goal.latestDataTimestamp,
    selectedDimension: goal.selectedDimension,
  }));

  const chartConfig = {
    progress: {
      label: "Progress %",
      color: "#3b82f6", // Direct color - CSS variables don't resolve in SVG fill
    },
  } satisfies ChartConfig;

  return (
    <div
      className={cn("border-border/60 bg-card flex flex-col border", className)}
    >
      {showHeader && (
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
      )}
      <div className="flex-1 p-4">
        <ChartContainer
          config={chartConfig}
          className="mx-auto aspect-square max-h-[250px]"
        >
          <RadarChart data={chartData}>
            <ChartTooltip cursor={false} content={<GoalTooltipContent />} />
            <PolarAngleAxis dataKey="goal" />
            <PolarGrid />
            <Radar
              dataKey="progress"
              fill="#3b82f6"
              fillOpacity={0.6}
              stroke="#3b82f6"
              strokeWidth={2}
              isAnimationActive={false}
              dot={{
                r: 4,
                fillOpacity: 1,
                fill: "#3b82f6",
              }}
            />
          </RadarChart>
        </ChartContainer>

        {/* Custom legend showing goals with dimensions */}
        <div className="mt-3 flex flex-wrap justify-center gap-x-4 gap-y-1">
          {chartData.map((item) => (
            <TooltipProvider key={item.goal} delayDuration={0}>
              <Tooltip>
                <TooltipTrigger asChild>
                  <div className="flex items-center gap-1.5 text-xs">
                    <div
                      className="h-2 w-2 shrink-0 rounded-full"
                      style={{ backgroundColor: "#3b82f6" }}
                    />
                    <span className="text-muted-foreground max-w-[100px] truncate">
                      {item.goal}
                    </span>
                    {item.selectedDimension && (
                      <span className="text-muted-foreground/60 text-[10px]">
                        ({item.selectedDimension})
                      </span>
                    )}
                  </div>
                </TooltipTrigger>
                <TooltipContent side="bottom" className="text-xs">
                  <div>
                    <p className="font-medium">{item.goal}</p>
                    {item.selectedDimension && (
                      <p className="text-muted-foreground">
                        Dimension: {item.selectedDimension}
                      </p>
                    )}
                    <p className="text-muted-foreground">
                      Progress: {Math.round(item.progress)}%
                    </p>
                  </div>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          ))}
        </div>
      </div>
    </div>
  );
}
