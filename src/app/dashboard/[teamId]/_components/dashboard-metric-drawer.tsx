"use client";

import { useEffect, useState } from "react";

import type { Cadence, MetricGoal, Role } from "@prisma/client";
import { formatDistanceToNow } from "date-fns";
import {
  BarChart3,
  Check,
  ClipboardCheck,
  Clock,
  Loader2,
  RefreshCw,
  Trash2,
  TrendingUp,
  X,
} from "lucide-react";
import { Link } from "next-transition-router";

import { GoalEditor } from "@/components/metric/goal-editor";
import { GoalProgressDisplay } from "@/components/metric/goal-progress-display";
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
import { Switch } from "@/components/ui/switch";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { usePipelineStatus } from "@/hooks/use-pipeline-status";
import type { GoalProgress } from "@/lib/goals";
import { getDimensionDisplayLabel } from "@/lib/metrics/dimension-labels";
import { getLatestMetricValue } from "@/lib/metrics/get-latest-value";
import { getPlatformConfig } from "@/lib/platform-config";
import { cn } from "@/lib/utils";
import { api } from "@/trpc/react";

import type { ChartTransformResult } from "./dashboard-metric-card";
import { DashboardMetricChart } from "./dashboard-metric-chart";

const CADENCE_OPTIONS: Cadence[] = ["DAILY", "WEEKLY", "MONTHLY"];

