"use client";

import { useEffect, useState } from "react";

import type { Cadence, GoalType, MetricGoal } from "@prisma/client";
import { Loader2, Pencil, Target, Trash2 } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { SliderWithInputs } from "@/components/ui/slider-with-inputs";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import type { SuggestedRange } from "@/lib/goals/value-extractor";
import { formatCadence } from "@/lib/helpers/format-cadence";
import { formatValue } from "@/lib/helpers/format-value";
import { api } from "@/trpc/react";

interface GoalEditorProps {
  metricId: string;
  /** Optional: Pre-loaded goal data to avoid extra query */
  initialGoal?: MetricGoal | null;
  /** Optional: The chart's cadence (read-only display) */
  cadence?: Cadence | null;
  /** Optional: Suggested range for slider */
  initialSuggestedRange?: SuggestedRange | null;
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
  initialSuggestedRange,
  compact = false,
  onSave,
  onDelete,
  startEditing = false,
}: GoalEditorProps) {
  const [isEditing, setIsEditing] = useState(startEditing);
  const [goalType, setGoalType] = useState<GoalType>("ABSOLUTE");
  const [targetValue, setTargetValue] = useState(10);

  const utils = api.useUtils();

  // Only fetch if we don't have initial data
  const shouldFetch = initialGoal === undefined;
  const { data: goalData, isLoading: isGoalLoading } = api.goal.get.useQuery(
    { metricId },
    { enabled: shouldFetch },
  );

  // Use initial data if provided, otherwise use fetched data
  const goal = initialGoal !== undefined ? initialGoal : goalData?.goal;
  const cadence =
    initialCadence !== undefined ? initialCadence : goalData?.cadence;
  const suggestedRange =
    initialSuggestedRange !== undefined
      ? initialSuggestedRange
      : goalData?.suggestedRange;

  // Sync editing state with startEditing prop
  useEffect(() => {
    if (startEditing && !goal) {
      setIsEditing(true);
    }
  }, [startEditing, goal]);

  const upsertGoalMutation = api.goal.upsert.useMutation({
    onSuccess: async () => {
      toast.success("Goal saved");
      setIsEditing(false);
      await utils.goal.get.invalidate({ metricId });
      await utils.dashboard.getDashboardCharts.invalidate();
      onSave?.();
    },
    onError: (err) => {
      toast.error(err.message);
    },
  });

  const deleteGoalMutation = api.goal.delete.useMutation({
    onSuccess: async () => {
      toast.success("Goal deleted");
      await utils.goal.get.invalidate({ metricId });
      await utils.dashboard.getDashboardCharts.invalidate();
      onDelete?.();
    },
    onError: (err) => {
      toast.error(err.message);
    },
  });

  const handleSaveGoal = () => {
    if (targetValue <= 0) {
      toast.error("Please enter a valid positive number");
      return;
    }
    upsertGoalMutation.mutate({
      metricId,
      goalType,
      targetValue,
    });
  };

  const handleEditGoal = () => {
    if (goal) {
      setGoalType(goal.goalType);
      setTargetValue(goal.targetValue);
    }
    setIsEditing(true);
  };

  const handleCancelEdit = () => {
    setIsEditing(false);
    // Reset to goal value or default
    if (goal) {
      setTargetValue(goal.targetValue);
    }
  };

  const handleDelete = () => {
    deleteGoalMutation.mutate({ metricId });
  };

  if (shouldFetch && isGoalLoading) {
    return (
      <div className="flex items-center justify-center py-4">
        <Loader2 className="text-muted-foreground h-4 w-4 animate-spin" />
      </div>
    );
  }

  // Form view (editing or no goal)
  if (isEditing || !goal) {
    return (
      <div className={`flex flex-col gap-2 ${compact ? "gap-1.5" : "gap-2"}`}>
        <div className="flex items-center gap-1.5">
          <Target className="text-muted-foreground h-3 w-3" />
          <span className="text-muted-foreground text-[10px] font-medium tracking-wide uppercase">
            {goal ? "Edit Goal" : "Set Goal"}
          </span>
        </div>

        <div className="space-y-0.5">
          <span className="text-muted-foreground text-[10px]">Type</span>
          <ToggleGroup
            type="single"
            value={goalType}
            onValueChange={(v) => v && setGoalType(v as GoalType)}
            className="grid w-full grid-cols-2 gap-0 rounded-md border"
          >
            <ToggleGroupItem
              value="ABSOLUTE"
              className="data-[state=on]:bg-primary data-[state=on]:text-primary-foreground h-7 rounded-none rounded-l-md border-r text-[10px]"
            >
              Absolute
            </ToggleGroupItem>
            <ToggleGroupItem
              value="RELATIVE"
              className="data-[state=on]:bg-primary data-[state=on]:text-primary-foreground h-7 rounded-none rounded-r-md text-[10px]"
            >
              Relative %
            </ToggleGroupItem>
          </ToggleGroup>
        </div>

        {/* Show cadence as read-only info */}
        {cadence && (
          <div className="space-y-0.5">
            <span className="text-muted-foreground text-[10px]">
              Period (from chart)
            </span>
            <div className="bg-muted/50 flex h-7 items-center rounded-md border px-2">
              <span className="text-muted-foreground text-[10px] capitalize">
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

        <div className="flex gap-1.5">
          {goal && (
            <Button
              variant="outline"
              size="sm"
              onClick={handleCancelEdit}
              className="h-7 flex-1 text-xs"
            >
              Cancel
            </Button>
          )}
          <Button
            size="sm"
            onClick={handleSaveGoal}
            disabled={upsertGoalMutation.isPending || targetValue <= 0}
            className="h-7 flex-1 text-xs"
          >
            {upsertGoalMutation.isPending && (
              <Loader2 className="mr-1 h-3 w-3 animate-spin" />
            )}
            Save Goal
          </Button>
        </div>
      </div>
    );
  }

  // Collapsed view (goal exists, not editing)
  return (
    <div className="flex items-center justify-between rounded-md border p-2">
      <div className="flex items-center gap-2">
        <Target className="text-muted-foreground h-4 w-4" />
        <span className="text-sm font-medium">
          {goal.goalType === "ABSOLUTE"
            ? formatValue(goal.targetValue)
            : `+${goal.targetValue}%`}
          {cadence && (
            <span className="text-muted-foreground ml-1 font-normal">
              {formatCadence(cadence)}
            </span>
          )}
        </span>
      </div>
      <div className="flex gap-1.5">
        <Button
          variant="outline"
          size="sm"
          onClick={handleEditGoal}
          className="h-7 px-2 text-xs"
        >
          <Pencil className="mr-1 h-3 w-3" />
          Edit
        </Button>
        <Button
          variant="destructive"
          size="sm"
          onClick={handleDelete}
          disabled={deleteGoalMutation.isPending}
          className="h-7 w-7 p-0"
        >
          {deleteGoalMutation.isPending ? (
            <Loader2 className="h-3 w-3 animate-spin" />
          ) : (
            <Trash2 className="h-3 w-3" />
          )}
        </Button>
      </div>
    </div>
  );
}
