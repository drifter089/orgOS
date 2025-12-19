"use client";

import { useEffect, useState } from "react";

import type { Cadence, GoalType, MetricGoal } from "@prisma/client";
import { format } from "date-fns";
import {
  AlertTriangle,
  Calendar,
  Check,
  Loader2,
  Pencil,
  Target,
  Trash2,
  TrendingUp,
} from "lucide-react";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { formatCadence } from "@/lib/helpers/format-cadence";
import { formatValue } from "@/lib/helpers/format-value";
import type { GoalProgress } from "@/server/api/utils/goal-calculation";
import { api } from "@/trpc/react";

interface GoalEditorProps {
  metricId: string;
  /** Optional: Pre-loaded goal data to avoid extra query */
  initialGoal?: MetricGoal | null;
  initialProgress?: GoalProgress | null;
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
  /** Optional: Pre-loaded current value */
  initialCurrentValue?: number | null;
  /** Optional: Pre-loaded current value label */
  initialCurrentValueLabel?: string | null;
  /** Optional: Pre-loaded value label (raw data label) */
  initialValueLabel?: string | null;
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

export function GoalEditor({
  metricId,
  initialGoal,
  initialProgress,
  cadence: initialCadence,
  compact = false,
  onSave,
  onDelete,
  startEditing = false,
  initialCurrentValue,
  initialCurrentValueLabel,
  initialValueLabel,
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
  const progress =
    initialProgress !== undefined ? initialProgress : goalData?.progress;
  const cadence =
    initialCadence !== undefined ? initialCadence : goalData?.cadence;
  const currentValue =
    initialCurrentValue !== undefined
      ? initialCurrentValue
      : (goalData?.currentValue ?? null);
  const currentValueLabel =
    initialCurrentValueLabel !== undefined
      ? initialCurrentValueLabel
      : (goalData?.currentValueLabel ?? null);
  const valueLabel =
    initialValueLabel !== undefined
      ? initialValueLabel
      : (goalData?.valueLabel ?? null);

  // Sync editing state with startEditing prop
  useEffect(() => {
    if (startEditing && !goal) {
      setIsEditing(true);
    }
  }, [startEditing, goal]);

  const upsertGoalMutation = api.metric.upsertGoal.useMutation({
    onSuccess: () => {
      toast.success("Goal saved");
      setIsEditing(false);
      void utils.metric.getGoal.invalidate({ metricId });
      void utils.dashboard.getDashboardCharts.invalidate();
      onSave?.();
    },
    onError: (err) => toast.error(err.message),
  });

  const deleteGoalMutation = api.metric.deleteGoal.useMutation({
    onSuccess: () => {
      toast.success("Goal deleted");
      void utils.metric.getGoal.invalidate({ metricId });
      void utils.dashboard.getDashboardCharts.invalidate();
      onDelete?.();
    },
    onError: (err) => toast.error(err.message),
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
            Goal Target
          </span>
        </div>

        {/* Current value display */}
        {currentValue !== null && (
          <div className="bg-muted/30 rounded-md border p-2">
            <p className="text-muted-foreground text-[10px]">Current Value</p>
            <div className="flex items-baseline gap-1.5">
              <span className="text-lg font-semibold">
                {formatValue(currentValue)}
              </span>
              {(currentValueLabel ?? valueLabel) && (
                <span className="text-muted-foreground text-xs">
                  {currentValueLabel ?? valueLabel}
                </span>
              )}
            </div>
          </div>
        )}

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
            Target{" "}
            {goalType === "RELATIVE"
              ? "Growth %"
              : (currentValueLabel ?? valueLabel ?? "Value")}
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

  // Display view (goal exists)
  return (
    <div className={`flex flex-col gap-2 ${compact ? "gap-1.5" : "gap-2"}`}>
      <div className="flex items-center gap-1.5">
        <Target className="text-muted-foreground h-3 w-3" />
        <span className="text-muted-foreground text-[10px] font-medium tracking-wide uppercase">
          Goal Target
        </span>
      </div>

      <div className="rounded border p-1.5">
        <div className="flex items-center justify-between">
          <span className="text-xs font-medium capitalize">
            {cadence ? formatCadence(cadence) : "—"} goal
          </span>
          {progress && (
            <Badge
              variant={getStatusConfig(progress.status).variant}
              className="h-4 gap-0.5 px-1 text-[10px]"
            >
              {getStatusConfig(progress.status).icon}
              {getStatusConfig(progress.status).label}
            </Badge>
          )}
        </div>

        <div className="mt-1.5 grid grid-cols-3 gap-2">
          <div>
            <p className="text-muted-foreground text-[10px]">Current</p>
            <p className="text-sm font-semibold">
              {currentValue !== null ? formatValue(currentValue) : "—"}
            </p>
            {(currentValueLabel ?? valueLabel) && currentValue !== null && (
              <p className="text-muted-foreground text-[9px]">
                {currentValueLabel ?? valueLabel}
              </p>
            )}
          </div>
          <div>
            <p className="text-muted-foreground text-[10px]">Target</p>
            <p className="text-sm font-semibold">
              {goal.goalType === "ABSOLUTE"
                ? formatValue(goal.targetValue)
                : `+${goal.targetValue}%`}
            </p>
            {goal.goalType === "ABSOLUTE" &&
              (currentValueLabel ?? valueLabel) && (
                <p className="text-muted-foreground text-[9px]">
                  {currentValueLabel ?? valueLabel}
                </p>
              )}
          </div>
          <div>
            <p className="text-muted-foreground text-[10px]">Progress</p>
            <p className="text-sm font-semibold">
              {progress ? `${Math.round(progress.progressPercent)}%` : "—"}
            </p>
          </div>
        </div>

        {progress && (
          <p className="text-muted-foreground mt-1 flex items-center gap-1 text-[10px]">
            <Calendar className="h-2.5 w-2.5" />
            {progress.daysRemaining}d left •{" "}
            {format(new Date(progress.periodEnd), "MMM d")}
          </p>
        )}
      </div>

      <div className="flex gap-1.5">
        <Button
          variant="outline"
          size="sm"
          onClick={handleEditGoal}
          className="h-7 flex-1 text-xs"
        >
          <Pencil className="mr-1 h-3 w-3" />
          Edit
        </Button>
        <Button
          variant="destructive"
          size="sm"
          onClick={() => deleteGoalMutation.mutate({ metricId })}
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