interface DashboardMetricDrawerProps {
  metricId: string;
  metricName: string;
  metricDescription: string | null;
  teamId: string | null;
  chartTransform: ChartTransformResult | null;
  currentChartType: string | null;
  currentCadence: Cadence | null;
  currentSelectedDimension: string | null;
  roles: Role[];
  valueLabel: string | null;
  integrationId: string | null;
  isIntegrationMetric: boolean;
  lastFetchedAt: Date | null;
  chartUpdatedAt: Date | null;
  lastError: string | null;
  goal: MetricGoal | null;
  goalProgress: GoalProgress | null;
  isUpdating: boolean;
  isDeleting: boolean;
  onRegenerate: () => void;
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

export function DashboardMetricDrawer({
  metricId,
  metricName,
  metricDescription,
  teamId,
  chartTransform,
  currentChartType,
  currentCadence,
  currentSelectedDimension,
  roles,
  valueLabel,
  integrationId,
  isIntegrationMetric,
  lastFetchedAt,
  chartUpdatedAt,
  lastError,
  goal,
  goalProgress,
  isUpdating: _isUpdating,
  isDeleting,
  onRegenerate: _onRegenerate,
  onRefresh,
  onUpdateMetric,
  onDelete,
  onClose: _onClose,
  onRegenerateChart,
}: DashboardMetricDrawerProps) {
  // Get pipeline status from query cache for independent tracking
  const { isProcessing } = usePipelineStatus(metricId, teamId ?? undefined);

  const [name, setName] = useState(metricName);
  const [selectedChartType, setSelectedChartType] = useState(
    currentChartType ?? "bar",
  );
  const [selectedCadence, setSelectedCadence] = useState<Cadence>(
    currentCadence ?? "WEEKLY",
  );
  const [selectedDimension, setSelectedDimension] = useState<string>(
    currentSelectedDimension ?? "value",
  );
  const [forceRebuild, setForceRebuild] = useState(false);

  // Query for available dimensions from data points
  const { data: availableDimensions, isLoading: isDimensionsLoading } =
    api.pipeline.getAvailableDimensions.useQuery(
      { metricId },
      { enabled: isIntegrationMetric },
    );

  useEffect(() => {
    setName(metricName);
  }, [metricName]);

  useEffect(() => {
    if (currentChartType) setSelectedChartType(currentChartType);
  }, [currentChartType]);

  useEffect(() => {
    if (currentCadence) setSelectedCadence(currentCadence);
  }, [currentCadence]);

  useEffect(() => {
    setSelectedDimension(currentSelectedDimension ?? "value");
  }, [currentSelectedDimension]);

  const hasNameChanges = name !== metricName;

  // Check if chart config has changed (type, cadence, or dimension)
  const hasChartChanges =
    selectedChartType !== (currentChartType ?? "bar") ||
    selectedCadence !== (currentCadence ?? "WEEKLY") ||
    selectedDimension !== (currentSelectedDimension ?? "value");

  const handleSave = () => {
    if (hasNameChanges && name.trim()) {
      onUpdateMetric(name.trim(), metricDescription ?? "");
    }
  };

  // Apply changes only regenerates chart transformer with current data
  const handleApplyChanges = () => {
    onRegenerateChart(
      selectedChartType,
      selectedCadence,
      selectedDimension !== "value" ? selectedDimension : undefined,
    );
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
          {isIntegrationMetric ? (
            <>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => onRefresh(forceRebuild)}
                disabled={isProcessing}
              >
                <RefreshCw
                  className={cn("mr-2 h-4 w-4", isProcessing && "animate-spin")}
                />
                {forceRebuild ? "Hard Refresh" : "Refresh"}
              </Button>
              <Tooltip>
                <TooltipTrigger asChild>
                  <div className="flex items-center gap-2">
                    <Switch
                      id="force-rebuild"
                      checked={forceRebuild}
                      onCheckedChange={setForceRebuild}
                      disabled={isProcessing}
                    />
                    <Label
                      htmlFor="force-rebuild"
                      className="text-muted-foreground cursor-pointer text-xs"
                    >
                      Hard
                    </Label>
                  </div>
                </TooltipTrigger>
                <TooltipContent side="bottom">
                  <p className="text-xs">
                    Hard refresh: Regenerates entire data pipeline (data +
                    chart)
                  </p>
                </TooltipContent>
              </Tooltip>
            </>
          ) : (
            <>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => onRefresh(true)}
                disabled={isProcessing}
              >
                <RefreshCw
                  className={cn("mr-2 h-4 w-4", isProcessing && "animate-spin")}
                />
                Regenerate
              </Button>
              <Button variant="default" size="sm" asChild>
                <Link href={`/metric/check-in/${metricId}`}>
                  <ClipboardCheck className="mr-2 h-4 w-4" />
                  Check-in
                </Link>
              </Button>
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
          {/* Chart Configuration */}
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
              {isIntegrationMetric &&
                (isDimensionsLoading ? (
                  <div className="flex h-8 w-[140px] items-center justify-center rounded-md border">
                    <Loader2 className="text-muted-foreground h-4 w-4 animate-spin" />
                  </div>
                ) : availableDimensions && availableDimensions.length > 0 ? (
                  <Select
                    value={selectedDimension}
                    onValueChange={setSelectedDimension}
                  >
                    <SelectTrigger className="h-8 w-[140px]">
                      <SelectValue placeholder="Track" />
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
                ) : null)}
              {lastFetchedAt && (
                <span className="text-muted-foreground ml-auto flex items-center gap-1.5 text-xs">
                  <Clock className="h-3 w-3" />
                  {formatDistanceToNow(new Date(lastFetchedAt), {
                    addSuffix: true,
                  })}
                </span>
              )}
            </div>
            <Button
              size="sm"
              onClick={handleApplyChanges}
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
          </div>

          <div className="h-[400px]">
            <DashboardMetricChart
              title={chartTransform?.title ?? metricName}
              chartTransform={chartTransform}
              hasChartData={hasChartData}
              isIntegrationMetric={isIntegrationMetric}
              isPending={false}
              integrationId={integrationId}
              roles={roles}
              goal={goal}
              goalProgress={goalProgress}
              valueLabel={valueLabel}
              isProcessing={isProcessing}
            />
          </div>

          <GoalProgressDisplay
            currentValue={currentValue}
            valueLabel={valueLabel}
            goal={goal}
            goalProgress={goalProgress}
            isLoading={isProcessing}
            lastFetchedAt={lastFetchedAt}
            chartUpdatedAt={chartUpdatedAt}
          />

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
