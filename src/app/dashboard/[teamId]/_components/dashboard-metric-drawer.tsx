"use client";

import { useEffect, useState } from "react";

import type { Cadence, MetricGoal, Role } from "@prisma/client";
import { formatDistanceToNow } from "date-fns";
import {
  BarChart3,
  Check,
  Clock,
  Loader2,
  RefreshCw,
  Sparkles,
  Trash2,
  TrendingUp,
  X,
} from "lucide-react";

import { GoalEditor } from "@/components/metric/goal-editor";
import { RoleAssignment } from "@/components/metric/role-assignment";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { DrawerClose } from "@/components/ui/drawer";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { formatValue } from "@/lib/helpers/format-value";
import { getLatestMetricValue } from "@/lib/metrics/get-latest-value";
import { getPlatformConfig } from "@/lib/platform-config";
import { cn } from "@/lib/utils";
import type { GoalProgress } from "@/server/api/utils/goal-calculation";
import { calculateGoalTargetValue } from "@/server/api/utils/goal-calculation";

import type { ChartTransformResult } from "./dashboard-metric-card";
import {
  DashboardMetricChart,
  type LoadingPhase,
} from "./dashboard-metric-chart";

const CADENCE_OPTIONS: Cadence[] = ["DAILY", "WEEKLY", "MONTHLY"];

interface DashboardMetricDrawerProps {
  metricId: string;
  metricName: string;
  metricDescription: string | null;
  teamId: string | null;
  chartTransform: ChartTransformResult | null;
  currentChartType: string | null;
  currentCadence: Cadence | null;
  roles: Role[];
  valueLabel: string | null;
  dataDescription: string | null;
  integrationId: string | null;
  isIntegrationMetric: boolean;
  lastFetchedAt: Date | null;
  lastError: string | null;
  pollFrequency: string;
  goal: MetricGoal | null;
  goalProgress: GoalProgress | null;
  isProcessing: boolean;
  isUpdating: boolean;
  isDeleting: boolean;
  isRegeneratingPipeline: boolean;
  loadingPhase: LoadingPhase;
  onRegenerate: (
    chartType?: string,
    cadence?: Cadence,
    prompt?: string,
  ) => void;
  onRefresh: (forceRebuild?: boolean) => void;
  onUpdateMetric: (name: string, description: string) => void;
  onDelete: () => void;
  onClose: () => void;
}

