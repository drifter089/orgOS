"use client";

import { useState } from "react";

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
import { Label, PolarGrid, RadialBar, RadialBarChart } from "recharts";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ChartContainer } from "@/components/ui/chart";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { api } from "@/trpc/react";

interface DashboardMetricGoalsProps {
  metricId: string;
  metricName: string;
}

type GoalType = "ABSOLUTE" | "RELATIVE";
type GoalPeriod = "WEEKLY" | "MONTHLY";

function getStatusConfig(status: string) {
  switch (status) {
    case "exceeded":
      return {
        label: "Exceeded",
        variant: "default" as const,
        color: "hsl(var(--chart-2))",
        icon: <Check className="h-3 w-3" />,
      };
    case "on_track":
      return {
        label: "On Track",
        variant: "secondary" as const,
        color: "hsl(var(--chart-1))",
        icon: <TrendingUp className="h-3 w-3" />,
      };
    case "at_risk":
      return {
        label: "At Risk",
        variant: "destructive" as const,
        color: "hsl(var(--chart-5))",
        icon: <AlertTriangle className="h-3 w-3" />,
      };
    default:
      return {
        label: "No Data",
        variant: "outline" as const,
        color: "hsl(var(--muted))",
        icon: <Target className="h-3 w-3" />,
      };
  }
}

