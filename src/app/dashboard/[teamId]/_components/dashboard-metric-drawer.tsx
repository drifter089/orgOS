"use client";

import { useEffect, useState } from "react";

import type { Cadence, GoalType, MetricGoal } from "@prisma/client";
import { formatDistanceToNow } from "date-fns";
import {
  BarChart3,
  Check,
  ClipboardCheck,
  Loader2,
  Pencil,
  RefreshCw,
  Settings,
  Target,
  Trash2,
  TrendingUp,
  Users,
  X,
} from "lucide-react";
import { Link } from "next-transition-router";
import { toast } from "sonner";

import { RoleAssignment } from "@/components/metric/role-assignment";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { DrawerClose } from "@/components/ui/drawer";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { type GoalProgress, calculateTargetDisplayValue } from "@/lib/goals";
import { formatCadence } from "@/lib/helpers/format-cadence";
import { formatValue } from "@/lib/helpers/format-value";
import { getDimensionDisplayLabel } from "@/lib/metrics/dimension-labels";
import { getLatestMetricValue } from "@/lib/metrics/get-latest-value";
import type { ChartTransformResult } from "@/lib/metrics/transformer-types";
import { getPlatformConfig } from "@/lib/platform-config";
import { cn } from "@/lib/utils";
import { api } from "@/trpc/react";
import type { DashboardChartWithRelations } from "@/types/dashboard";

import { DashboardMetricChart } from "./dashboard-metric-chart";
import type { PipelineStatus } from "./pipeline-status-provider";

const CADENCE_OPTIONS: Cadence[] = ["DAILY", "WEEKLY", "MONTHLY"];

type DrawerTab = "goal" | "role" | "settings";

interface DashboardMetricDrawerProps {
  dashboardChart: DashboardChartWithRelations;
  status: PipelineStatus;
  isDeleting: boolean;
  onRefresh: (forceRebuild?: boolean) => void;
  onUpdateMetric: (name: string, description: string) => void;
  onDelete: () => void;
  onClose: () => void;
  onRegenerateChart: (
    chartType: string,
    cadence: Cadence,
    selectedDimension?: string,
  ) => void;
}

// =============================================================================
// Tab Buttons Component
// =============================================================================

interface DrawerTabButtonsProps {
  activeTab: DrawerTab;
  onTabChange: (tab: DrawerTab) => void;
}

function DrawerTabButtons({ activeTab, onTabChange }: DrawerTabButtonsProps) {
  const tabs: { id: DrawerTab; label: string; icon: typeof Target }[] = [
    { id: "goal", label: "Goal", icon: Target },
    { id: "role", label: "Role", icon: Users },
    { id: "settings", label: "Settings", icon: Settings },
  ];

  return (
    <div className="flex h-full flex-col">
      {tabs.map((tab) => (
        <button
          key={tab.id}
          onClick={() => onTabChange(tab.id)}
          className={cn(
            "flex flex-1 flex-col items-center justify-center gap-1.5",
            "border-b transition-all duration-200 last:border-b-0",
            activeTab === tab.id
              ? "bg-primary/10 text-primary border-l-primary border-l-2"
              : "text-muted-foreground hover:bg-muted/50 hover:text-foreground",
          )}
        >
          <tab.icon className="h-5 w-5" />
          <span className="text-[10px] font-medium tracking-wide uppercase">
            {tab.label}
          </span>
        </button>
      ))}
    </div>
  );
}

// =============================================================================
// Chart Stats Bar Component
// =============================================================================

interface ChartStatsBarProps {
  currentValue: { value: number; label?: string; date?: string } | null;
  valueLabel: string | null;
  goalProgress: GoalProgress | null;
}

