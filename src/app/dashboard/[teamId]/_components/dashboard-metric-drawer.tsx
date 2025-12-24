"use client";

import { useEffect, useRef, useState } from "react";

import type { Cadence } from "@prisma/client";
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
import { getDimensionDisplayLabel } from "@/lib/metrics/dimension-labels";
import { getLatestMetricValue } from "@/lib/metrics/get-latest-value";
import type { ChartTransformResult } from "@/lib/metrics/transformer-types";
import { getPlatformConfig } from "@/lib/platform-config";
import { cn } from "@/lib/utils";
import { api } from "@/trpc/react";

import { DashboardMetricChart } from "./dashboard-metric-chart";

const CADENCE_OPTIONS: Cadence[] = ["DAILY", "WEEKLY", "MONTHLY"];

interface DashboardMetricDrawerProps {
  /** Metric ID - used to fetch live data from cache */
  metricId: string;
  /** Team ID - required for cache query */
  teamId: string;
  /** Whether delete mutation is pending */
  isDeleting: boolean;
  /** Callback to refresh/regenerate metric data */
  onRefresh: (forceRebuild?: boolean) => void;
  /** Callback to update metric name/description */
  onUpdateMetric: (name: string, description: string) => void;
  /** Callback to delete the metric */
  onDelete: () => void;
  /** Callback to close the drawer */
  onClose: () => void;
  /** Callback to regenerate chart with new settings */
  onRegenerateChart: (
    chartType: string,
    cadence: Cadence,
    selectedDimension?: string,
  ) => void;
}

/**
 * Drawer for viewing and editing metric settings.
 *
 * Uses usePipelineStatus hook for unified status tracking.
 * Form state is initialized from cache and synced when data changes.
 */
