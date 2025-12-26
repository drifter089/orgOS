"use client";

import { useState } from "react";

import type { Cadence, GoalType, MetricGoal } from "@prisma/client";
import { format } from "date-fns";
import { Calendar, Loader2, Pencil, Target, Trash2 } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { SliderWithInputs } from "@/components/ui/slider-with-inputs";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { useOptimisticGoalUpdate } from "@/hooks/use-optimistic-goal-update";
import { type GoalProgress, calculateTargetDisplayValue } from "@/lib/goals";
import { formatCadence } from "@/lib/helpers/format-cadence";
import { formatValue } from "@/lib/helpers/format-value";
import { cn } from "@/lib/utils";
import { api } from "@/trpc/react";

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

interface GoalTabContentProps {
  metricId: string;
  teamId: string;
  goal: MetricGoal | null;
  goalProgress: GoalProgress | null;
  currentValue: { value: number; label?: string; date?: string } | null;
  valueLabel: string | null;
  cadence: Cadence | null | undefined;
  /** True when chart data is being recalculated (pipeline running) */
  isProcessing?: boolean;
}

export function GoalTabContent({
  metricId,
  teamId,
  goal,
  goalProgress,
  currentValue,
  valueLabel,
  cadence,
  isProcessing = false,
}: GoalTabContentProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [goalType, setGoalType] = useState<GoalType>(
    goal?.goalType ?? "ABSOLUTE",
  );
  const [targetValue, setTargetValue] = useState(goal?.targetValue ?? 10);

  // Fetch suggested range for slider
  const { data: goalData } = api.goal.get.useQuery({ metricId });
  const suggestedRange = goalData?.suggestedRange;

  // Use optimistic goal update hook - updates cache directly, no invalidation
  const { upsertGoal, deleteGoal, isUpserting, isDeleting, isPending } =
    useOptimisticGoalUpdate(teamId, metricId);

  // Show skeleton when goal data is being recalculated
  const isRecalculating = isProcessing || isPending;

  const handleSaveGoal = () => {
    if (targetValue <= 0) {
      toast.error("Please enter a valid positive number");
      return;
    }
    upsertGoal(goalType, targetValue);
    setIsEditing(false);
  };

  const handleEditGoal = () => {
    if (goal) {
      setGoalType(goal.goalType);
      setTargetValue(goal.targetValue);
    }
    setIsEditing(true);
  };

  const goalTargetValue =
    goal && goalProgress
      ? calculateTargetDisplayValue(
          goal.goalType,
          goal.targetValue,
          goal.baselineValue ?? goalProgress.baselineValue,
        )
      : null;

  // Loading skeleton when goal data is being recalculated
  if (isRecalculating && goal) {
    return (
      <div className="flex h-full flex-col overflow-y-auto p-5">
        <div className="mb-5">
          <h3 className="text-base font-semibold">Goal Progress</h3>
          <p className="text-muted-foreground mt-1 text-xs">Updating...</p>
        </div>
        <div className="space-y-4">
          {/* Progress skeleton */}
          <div className="bg-background border p-4 text-center shadow-sm">
            <Skeleton className="mx-auto mb-1 h-10 w-24" />
            <Skeleton className="mx-auto h-3 w-20" />
            <div className="mt-3">
              <Skeleton className="h-2.5 w-full" />
            </div>
          </div>
          {/* Time elapsed skeleton */}
          <div className="bg-background border p-3 shadow-sm">
            <div className="flex items-center justify-between">
              <Skeleton className="h-3 w-20" />
              <Skeleton className="h-3 w-24" />
            </div>
            <div className="mt-2 space-y-1">
              <Skeleton className="h-2 w-full" />
              <Skeleton className="h-3 w-16" />
            </div>
          </div>
          {/* Current/Target skeleton */}
          <div className="grid grid-cols-2 gap-3">
            <div className="bg-background border p-3 shadow-sm">
              <Skeleton className="mb-1 h-3 w-12" />
              <Skeleton className="h-6 w-16" />
            </div>
            <div className="bg-background border p-3 shadow-sm">
              <Skeleton className="mb-1 h-3 w-12" />
              <Skeleton className="h-6 w-16" />
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Editing Mode
  if (isEditing || !goal) {
    return (
      <div className="flex h-full flex-col overflow-y-auto p-5">
        <div className="mb-5">
          <h3 className="text-base font-semibold">
            {goal ? "Edit Goal" : "Set Goal"}
          </h3>
          <p className="text-muted-foreground mt-1 text-xs leading-relaxed">
            Define targets for this metric and track your progress over time.
          </p>
        </div>

        {/* Empty state intro when no goal */}
        {!goal && !isEditing && (
          <div className="bg-muted/20 mb-4 flex flex-col items-center border border-dashed p-6 text-center">
            <div className="bg-muted mb-3 flex h-12 w-12 items-center justify-center">
              <Target className="text-muted-foreground h-6 w-6" />
            </div>
            <p className="text-muted-foreground text-sm">No goal set yet</p>
            <p className="text-muted-foreground mt-1 text-xs">
              Set a target to track your progress
            </p>
          </div>
        )}

        <div className="space-y-4">
          <div className="space-y-2">
            <Label className="text-xs">Type</Label>
            <ToggleGroup
              type="single"
              value={goalType}
              onValueChange={(v) => v && setGoalType(v as GoalType)}
              className="grid w-full grid-cols-2 gap-2"
            >
              <ToggleGroupItem
                value="ABSOLUTE"
                className="data-[state=on]:border-primary data-[state=on]:bg-primary data-[state=on]:text-primary-foreground border text-xs"
              >
                Absolute
              </ToggleGroupItem>
              <ToggleGroupItem
                value="RELATIVE"
                className="data-[state=on]:border-primary data-[state=on]:bg-primary data-[state=on]:text-primary-foreground border text-xs"
              >
                Relative %
              </ToggleGroupItem>
            </ToggleGroup>
          </div>

          {cadence && (
            <div className="space-y-2">
              <Label className="text-xs">Period</Label>
              <div className="bg-muted/50 flex h-9 items-center border px-3">
                <span className="text-muted-foreground text-sm capitalize">
                  {formatCadence(cadence)}
                </span>
              </div>
            </div>
          )}

          <SliderWithInputs
            value={targetValue}
            onChange={setTargetValue}
            suggestedMin={
              goalType === "RELATIVE" ? 0 : (suggestedRange?.suggestedMin ?? 0)
            }
            suggestedMax={
              goalType === "RELATIVE"
                ? 100
                : (suggestedRange?.suggestedMax ?? 100)
            }
            label={`Target ${goalType === "RELATIVE" ? "Growth %" : "Value"}`}
            suffix={goalType === "RELATIVE" ? "%" : undefined}
          />

          <div className="flex gap-2 pt-2">
            {goal && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => setIsEditing(false)}
                className="flex-1 transition-all duration-200 active:scale-[0.98]"
              >
                Cancel
              </Button>
            )}
            <Button
              size="sm"
              onClick={handleSaveGoal}
              disabled={isUpserting || targetValue <= 0}
              className="flex-1 transition-all duration-200 active:scale-[0.98]"
            >
              {isUpserting && <Loader2 className="mr-1 h-3 w-3 animate-spin" />}
              Save Goal
            </Button>
          </div>
        </div>
      </div>
    );
  }

  // Display Mode
  return (
    <div className="flex h-full flex-col overflow-y-auto p-5">
      <div className="mb-5">
        <div className="flex items-start justify-between">
          <h3 className="text-base font-semibold">Goal Progress</h3>
          <Button
            variant="ghost"
            size="sm"
            onClick={handleEditGoal}
            className="text-muted-foreground hover:text-foreground -mr-2 h-7 px-2"
          >
            <Pencil className="mr-1 h-3 w-3" />
            Edit
          </Button>
        </div>
        <p className="text-muted-foreground mt-1 text-xs leading-relaxed">
          Track your progress towards the target you&apos;ve set.
        </p>
      </div>

      <div className="space-y-4">
        {/* Progress Percentage - in a card */}
        <div className="bg-background border p-4 text-center shadow-sm">
          <div className="text-4xl font-bold">
            {goalProgress
              ? `${Math.round(goalProgress.progressPercent)}%`
              : "--"}
          </div>
          <div className="text-muted-foreground text-xs">of goal achieved</div>

          {/* Progress Bar */}
          {goalProgress && (
            <div className="mt-3 space-y-1">
              <div className="bg-muted h-2.5 w-full overflow-hidden">
                <div
                  className={cn(
                    "h-full transition-all duration-300",
                    goalProgress.progressPercent >= 100
                      ? "bg-goal"
                      : goalProgress.progressPercent >= 70
                        ? "bg-primary"
                        : "bg-chart-3",
                  )}
                  style={{
                    width: `${Math.min(goalProgress.progressPercent, 100)}%`,
                  }}
                />
              </div>
              <div className="text-muted-foreground flex justify-between text-[10px]">
                <span>0%</span>
                <span>100%</span>
              </div>
            </div>
          )}
        </div>

        {/* Time Elapsed */}
        {goalProgress && (
          <div className="bg-background border p-3 shadow-sm">
            <div className="flex items-center justify-between">
              <Label className="text-xs">Time Elapsed</Label>
              <div className="text-muted-foreground flex items-center gap-1 text-[10px]">
                <Calendar className="h-3 w-3" />
                {format(new Date(goalProgress.periodStart), "MMM d")} -{" "}
                {format(new Date(goalProgress.periodEnd), "MMM d")}
              </div>
            </div>
            <div className="mt-2 space-y-1">
              <div className="bg-muted h-2 w-full overflow-hidden">
                <div
                  className="bg-chart-2 h-full transition-all duration-300"
                  style={{
                    width: `${Math.min(
                      (goalProgress.daysElapsed /
                        (goalProgress.daysElapsed +
                          goalProgress.daysRemaining)) *
                        100,
                      100,
                    )}%`,
                  }}
                />
              </div>
              <div className="text-muted-foreground text-[10px]">
                {formatTimeRemaining(goalProgress)} remaining
              </div>
            </div>
          </div>
        )}

        {/* Current / Target */}
        <div className="grid grid-cols-2 gap-3">
          <div className="bg-background border p-3 shadow-sm">
            <div className="text-muted-foreground text-[10px] uppercase">
              Current
            </div>
            <div className="text-lg font-semibold">
              {currentValue ? formatValue(currentValue.value) : "--"}
            </div>
            {valueLabel && (
              <div className="text-muted-foreground text-[10px]">
                {valueLabel}
              </div>
            )}
          </div>
          <div className="bg-background border p-3 shadow-sm">
            <div className="text-muted-foreground text-[10px] uppercase">
              Target
            </div>
            <div className="text-lg font-semibold">
              {goal.goalType === "ABSOLUTE"
                ? formatValue(goalTargetValue ?? goal.targetValue)
                : `+${goal.targetValue}%`}
            </div>
            {cadence && (
              <div className="text-muted-foreground text-[10px]">
                {formatCadence(cadence)}
              </div>
            )}
          </div>
        </div>

        {/* Delete Goal */}
        <Button
          variant="outline"
          size="sm"
          onClick={deleteGoal}
          disabled={isDeleting}
          className="text-destructive hover:text-destructive hover:bg-destructive/10 border-destructive/30 mt-2 w-full transition-all duration-200 active:scale-[0.98]"
        >
          {isDeleting ? (
            <Loader2 className="mr-1 h-3 w-3 animate-spin" />
          ) : (
            <Trash2 className="mr-1 h-3 w-3" />
          )}
          Remove Goal
        </Button>
      </div>
    </div>
  );
}