function ChartStatsBar({
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

// =============================================================================
// Goal Tab Content Component
// =============================================================================

interface GoalTabContentProps {
  metricId: string;
  goal: MetricGoal | null;
  goalProgress: GoalProgress | null;
  currentValue: { value: number; label?: string; date?: string } | null;
  valueLabel: string | null;
  cadence: Cadence | null | undefined;
}

function GoalTabContent({
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

// =============================================================================
// Role Tab Content Component
// =============================================================================

interface RoleTabContentProps {
  metricId: string;
  metricName: string;
  teamId: string | null;
  roles: Array<{
    id: string;
    title: string;
    color: string;
    assignedUserId: string | null;
    assignedUserName: string | null;
  }>;
}

function RoleTabContent({
  metricId,
  metricName,
  teamId,
  roles,
}: RoleTabContentProps) {
  if (!teamId) {
    return (
      <div className="flex h-full flex-col items-center justify-center p-4">
        <Users className="text-muted-foreground mb-2 h-8 w-8" />
        <p className="text-muted-foreground text-center text-sm">
          This metric is not linked to a team
        </p>
      </div>
    );
  }

  return (
    <div className="flex h-full flex-col p-4">
      <h3 className="mb-4 text-sm font-semibold">Assigned Roles</h3>

      {/* Existing role labels */}
      {roles.length > 0 ? (
        <div className="mb-4 flex flex-wrap gap-2">
          {roles.map((role) => (
            <Badge
              key={role.id}
              variant="outline"
              className="flex items-center gap-1.5 py-1"
              style={{ borderColor: role.color }}
            >
              <div
                className="h-2 w-2 rounded-full"
                style={{ backgroundColor: role.color }}
              />
              <span>{role.title}</span>
              {role.assignedUserName && (
                <span className="text-muted-foreground text-[10px]">
                  {role.assignedUserName}
                </span>
              )}
            </Badge>
          ))}
        </div>
      ) : (
        <div className="text-muted-foreground mb-4 rounded-lg border border-dashed p-4 text-center text-sm">
          No roles assigned yet
        </div>
      )}

      {/* Assign Role dropdown */}
      <div className="space-y-2">
        <Label className="text-xs">Assign Role</Label>
        <RoleAssignment
          metricId={metricId}
          metricName={metricName}
          teamId={teamId}
          assignedRoleIds={roles.map((r) => r.id)}
        />
      </div>
    </div>
  );
}

// =============================================================================
// Settings Tab Content Component
// =============================================================================

interface SettingsTabContentProps {
  metricName: string;
  metricDescription: string | null;
  selectedChartType: string;
  setSelectedChartType: (v: string) => void;
  selectedCadence: Cadence;
  setSelectedCadence: (v: Cadence) => void;
  selectedDimension: string;
  setSelectedDimension: (v: string) => void;
  availableDimensions: string[] | undefined;
  isDimensionsLoading: boolean;
  isIntegrationMetric: boolean;
  valueLabel: string | null;
  hasChartChanges: boolean;
  isProcessing: boolean;
  isDeleting: boolean;
  lastFetchedAt: Date | null;
  onApplyChanges: () => void;
  onRefresh: (forceRebuild?: boolean) => void;
  onDelete: () => void;
  onUpdateMetric: (name: string, description: string) => void;
}

function SettingsTabContent({
  metricName,
  metricDescription,
  selectedChartType,
  setSelectedChartType,
  selectedCadence,
  setSelectedCadence,
  selectedDimension,
  setSelectedDimension,
  availableDimensions,
  isDimensionsLoading,
  isIntegrationMetric,
  valueLabel,
  hasChartChanges,
  isProcessing,
  isDeleting,
  lastFetchedAt,
  onApplyChanges,
  onRefresh,
  onDelete,
  onUpdateMetric,
}: SettingsTabContentProps) {
  const [name, setName] = useState(metricName);
  const [hasNameChanges, setHasNameChanges] = useState(false);

  useEffect(() => {
    if (!hasNameChanges) {
      setName(metricName);
    }
  }, [metricName, hasNameChanges]);

  const handleNameChange = (value: string) => {
    setHasNameChanges(true);
    setName(value);
  };

  const handleSaveName = () => {
    if (name.trim() && name !== metricName) {
      onUpdateMetric(name.trim(), metricDescription ?? "");
    }
    setHasNameChanges(false);
  };

  return (
    <div className="flex h-full flex-col overflow-y-auto p-4">
      <h3 className="mb-4 text-sm font-semibold">Settings</h3>

      <div className="space-y-5">
        {/* Metric Name */}
        <div className="space-y-2">
          <Label className="text-xs">Metric Name</Label>
          <div className="flex gap-2">
            <Input
              value={name}
              onChange={(e) => handleNameChange(e.target.value)}
              className="h-8 text-sm"
            />
            <Button
              size="icon"
              variant="outline"
              className="h-8 w-8 shrink-0"
              onClick={handleSaveName}
              disabled={!hasNameChanges || !name.trim() || name === metricName}
            >
              <Check className="h-3 w-3" />
            </Button>
          </div>
        </div>

        {/* Chart Type */}
        <div className="space-y-2">
          <Label className="text-xs">Chart Type</Label>
          <ToggleGroup
            type="single"
            value={selectedChartType}
            onValueChange={(v) => v && setSelectedChartType(v)}
            className="grid w-full grid-cols-2"
          >
            <ToggleGroupItem
              value="bar"
              aria-label="Bar Chart"
              className="data-[state=on]:bg-primary data-[state=on]:text-primary-foreground"
            >
              <BarChart3 className="mr-1 h-4 w-4" />
              Bar
            </ToggleGroupItem>
            <ToggleGroupItem
              value="line"
              aria-label="Line Chart"
              className="data-[state=on]:bg-primary data-[state=on]:text-primary-foreground"
            >
              <TrendingUp className="mr-1 h-4 w-4" />
              Line
            </ToggleGroupItem>
          </ToggleGroup>
        </div>

        {/* Cadence */}
        <div className="space-y-2">
          <Label className="text-xs">Cadence</Label>
          <ToggleGroup
            type="single"
            value={selectedCadence}
            onValueChange={(v) => v && setSelectedCadence(v as Cadence)}
            className="grid w-full grid-cols-3"
          >
            {CADENCE_OPTIONS.map((c) => (
              <ToggleGroupItem
                key={c}
                value={c}
                className="data-[state=on]:bg-primary data-[state=on]:text-primary-foreground text-xs"
              >
                {c.charAt(0) + c.slice(1).toLowerCase()}
              </ToggleGroupItem>
            ))}
          </ToggleGroup>
        </div>

        {/* Dimensions */}
        {isIntegrationMetric && (
          <div className="space-y-2">
            <Label className="text-xs">Dimension</Label>
            {isDimensionsLoading ? (
              <div className="flex h-8 items-center justify-center rounded-md border">
                <Loader2 className="text-muted-foreground h-4 w-4 animate-spin" />
              </div>
            ) : availableDimensions && availableDimensions.length > 0 ? (
              <Select
                value={selectedDimension}
                onValueChange={setSelectedDimension}
              >
                <SelectTrigger className="h-8 text-sm">
                  <SelectValue placeholder="Select dimension" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="value">
                    {valueLabel ?? "Primary Value"}
                  </SelectItem>
                  {availableDimensions.map((dim) => (
                    <SelectItem key={dim} value={dim}>
                      {getDimensionDisplayLabel(dim)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            ) : (
              <div className="text-muted-foreground h-8 rounded-md border px-3 py-1.5 text-sm">
                No dimensions available
              </div>
            )}
          </div>
        )}

        {/* Apply Changes */}
        <Button
          size="sm"
          onClick={onApplyChanges}
          disabled={isProcessing || !hasChartChanges}
          className="w-full"
        >
          {isProcessing ? (
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          ) : (
            <BarChart3 className="mr-2 h-4 w-4" />
          )}
          Apply Changes
        </Button>

        {/* Refresh Controls */}
        <div className="space-y-2">
          <Label className="text-xs">Data Refresh</Label>
          <div className="grid grid-cols-2 gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => onRefresh(false)}
              disabled={isProcessing}
            >
              <RefreshCw
                className={cn("mr-1 h-3 w-3", isProcessing && "animate-spin")}
              />
              Refresh
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => onRefresh(true)}
              disabled={isProcessing}
            >
              <RefreshCw
                className={cn("mr-1 h-3 w-3", isProcessing && "animate-spin")}
              />
              Hard
            </Button>
          </div>
          {lastFetchedAt && (
            <div className="text-muted-foreground text-[10px]">
              Last fetched{" "}
              {formatDistanceToNow(new Date(lastFetchedAt), {
                addSuffix: true,
              })}
            </div>
          )}
        </div>

        {/* Delete Metric */}
        <div className="border-t pt-4">
          <Button
            variant="destructive"
            size="sm"
            onClick={onDelete}
            disabled={isDeleting}
            className="w-full"
          >
            {isDeleting ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <Trash2 className="mr-2 h-4 w-4" />
            )}
            Delete Metric
          </Button>
        </div>
      </div>
    </div>
  );
}

// =============================================================================
// Main Drawer Component
// =============================================================================

export function DashboardMetricDrawer({
  dashboardChart,
  status,
  isDeleting,
  onRefresh,
  onUpdateMetric,
  onDelete,
  onClose,
  onRegenerateChart,
}: DashboardMetricDrawerProps) {
  const metric = dashboardChart.metric;
  const metricId = metric.id;
  const chartTransform = dashboardChart.chartConfig as
    | ChartTransformResult
    | null
    | undefined;
  const chartTransformer = dashboardChart.chartTransformer;
  const goalProgress = dashboardChart.goalProgress ?? null;

  // Tab state
  const [activeTab, setActiveTab] = useState<DrawerTab>("goal");

  // Chart settings state
  const [selectedChartType, setSelectedChartType] = useState(
    chartTransformer?.chartType ?? "bar",
  );
  const [selectedCadence, setSelectedCadence] = useState<Cadence>(
    chartTransformer?.cadence ?? "WEEKLY",
  );
  const [selectedDimension, setSelectedDimension] = useState<string>(
    chartTransformer?.selectedDimension ?? "value",
  );

  // Query for available dimensions
  const isIntegrationMetric = !!metric.integration?.providerId;
  const { data: availableDimensions, isLoading: isDimensionsLoading } =
    api.pipeline.getAvailableDimensions.useQuery(
      { metricId },
      { enabled: isIntegrationMetric },
    );

  // Sync form state when props change
  useEffect(() => {
    if (!status.isProcessing) {
      setSelectedChartType(chartTransformer?.chartType ?? "bar");
      setSelectedCadence(chartTransformer?.cadence ?? "WEEKLY");
      setSelectedDimension(chartTransformer?.selectedDimension ?? "value");
    }
  }, [chartTransformer, status.isProcessing]);

  // Derived state
  const hasChartChanges =
    selectedChartType !== (chartTransformer?.chartType ?? "bar") ||
    selectedCadence !== (chartTransformer?.cadence ?? "WEEKLY") ||
    selectedDimension !== (chartTransformer?.selectedDimension ?? "value");

  const hasChartData = !!(
    chartTransform?.chartData && chartTransform.chartData.length > 0
  );
  const currentValue = getLatestMetricValue(chartTransform ?? null);
  const platformConfig = metric.integration?.providerId
    ? getPlatformConfig(metric.integration.providerId)
    : null;

  const handleApplyChanges = () => {
    onRegenerateChart(
      selectedChartType,
      selectedCadence,
      selectedDimension !== "value" ? selectedDimension : undefined,
    );
  };

  const handleDelete = () => {
    onDelete();
    onClose();
  };

  return (
    <div className="grid h-full grid-cols-[1fr_280px_80px]">
      {/* Chart Column (70%) */}
      <div className="flex flex-col border-r">
        {/* Header */}
        <div className="flex items-center justify-between border-b px-6 py-3">
          <div className="flex items-center gap-3">
            <h2 className="text-lg font-semibold">{metric.name}</h2>
            {platformConfig && (
              <Badge
                variant="secondary"
                className={cn(platformConfig.bgColor, platformConfig.textColor)}
              >
                {platformConfig.name}
              </Badge>
            )}
            {status.error && (
              <Badge variant="destructive" className="text-xs">
                Error
              </Badge>
            )}
            {status.isProcessing && (
              <Badge variant="outline" className="text-xs">
                <Loader2 className="mr-1 h-3 w-3 animate-spin" />
                Processing
              </Badge>
            )}
          </div>
          <div className="flex items-center gap-2">
            {!isIntegrationMetric && (
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button variant="default" size="sm" asChild>
                    <Link href={`/metric/check-in/${metricId}`}>
                      <ClipboardCheck className="mr-1 h-4 w-4" />
                      Check-in
                    </Link>
                  </Button>
                </TooltipTrigger>
                <TooltipContent side="bottom">
                  <p className="text-xs">Add a new data point</p>
                </TooltipContent>
              </Tooltip>
            )}
            <DrawerClose asChild>
              <Button variant="ghost" size="icon" className="h-8 w-8">
                <X className="h-4 w-4" />
              </Button>
            </DrawerClose>
          </div>
        </div>

        {/* Stats Bar */}
        <ChartStatsBar
          currentValue={currentValue}
          valueLabel={dashboardChart.valueLabel ?? null}
          goalProgress={goalProgress}
        />

        {/* Chart */}
        <div className="flex-1 overflow-hidden p-4">
          <DashboardMetricChart
            title={chartTransform?.title ?? metric.name}
            chartTransform={chartTransform ?? null}
            hasChartData={hasChartData}
            isIntegrationMetric={isIntegrationMetric}
            integrationId={metric.integration?.providerId}
            roles={metric.roles ?? []}
            goal={metric.goal}
            goalProgress={goalProgress}
            valueLabel={dashboardChart.valueLabel ?? null}
            isProcessing={status.isProcessing}
            processingStep={status.step}
          />
        </div>
      </div>

      {/* Tab Content Column (20%) */}
      <div className="relative overflow-hidden border-r">
        {/* Goal Tab */}
        <div
          className={cn(
            "absolute inset-0 transition-opacity duration-200",
            activeTab === "goal"
              ? "opacity-100"
              : "pointer-events-none opacity-0",
          )}
        >
          <GoalTabContent
            metricId={metricId}
            goal={metric.goal}
            goalProgress={goalProgress}
            currentValue={currentValue}
            valueLabel={dashboardChart.valueLabel ?? null}
            cadence={chartTransformer?.cadence}
          />
        </div>

        {/* Role Tab */}
        <div
          className={cn(
            "absolute inset-0 transition-opacity duration-200",
            activeTab === "role"
              ? "opacity-100"
              : "pointer-events-none opacity-0",
          )}
        >
          <RoleTabContent
            metricId={metricId}
            metricName={metric.name}
            teamId={metric.teamId}
            roles={(metric.roles ?? []).map((r) => ({
              id: r.id,
              title: r.title,
              color: r.color,
              assignedUserId: r.assignedUserId,
              assignedUserName: r.assignedUserName,
            }))}
          />
        </div>

        {/* Settings Tab */}
        <div
          className={cn(
            "absolute inset-0 transition-opacity duration-200",
            activeTab === "settings"
              ? "opacity-100"
              : "pointer-events-none opacity-0",
          )}
        >
          <SettingsTabContent
            metricName={metric.name}
            metricDescription={metric.description}
            selectedChartType={selectedChartType}
            setSelectedChartType={setSelectedChartType}
            selectedCadence={selectedCadence}
            setSelectedCadence={setSelectedCadence}
            selectedDimension={selectedDimension}
            setSelectedDimension={setSelectedDimension}
            availableDimensions={availableDimensions}
            isDimensionsLoading={isDimensionsLoading}
            isIntegrationMetric={isIntegrationMetric}
            valueLabel={dashboardChart.valueLabel ?? null}
            hasChartChanges={hasChartChanges}
            isProcessing={status.isProcessing}
            isDeleting={isDeleting}
            lastFetchedAt={metric.lastFetchedAt}
            onApplyChanges={handleApplyChanges}
            onRefresh={onRefresh}
            onDelete={handleDelete}
            onUpdateMetric={onUpdateMetric}
          />
        </div>
      </div>

      {/* Tab Buttons Column (10%) */}
      <DrawerTabButtons activeTab={activeTab} onTabChange={setActiveTab} />
    </div>
  );
}