export function DashboardMetricGoals({
  metricId,
  metricName,
}: DashboardMetricGoalsProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [goalType, setGoalType] = useState<GoalType>("ABSOLUTE");
  const [goalPeriod, setGoalPeriod] = useState<GoalPeriod>("WEEKLY");
  const [targetValue, setTargetValue] = useState("");

  const utils = api.useUtils();

  const { data, isLoading } = api.metric.getGoal.useQuery({ metricId });

  const upsertGoalMutation = api.metric.upsertGoal.useMutation({
    onSuccess: () => {
      toast.success("Goal saved");
      setIsEditing(false);
      void utils.metric.getGoal.invalidate({ metricId });
    },
    onError: (err) => toast.error(err.message),
  });

  const deleteGoalMutation = api.metric.deleteGoal.useMutation({
    onSuccess: () => {
      toast.success("Goal deleted");
      void utils.metric.getGoal.invalidate({ metricId });
    },
    onError: (err) => toast.error(err.message),
  });

  const handleSave = () => {
    const value = parseFloat(targetValue);
    if (isNaN(value) || value <= 0) {
      toast.error("Please enter a valid positive number");
      return;
    }
    upsertGoalMutation.mutate({
      metricId,
      goalType,
      goalPeriod,
      targetValue: value,
    });
  };

  const handleEdit = () => {
    if (data?.goal) {
      setGoalType(data.goal.goalType);
      setGoalPeriod(data.goal.goalPeriod);
      setTargetValue(String(data.goal.targetValue));
    }
    setIsEditing(true);
  };

  const handleCancel = () => {
    setIsEditing(false);
    setTargetValue("");
  };

  // Render loading state
  if (isLoading) {
    return (
      <Card className="flex h-full flex-col items-center justify-center">
        <Loader2 className="text-muted-foreground h-6 w-6 animate-spin" />
      </Card>
    );
  }

  // Render form (create or edit)
  if (isEditing || !data?.goal) {
    return (
      <Card className="flex h-full flex-col overflow-hidden">
        <CardHeader className="shrink-0 px-4 pt-4 pb-2">
          <CardTitle className="text-base">
            {data?.goal ? "Edit Goal" : "Set Goal"}
          </CardTitle>
          <p className="text-muted-foreground truncate text-xs">{metricName}</p>
        </CardHeader>
        <CardContent className="flex min-h-0 flex-1 flex-col gap-3 px-4 pt-0">
          {/* Goal Type */}
          <div className="space-y-1.5">
            <label className="text-sm font-medium">Goal Type</label>
            <Select
              value={goalType}
              onValueChange={(v) => setGoalType(v as GoalType)}
            >
              <SelectTrigger className="h-9">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ABSOLUTE">
                  Absolute (reach X value)
                </SelectItem>
                <SelectItem value="RELATIVE">Relative (grow by X%)</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Goal Period */}
          <div className="space-y-1.5">
            <label className="text-sm font-medium">Period</label>
            <Select
              value={goalPeriod}
              onValueChange={(v) => setGoalPeriod(v as GoalPeriod)}
            >
              <SelectTrigger className="h-9">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="WEEKLY">Weekly (Mon-Sun)</SelectItem>
                <SelectItem value="MONTHLY">Monthly</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Target Value */}
          <div className="space-y-1.5">
            <label className="text-sm font-medium">
              Target {goalType === "RELATIVE" ? "Growth %" : "Value"}
            </label>
            <Input
              type="number"
              placeholder={
                goalType === "RELATIVE" ? "e.g., 10 for 10%" : "e.g., 1000"
              }
              value={targetValue}
              onChange={(e) => setTargetValue(e.target.value)}
              className="h-9"
            />
          </div>

          <div className="mt-auto flex gap-2 pt-2">
            {data?.goal && (
              <Button
                variant="outline"
                onClick={handleCancel}
                className="flex-1"
              >
                Cancel
              </Button>
            )}
            <Button
              onClick={handleSave}
              disabled={upsertGoalMutation.isPending || !targetValue}
              className="flex-1"
            >
              {upsertGoalMutation.isPending && (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              )}
              Save Goal
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  // Render goal progress display
  const { goal, progress } = data;
  const statusConfig = getStatusConfig(progress.status);

  // Prepare radial chart data
  const progressValue = Math.min(Math.max(progress.progressPercent, 0), 100);
  const chartData = [
    {
      name: "progress",
      value: progressValue,
      fill: statusConfig.color,
    },
  ];

  const chartConfig = {
    progress: { label: "Progress", color: statusConfig.color },
  };

  return (
    <Card className="flex h-full flex-col overflow-hidden">
      <CardHeader className="shrink-0 px-4 pt-4 pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base">Goal Progress</CardTitle>
          <Badge variant={statusConfig.variant} className="gap-1">
            {statusConfig.icon}
            {statusConfig.label}
          </Badge>
        </div>
        <p className="text-muted-foreground text-xs">
          {goal.goalPeriod.toLowerCase()} goal:{" "}
          {goal.goalType === "ABSOLUTE"
            ? `reach ${goal.targetValue.toLocaleString()}`
            : `grow ${goal.targetValue}%`}
        </p>
      </CardHeader>

      <CardContent className="flex min-h-0 flex-1 flex-col gap-2 px-4 pt-0">
        {/* Radial Progress Chart */}
        <div className="flex-1">
          <ChartContainer
            config={chartConfig}
            className="mx-auto h-full max-h-[160px]"
          >
            <RadialBarChart
              data={chartData}
              startAngle={90}
              endAngle={90 - (360 * progressValue) / 100}
              innerRadius={50}
              outerRadius={80}
            >
              <PolarGrid
                gridType="circle"
                radialLines={false}
                stroke="none"
                className="first:fill-muted last:fill-background"
                polarRadius={[56, 44]}
              />
              <RadialBar dataKey="value" background cornerRadius={10}>
                <Label
                  content={({ viewBox }) => {
                    if (viewBox && "cx" in viewBox && "cy" in viewBox) {
                      return (
                        <text
                          x={viewBox.cx}
                          y={viewBox.cy}
                          textAnchor="middle"
                          dominantBaseline="middle"
                        >
                          <tspan
                            x={viewBox.cx}
                            y={viewBox.cy}
                            className="fill-foreground text-xl font-bold"
                          >
                            {Math.round(progress.progressPercent)}%
                          </tspan>
                          <tspan
                            x={viewBox.cx}
                            y={(viewBox.cy ?? 0) + 18}
                            className="fill-muted-foreground text-xs"
                          >
                            {progress.daysRemaining}d left
                          </tspan>
                        </text>
                      );
                    }
                  }}
                />
              </RadialBar>
            </RadialBarChart>
          </ChartContainer>
        </div>

        {/* Stats Row */}
        <div className="grid grid-cols-2 gap-2 text-sm">
          <div className="rounded border p-2">
            <p className="text-muted-foreground text-xs">Current</p>
            <p className="font-medium">
              {progress.currentValue?.toLocaleString() ?? "—"}
              {goal.goalType === "RELATIVE" &&
                progress.growthPercent !== undefined && (
                  <span className="text-muted-foreground ml-1 text-xs">
                    ({progress.growthPercent > 0 ? "+" : ""}
                    {progress.growthPercent}%)
                  </span>
                )}
            </p>
          </div>
          <div className="rounded border p-2">
            <p className="text-muted-foreground text-xs">Target</p>
            <p className="font-medium">
              {goal.goalType === "ABSOLUTE"
                ? goal.targetValue.toLocaleString()
                : `+${goal.targetValue}%`}
            </p>
          </div>
        </div>

        {/* Period Info */}
        <p className="text-muted-foreground flex items-center justify-center gap-1 text-xs">
          <Calendar className="h-3 w-3" />
          {format(new Date(progress.periodStart), "MMM d")} -{" "}
          {format(new Date(progress.periodEnd), "MMM d")}
        </p>

        {/* Actions */}
        <div className="mt-auto flex gap-2 border-t pt-2">
          <Button
            variant="outline"
            size="sm"
            onClick={handleEdit}
            className="flex-1"
          >
            <Pencil className="mr-1.5 h-3.5 w-3.5" />
            Edit Goal
          </Button>
          <Button
            variant="destructive"
            size="sm"
            onClick={() => deleteGoalMutation.mutate({ metricId })}
            disabled={deleteGoalMutation.isPending}
          >
            {deleteGoalMutation.isPending ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Trash2 className="h-4 w-4" />
            )}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
