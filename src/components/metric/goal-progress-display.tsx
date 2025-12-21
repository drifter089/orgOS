"use client";

import type { MetricGoal } from "@prisma/client";
import { format, formatDistanceToNow } from "date-fns";
import {
  AlertTriangle,
  BarChart3,
  Calendar,
  Check,
  Clock,
  Target,
  TrendingUp,
} from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { formatCadence } from "@/lib/helpers/format-cadence";
import { formatValue } from "@/lib/helpers/format-value";
import type { LatestMetricValue } from "@/lib/metrics/get-latest-value";
import { cn } from "@/lib/utils";
import type { GoalProgress } from "@/server/api/utils/goal-calculation";
import { calculateGoalTargetValue } from "@/server/api/utils/goal-calculation";

interface GoalProgressDisplayProps {
  currentValue: LatestMetricValue | null;
  valueLabel: string | null;
  goal: MetricGoal | null;
  goalProgress: GoalProgress | null;
  isLoading?: boolean;
  lastFetchedAt: Date | null;
  chartUpdatedAt?: Date | null;
}

/**
 * Format time remaining based on cadence
 * - DAILY: show hours (e.g., "8h left")
 * - WEEKLY/MONTHLY: show days (e.g., "3d left")
 */
function formatTimeRemaining(goalProgress: GoalProgress): string {
  if (goalProgress.cadence === "DAILY") {
    return `${goalProgress.hoursRemaining}h left`;
  }
  return `${goalProgress.daysRemaining}d left`;
}

function getStatusConfig(status: string) {
  switch (status) {
    case "exceeded":
      return {
        label: "Exceeded",
        variant: "default" as const,
        icon: <Check className="h-3 w-3" />,
      };
    case "on_track":
      return {
        label: "On Track",
        variant: "secondary" as const,
        icon: <TrendingUp className="h-3 w-3" />,
      };
    case "behind":
      return {
        label: "Behind",
        variant: "outline" as const,
        icon: <AlertTriangle className="h-3 w-3" />,
      };
    case "at_risk":
      return {
        label: "At Risk",
        variant: "destructive" as const,
        icon: <AlertTriangle className="h-3 w-3" />,
      };
    case "invalid_baseline":
      return {
        label: "Invalid Baseline",
        variant: "outline" as const,
        icon: <AlertTriangle className="h-3 w-3" />,
      };
    default:
      return {
        label: "No Data",
        variant: "outline" as const,
        icon: <Target className="h-3 w-3" />,
      };
  }
}

