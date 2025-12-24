"use client";

import { useState } from "react";

import type { Cadence, GoalType, MetricGoal } from "@prisma/client";
import { format } from "date-fns";
import { Calendar, Loader2, Pencil, Target, Trash2 } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
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
  goal: MetricGoal | null;
  goalProgress: GoalProgress | null;
  currentValue: { value: number; label?: string; date?: string } | null;
  valueLabel: string | null;
  cadence: Cadence | null | undefined;
}

export function GoalTabContent({
  metricId,
  goal,
  goalProgress,
  currentValue,
  valueLabel,
  cadence,
}: GoalTabContentProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [goalType, setGoalType] = useState<GoalType>(
    goal?.goalType ?? "ABSOLUTE",
  );
  const [targetValue, setTargetValue] = useState(
    goal?.targetValue?.toString() ?? "",
  );

  const utils = api.useUtils();

  const upsertGoalMutation = api.goal.upsert.useMutation({
    onSuccess: async () => {
      toast.success("Goal saved");
      setIsEditing(false);
      await utils.goal.get.invalidate({ metricId });
      await utils.dashboard.getDashboardCharts.invalidate();
    },
    onError: (err) => toast.error(err.message),
  });

  const deleteGoalMutation = api.goal.delete.useMutation({
    onSuccess: async () => {
      toast.success("Goal deleted");
      await utils.goal.get.invalidate({ metricId });
      await utils.dashboard.getDashboardCharts.invalidate();
    },
    onError: (err) => toast.error(err.message),
  });

  const handleSaveGoal = () => {
    const value = parseFloat(targetValue);
    if (isNaN(value) || value <= 0) {
      toast.error("Please enter a valid positive number");
      return;
    }
    upsertGoalMutation.mutate({ metricId, goalType, targetValue: value });
  };

  const handleEditGoal = () => {
    if (goal) {
      setGoalType(goal.goalType);
      setTargetValue(String(goal.targetValue));
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

  // Editing Mode
  if (isEditing || !goal) {
    return (
      <div className="flex h-full flex-col overflow-y-auto p-4">
        <h3 className="mb-4 text-sm font-semibold">
          {goal ? "Edit Goal" : "Set Goal"}
        </h3>

        {/* Empty state intro when no goal */}
        {!goal && !isEditing && (
          <div className="bg-muted/20 mb-4 flex flex-col items-center rounded-lg border border-dashed p-6 text-center">
            <div className="bg-muted mb-3 flex h-12 w-12 items-center justify-center rounded-full">
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
              <div className="bg-muted/50 flex h-9 items-center rounded-md border px-3">
                <span className="text-muted-foreground text-sm capitalize">
                  {formatCadence(cadence)}
                </span>
              </div>
            </div>
          )}

          <div className="space-y-2">
            <Label className="text-xs">
              Target {goalType === "RELATIVE" ? "Growth %" : "Value"}
            </Label>
            <Input
              type="number"
              placeholder={
                goalType === "RELATIVE" ? "e.g., 10 for 10%" : "Target value"
              }
              value={targetValue}
              onChange={(e) => setTargetValue(e.target.value)}
              className="h-9 text-sm"
            />
          </div>

          <div className="flex gap-2 pt-2">
            {goal && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => setIsEditing(false)}
                className="flex-1"
              >
                Cancel
              </Button>
            )}
            <Button
              size="sm"
              onClick={handleSaveGoal}
              disabled={upsertGoalMutation.isPending || !targetValue}
              className="flex-1"
            >
              {upsertGoalMutation.isPending && (
                <Loader2 className="mr-1 h-3 w-3 animate-spin" />
              )}
              Save Goal
            </Button>
          </div>
        </div>
      </div>
    );
  }

  // Display Mode
  return (
    <div className="flex h-full flex-col overflow-y-auto p-4">
      <div className="mb-4 flex items-center justify-between">
        <h3 className="text-sm font-semibold">Goal Progress</h3>
        <Button
          variant="outline"
          size="sm"
          onClick={handleEditGoal}
          className="h-7 px-2"
        >
          <Pencil className="mr-1 h-3 w-3" />
          Edit
        </Button>
      </div>

      <div className="space-y-4">
        {/* Progress Percentage - in a card */}
        <div className="bg-background rounded-lg border p-4 text-center shadow-sm">
          <div className="text-4xl font-bold">
            {goalProgress
              ? `${Math.round(goalProgress.progressPercent)}%`
              : "--"}
          </div>
          <div className="text-muted-foreground text-xs">of goal achieved</div>

          {/* Progress Bar */}
          {goalProgress && (
            <div className="mt-3 space-y-1">
              <div className="bg-muted h-2.5 w-full overflow-hidden rounded-full">
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
              <div className="text-muted-foreground flex justify-between text-[10px]">
                <span>0%</span>
                <span>100%</span>
              </div>
            </div>
          )}
        </div>

        {/* Time Elapsed */}
        {goalProgress && (
          <div className="bg-background rounded-lg border p-3 shadow-sm">
            <div className="flex items-center justify-between">
              <Label className="text-xs">Time Elapsed</Label>
              <div className="text-muted-foreground flex items-center gap-1 text-[10px]">
                <Calendar className="h-3 w-3" />
                {format(new Date(goalProgress.periodStart), "MMM d")} -{" "}
                {format(new Date(goalProgress.periodEnd), "MMM d")}
              </div>
            </div>
            <div className="mt-2 space-y-1">
              <div className="bg-muted h-2 w-full overflow-hidden rounded-full">
                <div
                  className="h-full bg-blue-500 transition-all duration-300"
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
          <div className="bg-background rounded-lg border p-3 shadow-sm">
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
          <div className="bg-background rounded-lg border p-3 shadow-sm">
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
          onClick={() => deleteGoalMutation.mutate({ metricId })}
          disabled={deleteGoalMutation.isPending}
          className="text-destructive hover:text-destructive hover:bg-destructive/10 border-destructive/30 mt-2 w-full"
        >
          {deleteGoalMutation.isPending ? (
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
