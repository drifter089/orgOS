"use client";

import { format } from "date-fns";
import { Calendar, Clock, Target } from "lucide-react";

import type { GoalProgress } from "@/lib/goals";
import { formatValue } from "@/lib/helpers/format-value";
import { cn } from "@/lib/utils";

/**
 * Format time remaining based on cadence
 * - DAILY or < 1 day: show hours (e.g., "8 hrs")
 * - WEEKLY/MONTHLY: show days (e.g., "3 days")
 */
function formatTimeRemaining(goalProgress: GoalProgress): string {
  if (goalProgress.cadence === "DAILY" || goalProgress.daysRemaining < 1) {
    const hours = Math.max(0, Math.round(goalProgress.hoursRemaining));
    return `${hours} hr${hours !== 1 ? "s" : ""}`;
  }
  const days = Math.max(0, Math.round(goalProgress.daysRemaining));
  return `${days} day${days !== 1 ? "s" : ""}`;
}

interface ChartStatsBarProps {
  currentValue: { value: number; label?: string; date?: string } | null;
  valueLabel: string | null;
  goalProgress: GoalProgress | null;
}

export function ChartStatsBar({
  currentValue,
  valueLabel,
  goalProgress,
}: ChartStatsBarProps) {
  const timeElapsedPercent = goalProgress
    ? (goalProgress.daysElapsed /
        (goalProgress.daysElapsed + goalProgress.daysRemaining)) *
      100
    : null;

  return (
    <div className="bg-muted/30 flex items-center gap-6 border-b px-6 py-3">
      {/* Current Value */}
      <div className="flex items-baseline gap-2">
        <span className="text-2xl font-bold">
          {currentValue ? formatValue(currentValue.value) : "--"}
        </span>
        {(valueLabel ?? currentValue?.label) && (
          <span className="text-muted-foreground text-sm">
            {valueLabel ?? currentValue?.label}
          </span>
        )}
      </div>

      {/* Goal Progress */}
      {goalProgress && (
        <div className="flex items-center gap-2">
          <Target className="text-muted-foreground h-4 w-4" />
          <div className="bg-muted h-2 w-24 overflow-hidden rounded-full">
            <div
              className={cn(
                "h-full transition-all duration-300",
                goalProgress.progressPercent >= 100
                  ? "bg-green-500"
                  : goalProgress.progressPercent >= 70
                    ? "bg-primary"
                    : "bg-amber-500",
              )}
              style={{
                width: `${Math.min(goalProgress.progressPercent, 100)}%`,
              }}
            />
          </div>
          <span className="text-sm font-medium">
            {Math.round(goalProgress.progressPercent)}%
          </span>
        </div>
      )}

      {/* Time Progress */}
      {timeElapsedPercent !== null && goalProgress && (
        <div className="flex items-center gap-2">
          <Clock className="text-muted-foreground h-4 w-4" />
          <div className="bg-muted h-2 w-24 overflow-hidden rounded-full">
            <div
              className="h-full bg-blue-500 transition-all duration-300"
              style={{ width: `${Math.min(timeElapsedPercent, 100)}%` }}
            />
          </div>
          <span className="text-sm font-medium">
            {formatTimeRemaining(goalProgress)} left
          </span>
        </div>
      )}

      {/* Period Dates */}
      {goalProgress && (
        <div className="text-muted-foreground ml-auto flex items-center gap-1.5 text-xs">
          <Calendar className="h-3.5 w-3.5" />
          <span>
            {format(new Date(goalProgress.periodStart), "MMM d")} -{" "}
            {format(new Date(goalProgress.periodEnd), "MMM d")}
          </span>
        </div>
      )}
    </div>
  );
}