export function GoalProgressDisplay({
  currentValue,
  valueLabel,
  goal,
  goalProgress,
  isLoading = false,
  lastFetchedAt,
  chartUpdatedAt,
}: GoalProgressDisplayProps) {
  if (isLoading) {
    return (
      <div className="space-y-4 rounded-lg border p-4">
        <div className="flex items-center justify-between">
          <Skeleton className="h-4 w-24" />
          <Skeleton className="h-5 w-16" />
        </div>
        <div className="grid grid-cols-3 gap-4">
          <div>
            <Skeleton className="mb-1 h-3 w-12" />
            <Skeleton className="h-7 w-16" />
          </div>
          <div>
            <Skeleton className="mb-1 h-3 w-12" />
            <Skeleton className="h-7 w-16" />
          </div>
          <div>
            <Skeleton className="mb-1 h-3 w-12" />
            <Skeleton className="h-7 w-16" />
            <Skeleton className="mt-2 h-1.5 w-full" />
          </div>
        </div>
        <Skeleton className="h-4 w-48" />
      </div>
    );
  }

  const hasGoal = !!goal;
  const hasData = currentValue !== null;
  const goalTargetValue =
    goal && goalProgress ? calculateGoalTargetValue(goal, goalProgress) : null;

  return (
    <div className="space-y-4 rounded-lg border p-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Target className="text-muted-foreground h-4 w-4" />
          <span className="text-sm font-medium">
            {hasGoal && goalProgress?.cadence
              ? `${formatCadence(goalProgress.cadence)} Goal`
              : "Goal Progress"}
          </span>
        </div>
        {hasGoal && goalProgress && (
          <Badge
            variant={getStatusConfig(goalProgress.status).variant}
            className="gap-1"
          >
            {getStatusConfig(goalProgress.status).icon}
            {getStatusConfig(goalProgress.status).label}
          </Badge>
        )}
      </div>

      <div className="grid grid-cols-3 gap-4">
        <div>
          <p className="text-muted-foreground text-xs font-medium tracking-wide uppercase">
            Current
          </p>
          <p className="mt-1 text-2xl font-bold">
            {hasData ? formatValue(currentValue.value) : "--"}
          </p>
          {hasData && (valueLabel ?? currentValue.label) && (
            <p className="text-muted-foreground text-xs">
              {valueLabel ?? currentValue.label}
            </p>
          )}
          {!hasData && (
            <p className="text-muted-foreground text-xs">No data yet</p>
          )}
        </div>

        <div>
          <p className="text-muted-foreground text-xs font-medium tracking-wide uppercase">
            Target
          </p>
          <p className="mt-1 text-2xl font-bold">
            {hasGoal
              ? goal.goalType === "ABSOLUTE"
                ? formatValue(goalTargetValue ?? goal.targetValue)
                : `+${goal.targetValue}%`
              : "--"}
          </p>
          {hasGoal && goal.goalType === "ABSOLUTE" && valueLabel && (
            <p className="text-muted-foreground text-xs">{valueLabel}</p>
          )}
          {!hasGoal && (
            <p className="text-muted-foreground text-xs">No goal set</p>
          )}
        </div>

        <div>
          <p className="text-muted-foreground text-xs font-medium tracking-wide uppercase">
            Progress
          </p>
          <p className="mt-1 text-2xl font-bold">
            {goalProgress
              ? `${Math.round(goalProgress.progressPercent)}%`
              : "--"}
          </p>
          {goalProgress && (
            <div className="bg-muted mt-2 h-1.5 w-full overflow-hidden rounded-full">
              <div
                className={cn(
                  "h-full transition-[width] duration-300 ease-out",
                  goalProgress.progressPercent >= 100
                    ? "bg-green-500"
                    : goalProgress.progressPercent >= 70
                      ? "bg-blue-500"
                      : "bg-amber-500",
                )}
                style={{
                  width: `${Math.min(goalProgress.progressPercent, 100)}%`,
                }}
              />
            </div>
          )}
        </div>
      </div>

      <div className="text-muted-foreground flex flex-wrap items-center gap-x-4 gap-y-1 text-xs">
        {goalProgress && (
          <span className="flex items-center gap-1">
            <Calendar className="h-3 w-3" />
            {format(new Date(goalProgress.periodStart), "MMM d")} -{" "}
            {format(new Date(goalProgress.periodEnd), "MMM d")}
            <span className="text-foreground ml-1 font-medium">
              ({formatTimeRemaining(goalProgress)})
            </span>
          </span>
        )}

        {(currentValue?.date ?? lastFetchedAt ?? chartUpdatedAt) && (
          <>
            {goalProgress && (
              <span className="text-muted-foreground/50">|</span>
            )}
            {currentValue?.date && (
              <span className="flex items-center gap-1">
                <BarChart3 className="h-3 w-3" />
                Data: {currentValue.date}
              </span>
            )}
            {lastFetchedAt && (
              <span className="flex items-center gap-1">
                <Clock className="h-3 w-3" />
                Fetched{" "}
                {formatDistanceToNow(new Date(lastFetchedAt), {
                  addSuffix: true,
                })}
              </span>
            )}
            {chartUpdatedAt && (
              <span className="flex items-center gap-1">
                <TrendingUp className="h-3 w-3" />
                Chart{" "}
                {formatDistanceToNow(new Date(chartUpdatedAt), {
                  addSuffix: true,
                })}
              </span>
            )}
          </>
        )}
      </div>
    </div>
  );
}
