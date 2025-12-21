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
        <Loader2 className="text-muted-foreground h-4 w-4 animate-spin" />
      </div>
    );
  }

  // Form view (editing or no goal)
  if (isEditing || !goal) {
    return (
      <div className={`flex flex-col gap-3 ${compact ? "gap-2" : "gap-3"}`}>
        <div className="flex items-center gap-2">
          <Target className="text-muted-foreground h-3.5 w-3.5" />
          <span className="text-muted-foreground text-[10px] font-bold tracking-widest uppercase">
            {goal ? "EDIT GOAL" : "SET NEW GOAL"}
          </span>
        </div>

        <div className="space-y-1">
          <span className="text-muted-foreground text-[10px] font-bold tracking-wider uppercase">
            GOAL TYPE
          </span>
          <ToggleGroup
            type="single"
            value={goalType}
            onValueChange={(v) => v && setGoalType(v as GoalType)}
            className="border-foreground/10 grid w-full grid-cols-2 gap-0 border"
          >
            <ToggleGroupItem
              value="ABSOLUTE"
              className="data-[state=on]:bg-foreground data-[state=on]:text-background border-foreground/10 h-8 rounded-none border-r text-[10px] font-bold tracking-wider uppercase transition-all"
            >
              ABSOLUTE
            </ToggleGroupItem>
            <ToggleGroupItem
              value="RELATIVE"
              className="data-[state=on]:bg-foreground data-[state=on]:text-background h-8 rounded-none text-[10px] font-bold tracking-wider uppercase transition-all"
            >
              RELATIVE %
            </ToggleGroupItem>
          </ToggleGroup>
        </div>

        {/* Show cadence as read-only info */}
        {cadence && (
          <div className="space-y-1">
            <span className="text-muted-foreground text-[10px] font-bold tracking-wider uppercase">
              PERIOD (FROM CHART)
            </span>
            <div className="bg-muted/10 border-foreground/10 flex h-8 items-center border px-3">
              <span className="text-muted-foreground text-[10px] font-bold tracking-wider uppercase">
                {formatCadence(cadence)}
              </span>
            </div>
          </div>
        )}

        <div className="space-y-1">
          <span className="text-muted-foreground text-[10px] font-bold tracking-wider uppercase">
            TARGET {goalType === "RELATIVE" ? "GROWTH %" : "VALUE"}
          </span>
          <Input
            type="number"
            placeholder={
              goalType === "RELATIVE"
                ? "E.G., 10 FOR 10% GROWTH"
                : "ENTER TARGET VALUE"
            }
            value={targetValue}
            onChange={(e) => setTargetValue(e.target.value)}
            className="border-foreground/10 h-8 rounded-none text-xs tracking-wide placeholder:text-[10px] placeholder:uppercase"
          />
        </div>

        <div className="flex gap-2 pt-1">
          {goal && (
            <Button
              variant="outline"
              size="sm"
              onClick={handleCancelEdit}
              className="border-foreground/10 h-8 flex-1 rounded-none text-[10px] font-bold tracking-wider uppercase"
            >
              CANCEL
            </Button>
          )}
          <Button
            size="sm"
            onClick={handleSaveGoal}
            disabled={upsertGoalMutation.isPending || !targetValue}
            className="h-8 flex-1 rounded-none text-[10px] font-bold tracking-wider uppercase"
          >
            {upsertGoalMutation.isPending && (
              <Loader2 className="mr-2 h-3 w-3 animate-spin" />
            )}
            SAVE GOAL
          </Button>
        </div>
      </div>
    );
  }

  // Collapsed view (goal exists, not editing)
  return (
    <div className="border-foreground/10 bg-background hover:border-foreground/20 flex items-center justify-between border p-3 transition-colors">
      <div className="flex items-center gap-3">
        <Target className="text-primary h-4 w-4" />
        <div className="flex flex-col">
          <span className="text-sm font-bold tracking-tight">
            {goal.goalType === "ABSOLUTE"
              ? formatValue(goal.targetValue)
              : `+${goal.targetValue}%`}
          </span>
          {cadence && (
            <span className="text-muted-foreground text-[10px] tracking-wider uppercase">
              {formatCadence(cadence)} TARGET
            </span>
          )}
        </div>
      </div>
      <div className="flex gap-2">
        <Button
          variant="outline"
          size="icon"
          onClick={handleEditGoal}
          className="border-foreground/10 hover:bg-muted h-7 w-7 rounded-none"
        >
          <Pencil className="h-3.5 w-3.5" />
        </Button>
        <Button
          variant="ghost"
          size="icon"
          onClick={handleDelete}
          disabled={deleteGoalMutation.isPending}
          className="text-muted-foreground hover:bg-destructive/10 hover:text-destructive h-7 w-7 rounded-none"
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