export function DashboardMetricDrawer({
  metricId,
  metricName,
  metricDescription,
  teamId,
  chartTransform,
  currentChartType,
  currentCadence,
  roles,
  valueLabel,
  dataDescription: _dataDescription,
  integrationId,
  isIntegrationMetric,
  lastFetchedAt,
  lastError,
  pollFrequency: _pollFrequency,
  goal,
  goalProgress,
  isProcessing,
  isUpdating: _isUpdating,
  isDeleting,
  isRegeneratingPipeline,
  loadingPhase,
  onRegenerate,
  onRefresh,
  onUpdateMetric,
  onDelete,
  onClose: _onClose,
}: DashboardMetricDrawerProps) {
  const [name, setName] = useState(metricName);
  const [selectedChartType, setSelectedChartType] = useState(
    currentChartType ?? "bar",
  );
  const [selectedCadence, setSelectedCadence] = useState<Cadence>(
    currentCadence ?? "WEEKLY",
  );
  const [prompt, setPrompt] = useState("");
  const [forceRebuild, setForceRebuild] = useState(false);

  useEffect(() => {
    setName(metricName);
  }, [metricName]);

  useEffect(() => {
    if (currentChartType) setSelectedChartType(currentChartType);
  }, [currentChartType]);

  useEffect(() => {
    if (currentCadence) setSelectedCadence(currentCadence);
  }, [currentCadence]);

  const hasNameChanges = name !== metricName;

  const hasChartChanges =
    selectedChartType !== (currentChartType ?? "bar") ||
    selectedCadence !== (currentCadence ?? "WEEKLY") ||
    prompt.trim() !== "";

  const handleSave = () => {
    if (hasNameChanges && name.trim()) {
      onUpdateMetric(name.trim(), metricDescription ?? "");
    }
  };

  const handleApplyChanges = () => {
    onRegenerate(selectedChartType, selectedCadence, prompt || undefined);
  };

  const handleDelete = () => {
    onDelete();
    _onClose();
  };

  const platformConfig = integrationId
    ? getPlatformConfig(integrationId)
    : null;

  const hasChartData = !!(
    chartTransform?.chartData && chartTransform.chartData.length > 0
  );

  const currentValue = getLatestMetricValue(chartTransform);
  const goalTargetValue =
    goal && goalProgress ? calculateGoalTargetValue(goal, goalProgress) : null;

  return (
    <div className="flex h-full flex-col">
      <div className="flex items-center justify-between border-b px-8 py-4">
        <div className="flex items-center gap-3">
          <h2 className="text-xl font-semibold">{metricName}</h2>
          {platformConfig && (
            <Badge
              variant="secondary"
              className={cn(platformConfig.bgColor, platformConfig.textColor)}
            >
              {platformConfig.name}
            </Badge>
          )}
          {lastError && (
            <Badge variant="destructive" className="text-xs">
              Error
            </Badge>
          )}
        </div>
        <div className="flex items-center gap-3">
          {isIntegrationMetric && (
            <>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => onRefresh(forceRebuild)}
                disabled={isProcessing || isRegeneratingPipeline}
              >
                <RefreshCw
                  className={cn(
                    "mr-2 h-4 w-4",
                    (isProcessing || isRegeneratingPipeline) && "animate-spin",
                  )}
                />
                {forceRebuild ? "Rebuild" : "Refresh"}
              </Button>
              <Tooltip>
                <TooltipTrigger asChild>
                  <div className="flex items-center gap-2">
                    <Switch
                      id="force-rebuild"
                      checked={forceRebuild}
                      onCheckedChange={setForceRebuild}
                      disabled={isProcessing || isRegeneratingPipeline}
                    />
                    <Label
                      htmlFor="force-rebuild"
                      className="text-muted-foreground cursor-pointer text-xs"
                    >
                      Force
                    </Label>
                  </div>
                </TooltipTrigger>
                <TooltipContent side="bottom">
                  <p className="text-xs">
                    When enabled, regenerates the entire data pipeline
                  </p>
                </TooltipContent>
              </Tooltip>
            </>
          )}
          <DrawerClose asChild>
            <Button variant="ghost" size="icon" className="h-8 w-8">
              <X className="h-4 w-4" />
            </Button>
          </DrawerClose>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto">
        <div className="space-y-6 px-8 py-6">
          {isIntegrationMetric && (
            <div className="bg-muted/30 space-y-4 rounded-lg border p-4">
              <div className="flex flex-wrap items-center gap-4">
                <ToggleGroup
                  type="single"
                  value={selectedChartType}
                  onValueChange={(v) => v && setSelectedChartType(v)}
                  size="sm"
                >
                  <ToggleGroupItem value="bar" aria-label="Bar Chart">
                    <BarChart3 className="h-4 w-4" />
                  </ToggleGroupItem>
                  <ToggleGroupItem value="line" aria-label="Line Chart">
                    <TrendingUp className="h-4 w-4" />
                  </ToggleGroupItem>
                </ToggleGroup>
                <ToggleGroup
                  type="single"
                  value={selectedCadence}
                  onValueChange={(v) => v && setSelectedCadence(v as Cadence)}
                  size="sm"
                >
                  {CADENCE_OPTIONS.map((c) => (
                    <ToggleGroupItem key={c} value={c} className="text-xs">
                      {c.charAt(0) + c.slice(1).toLowerCase()}
                    </ToggleGroupItem>
                  ))}
                </ToggleGroup>
                {lastFetchedAt && (
                  <span className="text-muted-foreground ml-auto flex items-center gap-1.5 text-xs">
                    <Clock className="h-3 w-3" />
                    {formatDistanceToNow(new Date(lastFetchedAt), {
                      addSuffix: true,
                    })}
                  </span>
                )}
              </div>
              <Textarea
                placeholder="AI Customization (optional) - e.g., 'Group by user', 'Show cumulative growth'..."
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                className="min-h-[60px] resize-none"
              />
              <Button
                size="sm"
                onClick={handleApplyChanges}
                disabled={isProcessing || !hasChartChanges}
                className="w-full"
              >
                {isProcessing ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <Sparkles className="mr-2 h-4 w-4" />
                )}
                Apply Changes
              </Button>
            </div>
          )}

          <div className="h-[400px]">
            <DashboardMetricChart
              title={chartTransform?.title ?? metricName}
              chartTransform={chartTransform}
              hasChartData={hasChartData}
              isIntegrationMetric={isIntegrationMetric}
              isPending={false}
              isProcessing={isProcessing || isRegeneratingPipeline}
              loadingPhase={loadingPhase}
              integrationId={integrationId}
              roles={roles}
              goal={goal}
              goalProgress={goalProgress}
              valueLabel={valueLabel}
            />
          </div>

          <div className="grid grid-cols-3 gap-6">
            <div>
              <p className="text-muted-foreground text-xs font-medium tracking-wide uppercase">
                Current
              </p>
              <p className="mt-1 text-2xl font-bold">
                {currentValue ? formatValue(currentValue.value) : "--"}
              </p>
              {valueLabel && (
                <p className="text-muted-foreground text-xs">{valueLabel}</p>
              )}
            </div>
            <div>
              <p className="text-muted-foreground text-xs font-medium tracking-wide uppercase">
                Target
              </p>
              <p className="mt-1 text-2xl font-bold">
                {goalTargetValue !== null ? formatValue(goalTargetValue) : "--"}
              </p>
            </div>
            <div>
              <p className="text-muted-foreground text-xs font-medium tracking-wide uppercase">
                Progress
              </p>
              <p className="mt-1 text-2xl font-bold">
                {goalProgress
                  ? `${Math.round(goalProgress.progressPercent)}%`
                  : "--"}
              </p>
              {goalProgress && (
                <div className="bg-muted mt-2 h-1.5 w-full overflow-hidden rounded-full">
                  <div
                    className={cn(
                      "h-full transition-[width] duration-300 ease-out",
                      goalProgress.progressPercent >= 100
                        ? "bg-green-500"
                        : goalProgress.progressPercent >= 70
                          ? "bg-blue-500"
                          : "bg-amber-500",
                    )}
                    style={{
                      width: `${Math.min(goalProgress.progressPercent, 100)}%`,
                    }}
                  />
                </div>
              )}
            </div>
          </div>

          <div className="border-t pt-6">
            <div className="grid gap-8 md:grid-cols-2">
              <div className="space-y-6">
                <div className="space-y-2">
                  <Label className="text-sm font-medium">Metric Name</Label>
                  <div className="flex gap-2">
                    <Input
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      className="h-9"
                    />
                    <Button
                      size="icon"
                      variant="outline"
                      className="h-9 w-9 shrink-0"
                      onClick={handleSave}
                      disabled={!hasNameChanges || !name.trim()}
                    >
                      <Check className="h-4 w-4" />
                    </Button>
                  </div>
                </div>

                {chartTransform?.dataKeys &&
                  chartTransform.dataKeys.length > 0 && (
                    <div className="space-y-2">
                      <Label className="text-muted-foreground text-sm">
                        Tracked Fields
                      </Label>
                      <div className="flex flex-wrap gap-1.5">
                        {chartTransform.dataKeys.map((key) => (
                          <Badge key={key} variant="secondary">
                            {chartTransform.chartConfig?.[key]?.label ?? key}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  )}
              </div>

              {teamId && (
                <div className="space-y-6">
                  <div className="space-y-2">
                    <Label className="text-sm font-medium">Goal</Label>
                    <GoalEditor
                      metricId={metricId}
                      initialGoal={goal}
                      initialProgress={goalProgress}
                      cadence={currentCadence}
                      compact={true}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label className="text-sm font-medium">
                      Assigned to Role
                    </Label>
                    <RoleAssignment
                      metricId={metricId}
                      metricName={metricName}
                      teamId={teamId}
                      assignedRoleIds={roles.map((r) => r.id)}
                    />
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      <div className="border-t px-8 py-3">
        <Button
          variant="ghost"
          size="sm"
          onClick={handleDelete}
          disabled={isDeleting}
          className="text-destructive hover:text-destructive hover:bg-destructive/10"
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
  );
}