export function DashboardMetricDrawer({
  metricId,
  teamId,
  isDeleting,
  onRefresh,
  onUpdateMetric,
  onDelete,
  onClose,
  onRegenerateChart,
}: DashboardMetricDrawerProps) {
  // Unified status tracking
  const { dashboardChart, status, isFetching } = usePipelineStatus(
    metricId,
    teamId,
  );

  const metric = dashboardChart?.metric;
  const chartTransform = dashboardChart?.chartConfig as
    | ChartTransformResult
    | null
    | undefined;
  const chartTransformer = dashboardChart?.chartTransformer;
  const goalProgress = dashboardChart?.goalProgress ?? null;

  // Track if user is actively editing (to prevent overwriting their changes)
  const isEditingRef = useRef(false);

  // Local form state - initialized from cache data
  const [name, setName] = useState("");
  const [selectedChartType, setSelectedChartType] = useState("bar");
  const [selectedCadence, setSelectedCadence] = useState<Cadence>("WEEKLY");
  const [selectedDimension, setSelectedDimension] = useState<string>("value");
  const [forceRebuild, setForceRebuild] = useState(false);

  // Query for available dimensions
  const isIntegrationMetric = !!metric?.integration?.providerId;
  const { data: availableDimensions, isLoading: isDimensionsLoading } =
    api.pipeline.getAvailableDimensions.useQuery(
      { metricId },
      { enabled: isIntegrationMetric },
    );

  // Sync form state when cache data changes (only if not actively editing)
  useEffect(() => {
    if (!metric || !dashboardChart || isEditingRef.current) return;

    setName(metric.name);
    setSelectedChartType(chartTransformer?.chartType ?? "bar");
    setSelectedCadence(chartTransformer?.cadence ?? "WEEKLY");
    setSelectedDimension(chartTransformer?.selectedDimension ?? "value");
  }, [metric, dashboardChart, chartTransformer]);

  // Derived state - compare current form values to cache
  const hasNameChanges = name !== (metric?.name ?? "");
  const hasChartChanges =
    selectedChartType !== (chartTransformer?.chartType ?? "bar") ||
    selectedCadence !== (chartTransformer?.cadence ?? "WEEKLY") ||
    selectedDimension !== (chartTransformer?.selectedDimension ?? "value");

  const hasChartData = !!(
    chartTransform?.chartData && chartTransform.chartData.length > 0
  );
  const currentValue = getLatestMetricValue(chartTransform ?? null);
  const platformConfig = metric?.integration?.providerId
    ? getPlatformConfig(metric.integration.providerId)
    : null;

  // ==========================================================================
  // Handlers
  // ==========================================================================

  const handleNameChange = (value: string) => {
    isEditingRef.current = true;
    setName(value);
  };

  const handleNameBlur = () => {
    // Reset editing flag after a short delay to allow save to complete
    setTimeout(() => {
      isEditingRef.current = false;
    }, 100);
  };

  const handleSave = () => {
    if (hasNameChanges && name.trim()) {
      onUpdateMetric(name.trim(), metric?.description ?? "");
    }
  };

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

  // ==========================================================================
  // Render
  // ==========================================================================

  if (!dashboardChart || !metric) {
    return (
      <div className="flex h-full items-center justify-center">
        <Loader2 className="text-muted-foreground h-8 w-8 animate-spin" />
      </div>
    );
  }

  return (
    <div className="flex h-full flex-col">
      {/* Header */}
      <div className="flex items-center justify-between border-b px-8 py-4">
        <div className="flex items-center gap-3">
          <h2 className="text-xl font-semibold">{metric.name}</h2>
          {platformConfig && (
            <Badge
              variant="secondary"
              className={cn(platformConfig.bgColor, platformConfig.textColor)}
            >
              {platformConfig.name}
            </Badge>
          )}
          {status.hasError && (
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
        <div className="flex items-center gap-3">
          {isIntegrationMetric ? (
            <>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => onRefresh(forceRebuild)}
                disabled={status.isProcessing}
              >
                <RefreshCw
                  className={cn(
                    "mr-2 h-4 w-4",
                    status.isProcessing && "animate-spin",
                  )}
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
                      disabled={status.isProcessing}
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
                disabled={status.isProcessing}
              >
                <RefreshCw
                  className={cn(
                    "mr-2 h-4 w-4",
                    status.isProcessing && "animate-spin",
                  )}
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

      {/* Content */}
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
                        {dashboardChart.valueLabel ?? "Primary Value"}
                      </SelectItem>
                      {availableDimensions.map((dim) => (
                        <SelectItem key={dim} value={dim}>
                          {getDimensionDisplayLabel(dim)}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                ) : null)}
              {metric.lastFetchedAt && (
                <span className="text-muted-foreground ml-auto flex items-center gap-1.5 text-xs">
                  <Clock className="h-3 w-3" />
                  {formatDistanceToNow(new Date(metric.lastFetchedAt), {
                    addSuffix: true,
                  })}
                </span>
              )}
            </div>
            <Button
              size="sm"
              onClick={handleApplyChanges}
              disabled={status.isProcessing || !hasChartChanges}
              className="w-full"
            >
              {status.isProcessing ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <BarChart3 className="mr-2 h-4 w-4" />
              )}
              Apply Changes
            </Button>
          </div>

          {/* Chart Preview */}
          <div className="h-[400px]">
            <DashboardMetricChart
              title={chartTransform?.title ?? metric.name}
              chartTransform={chartTransform ?? null}
              hasChartData={hasChartData}
              isIntegrationMetric={isIntegrationMetric}
              isOptimistic={status.isOptimistic}
              integrationId={metric.integration?.providerId}
              roles={metric.roles ?? []}
              goal={metric.goal}
              goalProgress={goalProgress}
              valueLabel={dashboardChart.valueLabel ?? null}
              isProcessing={status.isProcessing}
              processingStep={status.processingStep}
              isFetching={isFetching}
            />
          </div>

          {/* Goal Progress */}
          <GoalProgressDisplay
            currentValue={currentValue}
            valueLabel={dashboardChart.valueLabel ?? null}
            goal={metric.goal}
            goalProgress={goalProgress}
            isLoading={status.isProcessing}
            lastFetchedAt={metric.lastFetchedAt}
            chartUpdatedAt={chartTransformer?.updatedAt ?? null}
          />

          {/* Settings */}
          <div className="border-t pt-6">
            <div className="grid gap-8 md:grid-cols-2">
              <div className="space-y-6">
                <div className="space-y-2">
                  <Label className="text-sm font-medium">Metric Name</Label>
                  <div className="flex gap-2">
                    <Input
                      value={name}
                      onChange={(e) => handleNameChange(e.target.value)}
                      onBlur={handleNameBlur}
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

              {metric.teamId && (
                <div className="space-y-6">
                  <div className="space-y-2">
                    <Label className="text-sm font-medium">Goal</Label>
                    <GoalEditor
                      metricId={metricId}
                      initialGoal={metric.goal}
                      cadence={chartTransformer?.cadence}
                      compact={true}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label className="text-sm font-medium">
                      Assigned to Role
                    </Label>
                    <RoleAssignment
                      metricId={metricId}
                      metricName={metric.name}
                      teamId={metric.teamId}
                      assignedRoleIds={(metric.roles ?? []).map((r) => r.id)}
                    />
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Footer */}
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
