"use client";

import { useEffect, useState } from "react";

import type { Cadence, GoalType, MetricGoal } from "@prisma/client";
import { Loader2, Pencil, Target, Trash2 } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { formatCadence } from "@/lib/helpers/format-cadence";
import { formatValue } from "@/lib/helpers/format-value";
import { api } from "@/trpc/react";

interface GoalEditorProps {
  metricId: string;
  /** Optional: Pre-loaded goal data to avoid extra query */
  initialGoal?: MetricGoal | null;
  /** Optional: The chart's cadence (read-only display) */
  cadence?: Cadence | null;
  /** Compact mode for use in dialogs */
  compact?: boolean;
  /** Callback when goal is saved */
  onSave?: () => void;
  /** Callback when goal is deleted */
  onDelete?: () => void;
  /** Start in editing mode (useful for new metrics) */
  startEditing?: boolean;
}

export function GoalEditor({
  metricId,
  initialGoal,
  cadence: initialCadence,
  compact = false,
  onSave,
  onDelete,
  startEditing = false,
}: GoalEditorProps) {
  const [isEditing, setIsEditing] = useState(startEditing);
  const [goalType, setGoalType] = useState<GoalType>("ABSOLUTE");
  const [targetValue, setTargetValue] = useState("");

  const utils = api.useUtils();

  // Only fetch if we don't have initial data
  const shouldFetch = initialGoal === undefined;
  const { data: goalData, isLoading: isGoalLoading } =
    api.metric.getGoal.useQuery({ metricId }, { enabled: shouldFetch });

  // Use initial data if provided, otherwise use fetched data
  const goal = initialGoal !== undefined ? initialGoal : goalData?.goal;
  const cadence =
    initialCadence !== undefined ? initialCadence : goalData?.cadence;

  // Sync editing state with startEditing prop
  useEffect(() => {
    if (startEditing && !goal) {
      setIsEditing(true);
    }
  }, [startEditing, goal]);

  const upsertGoalMutation = api.metric.upsertGoal.useMutation({
    onSuccess: async () => {
      toast.success("Goal saved");
      setIsEditing(false);
      setTargetValue("");
      await utils.metric.getGoal.refetch({ metricId });
      await utils.dashboard.getDashboardCharts.refetch();
      onSave?.();
    },
    onError: (err) => {
      toast.error(err.message);
    },
  });

  const deleteGoalMutation = api.metric.deleteGoal.useMutation({
    onSuccess: async () => {
      toast.success("Goal deleted");
      await utils.metric.getGoal.refetch({ metricId });
      await utils.dashboard.getDashboardCharts.refetch();
      onDelete?.();
    },
    onError: (err) => {
      toast.error(err.message);
    },
  });

  const handleSaveGoal = () => {
    const value = parseFloat(targetValue);
    if (isNaN(value) || value <= 0) {
      toast.error("Please enter a valid positive number");
      return;
    }
    upsertGoalMutation.mutate({
      metricId,
      goalType,
      targetValue: value,
    });
  };

  const handleEditGoal = () => {
    if (goal) {
      setGoalType(goal.goalType);
      setTargetValue(String(goal.targetValue));
    }
    setIsEditing(true);
  };

  const handleCancelEdit = () => {
    setIsEditing(false);
    setTargetValue("");
  };

  const handleDelete = () => {
    deleteGoalMutation.mutate({ metricId });
  };

  if (shouldFetch && isGoalLoading) {
    return (
      <div className="flex items-center justify-center py-4">
        <Loader2 className="h-4 w-4 animate-spin text-gray-400" />
      </div>
    );
  }

  // Form view (editing or no goal)
  if (isEditing || !goal) {
    return (
      <div className={`flex flex-col gap-3 ${compact ? "gap-2" : "gap-3"}`}>
        <div className="flex items-center gap-2">
          <Target className="h-4 w-4 text-gray-500" />
          <span className="text-xs font-medium text-gray-500">
            {goal ? "Edit Goal" : "Set New Goal"}
          </span>
        </div>

        <div className="space-y-1.5">
          <span className="text-xs font-medium text-gray-500">Goal Type</span>
          <ToggleGroup
            type="single"
            value={goalType}
            onValueChange={(v) => v && setGoalType(v as GoalType)}
            className="grid w-full grid-cols-2 gap-1"
          >
            <ToggleGroupItem
              value="ABSOLUTE"
              className="dark:border-border dark:data-[state=on]:bg-primary dark:data-[state=on]:text-primary-foreground h-9 rounded-lg border border-gray-200 text-xs font-medium data-[state=on]:bg-gray-900 data-[state=on]:text-white"
            >
              Absolute
            </ToggleGroupItem>
            <ToggleGroupItem
              value="RELATIVE"
              className="dark:border-border dark:data-[state=on]:bg-primary dark:data-[state=on]:text-primary-foreground h-9 rounded-lg border border-gray-200 text-xs font-medium data-[state=on]:bg-gray-900 data-[state=on]:text-white"
            >
              Relative %
            </ToggleGroupItem>
          </ToggleGroup>
        </div>

        {/* Show cadence as read-only info */}
        {cadence && (
          <div className="space-y-1.5">
            <span className="text-xs font-medium text-gray-500">
              Period (from chart)
            </span>
            <div className="dark:border-border dark:bg-muted/50 flex h-9 items-center rounded-lg border border-gray-200 bg-gray-50 px-3">
              <span className="text-xs text-gray-500">
                {formatCadence(cadence)}
              </span>
            </div>
          </div>
        )}

        <div className="space-y-1.5">
          <span className="text-xs font-medium text-gray-500">
            Target {goalType === "RELATIVE" ? "Growth %" : "Value"}
          </span>
          <Input
            type="number"
            placeholder={
              goalType === "RELATIVE"
                ? "e.g., 10 for 10% growth"
                : "Enter target value"
            }
            value={targetValue}
            onChange={(e) => setTargetValue(e.target.value)}
            className="h-9 rounded-lg text-sm"
          />
        </div>

        <div className="flex gap-2 pt-1">
          {goal && (
            <Button
              variant="outline"
              size="sm"
              onClick={handleCancelEdit}
              className="h-9 flex-1 rounded-lg"
            >
              Cancel
            </Button>
          )}
          <Button
            size="sm"
            onClick={handleSaveGoal}
            disabled={upsertGoalMutation.isPending || !targetValue}
            className="h-9 flex-1 rounded-lg"
          >
            {upsertGoalMutation.isPending && (
              <Loader2 className="mr-2 h-3 w-3 animate-spin" />
            )}
            Save Goal
          </Button>
        </div>
      </div>
    );
  }

  // Collapsed view (goal exists, not editing)
  return (
    <div className="dark:border-border dark:bg-background dark:hover:border-border/80 flex items-center justify-between rounded-xl border border-gray-200 bg-white p-4 transition-colors hover:border-gray-300">
      <div className="flex items-center gap-3">
        <div className="dark:bg-muted flex h-8 w-8 items-center justify-center rounded-lg bg-gray-100">
          <Target className="dark:text-foreground h-4 w-4 text-gray-900" />
        </div>
        <div className="flex flex-col">
          <span className="dark:text-foreground text-sm font-semibold text-gray-900">
            {goal.goalType === "ABSOLUTE"
              ? formatValue(goal.targetValue)
              : `+${goal.targetValue}%`}
          </span>
          {cadence && (
            <span className="dark:text-muted-foreground text-xs text-gray-500">
              {formatCadence(cadence)} Target
            </span>
          )}
        </div>
      </div>
      <div className="flex gap-2">
        <Button
          variant="outline"
          size="icon"
          onClick={handleEditGoal}
          className="h-8 w-8 rounded-lg"
        >
          <Pencil className="h-3.5 w-3.5" />
        </Button>
        <Button
          variant="ghost"
          size="icon"
          onClick={handleDelete}
          disabled={deleteGoalMutation.isPending}
          className="h-8 w-8 rounded-lg text-gray-400 hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-900/20"
        >
          {deleteGoalMutation.isPending ? (
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
          ) : (
            <Trash2 className="h-3.5 w-3.5" />
          )}
        </Button>
      </div>
    </div>
  );
}
