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
      await utils.metric.getGoal.invalidate({ metricId });
      await utils.dashboard.getDashboardCharts.invalidate();
      onSave?.();
    },
    onError: (err) => {
      toast.error(err.message);
    },
  });

  const deleteGoalMutation = api.metric.deleteGoal.useMutation({
    onSuccess: async () => {
      toast.success("Goal deleted");
      await utils.metric.getGoal.invalidate({ metricId });
      await utils.dashboard.getDashboardCharts.invalidate();
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

        <div className="space-y-0.5">
          <span className="text-muted-foreground text-[10px]">
            Target {goalType === "RELATIVE" ? "Growth %" : "Value"}
          </span>
          <Input
            type="number"
            placeholder={
              goalType === "RELATIVE"
                ? "e.g., 10 for 10% growth"
                : "Target value"
            }
            value={targetValue}
            onChange={(e) => setTargetValue(e.target.value)}
            className="h-7 text-xs"
          />
        </div>

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
            disabled={upsertGoalMutation.isPending || !targetValue}
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
