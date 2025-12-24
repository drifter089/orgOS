"use client";

import { Target } from "lucide-react";

import type { GoalProgress } from "@/lib/goals";
import { formatValue } from "@/lib/helpers/format-value";
import { cn } from "@/lib/utils";

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
      {timeElapsedPercent !== null && (
        <div className="flex items-center gap-2">
          <span className="text-muted-foreground text-xs">Time</span>
          <div className="bg-muted h-2 w-24 overflow-hidden rounded-full">
            <div
              className="h-full bg-blue-500 transition-all duration-300"
              style={{ width: `${Math.min(timeElapsedPercent, 100)}%` }}
            />
          </div>
          <span className="text-sm font-medium">
            {Math.round(timeElapsedPercent)}%
          </span>
        </div>
      )}
    </div>
  );
}
