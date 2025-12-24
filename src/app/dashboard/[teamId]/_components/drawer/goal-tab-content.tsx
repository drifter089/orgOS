"use client";

import { useState } from "react";

import type { Cadence, GoalType, MetricGoal } from "@prisma/client";
import { Loader2, Pencil, Trash2 } from "lucide-react";
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
      <div className="flex h-full flex-col p-4">
        <h3 className="mb-4 text-sm font-semibold">
          {goal ? "Edit Goal" : "Set Goal"}
        </h3>

        <div className="space-y-4">
          <div className="space-y-2">
            <Label className="text-xs">Type</Label>
            <ToggleGroup
              type="single"
              value={goalType}
              onValueChange={(v) => v && setGoalType(v as GoalType)}
              className="grid w-full grid-cols-2"
            >
              <ToggleGroupItem
                value="ABSOLUTE"
                className="data-[state=on]:bg-primary data-[state=on]:text-primary-foreground text-xs"
              >
                Absolute
              </ToggleGroupItem>
              <ToggleGroupItem
                value="RELATIVE"
                className="data-[state=on]:bg-primary data-[state=on]:text-primary-foreground text-xs"
              >
                Relative %
              </ToggleGroupItem>
            </ToggleGroup>
          </div>

          {cadence && (
            <div className="space-y-2">
              <Label className="text-xs">Period</Label>
              <div className="bg-muted/50 flex h-8 items-center rounded-md border px-3">
                <span className="text-muted-foreground text-xs capitalize">
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
              className="h-8 text-sm"
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
              Save
            </Button>
          </div>
        </div>
      </div>
    );
  }

  // Display Mode
  return (
    <div className="flex h-full flex-col p-4">
      <div className="mb-4 flex items-center justify-between">
        <h3 className="text-sm font-semibold">Goal Progress</h3>
        <Button
          variant="ghost"
          size="sm"
          onClick={handleEditGoal}
          className="h-7 px-2"
        >
          <Pencil className="mr-1 h-3 w-3" />
          Edit
        </Button>
      </div>

      <div className="space-y-4">
        {/* Progress Percentage */}
        <div className="text-center">
          <div className="text-4xl font-bold">
            {goalProgress
              ? `${Math.round(goalProgress.progressPercent)}%`
              : "--"}
          </div>
          <div className="text-muted-foreground text-xs">of goal achieved</div>
        </div>

        {/* Progress Bar */}
        {goalProgress && (
          <div className="space-y-1">
            <div className="bg-muted h-3 w-full overflow-hidden rounded-full">
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

        {/* Time Elapsed */}
        {goalProgress && (
          <div className="space-y-1">
            <Label className="text-xs">Time Elapsed</Label>
            <div className="bg-muted h-2 w-full overflow-hidden rounded-full">
              <div
                className="h-full bg-blue-500 transition-all duration-300"
                style={{
                  width: `${Math.min(
                    (goalProgress.daysElapsed /
                      (goalProgress.daysElapsed + goalProgress.daysRemaining)) *
                      100,
                    100,
                  )}%`,
                }}
              />
            </div>
            <div className="text-muted-foreground text-[10px]">
              {goalProgress.daysRemaining}d remaining
            </div>
          </div>
        )}

        {/* Current / Target */}
        <div className="grid grid-cols-2 gap-3 pt-2">
          <div className="rounded-lg border p-3">
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
          <div className="rounded-lg border p-3">
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
          variant="ghost"
          size="sm"
          onClick={() => deleteGoalMutation.mutate({ metricId })}
          disabled={deleteGoalMutation.isPending}
          className="text-destructive hover:text-destructive hover:bg-destructive/10 mt-4 w-full"
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
