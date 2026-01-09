"use client";

import { Eye, GripVertical, Loader2, Settings } from "lucide-react";

import { MetricSettingsDialog } from "@/app/dashboard/[teamId]/_components/metric-settings-dialog";
import { type DashboardChart } from "@/app/metric/_components";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import type { GoalProgress } from "@/lib/goals";
import { formatCadence } from "@/lib/helpers/format-cadence";
import type { ChartTransformResult } from "@/lib/metrics/transformer-types";
import { getPlatformConfig } from "@/lib/platform-config";
import { cn } from "@/lib/utils";

/**
 * Format time remaining based on cadence
 * - DAILY or < 1 day: show hours (e.g., "8h left")
 * - WEEKLY/MONTHLY: show days (e.g., "3d left")
 */
function formatTimeRemaining(goalProgress: GoalProgress): string {
  if (goalProgress.cadence === "DAILY" || goalProgress.daysRemaining < 1) {
    const hours = Math.max(0, Math.round(goalProgress.hoursRemaining));
    return `${hours}h left`;
  }
  const days = Math.max(0, Math.round(goalProgress.daysRemaining));
  return `${days}d left`;
}

interface KpiCardProps {
  dashboardChart: DashboardChart;
  teamId: string;

  /** Show settings button (default: true) */
  showSettings?: boolean;

  /** Canvas-specific: enable drag and drop */
  enableDragDrop?: boolean;
  /** Canvas-specific: whether this chart is on the canvas */
  isOnCanvas?: boolean;
  /** Canvas-specific: whether currently dragging */
  isDragging?: boolean;
  /** Canvas-specific: drag start handler */
  onDragStart?: (e: React.DragEvent, chart: DashboardChart) => void;
  /** Canvas-specific: drag end handler */
  onDragEnd?: () => void;
  /** Canvas-specific: toggle visibility on canvas */
  onToggleVisibility?: (chart: DashboardChart) => void;
}

export function KpiCard({
  dashboardChart,
  teamId,
  showSettings = true,
  enableDragDrop = false,
  isOnCanvas = false,
  isDragging = false,
  onDragStart,
  onDragEnd,
  onToggleVisibility,
}: KpiCardProps) {
  const metric = dashboardChart.metric;
  const isProcessing = !!metric.refreshStatus;
  const canDrag = enableDragDrop && !isProcessing;

  // Get chart transform for title (consistent with DashboardMetricCard)
  const chartTransform =
    dashboardChart.chartConfig as ChartTransformResult | null;
  const title = chartTransform?.title ?? metric.name;

  // Goal progress data
  const goalProgress = dashboardChart.goalProgress;
  const timeElapsedPercent = goalProgress
    ? (goalProgress.daysElapsed /
        (goalProgress.daysElapsed + goalProgress.daysRemaining)) *
      100
    : null;

  // Roles
  const roles = metric.roles ?? [];

  return (
    <div
      draggable={canDrag ? true : undefined}
      onDragStart={(e) => {
        e.stopPropagation();
        if (canDrag && onDragStart) {
          onDragStart(e, dashboardChart);
        }
      }}
      onDragEnd={onDragEnd}
      className={cn(
        "group relative flex items-start gap-3 rounded-lg border p-3 transition-colors",
        "hover:bg-accent/50",
        isProcessing && "opacity-70",
        canDrag && "cursor-grab active:cursor-grabbing",
        isDragging && "border-primary opacity-50",
        isOnCanvas && "border-primary/50 bg-primary/5",
      )}
    >
      {/* Drag handle indicator */}
      {enableDragDrop &&
        (canDrag ? (
          <GripVertical
            className="text-muted-foreground/50 group-hover:text-muted-foreground mt-0.5 h-4 w-4 shrink-0 transition-colors"
            aria-label="Drag to reorder"
          />
        ) : (
          <div className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
        ))}

      {/* Platform color bar */}
      <div
        className={cn(
          "h-full min-h-[4rem] w-1.5 shrink-0 self-stretch rounded-sm",
          getPlatformConfig(metric.integration?.providerId ?? "manual").bgColor,
        )}
        aria-hidden="true"
      />

      {/* Content */}
      <div className="min-w-0 flex-1">
        {/* Title row */}
        <div className="flex items-start gap-2">
          <div className="min-w-0 flex-1 space-y-0.5">
            <div className="flex items-center gap-2">
              <p className="truncate text-sm font-medium">{title}</p>
              {isProcessing && (
                <Badge variant="secondary" className="shrink-0 text-xs">
                  <Loader2 className="mr-1 h-3 w-3 animate-spin" />
                  Processing
                </Badge>
              )}
            </div>
            <p className="text-muted-foreground text-xs capitalize">
              {metric.integration?.providerId ?? "manual"}
            </p>
          </div>

          {/* Action buttons */}
          <div className="flex shrink-0 items-center gap-1">
            {showSettings && (
              <Tooltip>
                <TooltipTrigger asChild>
                  <MetricSettingsDialog
                    dashboardChart={dashboardChart}
                    teamId={teamId}
                    trigger={
                      <Button
                        variant="outline"
                        size="icon"
                        className="border-border hover:border-primary/50 h-7 w-7 opacity-0 transition-all duration-200 group-hover:opacity-100 hover:scale-105"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <Settings className="h-3.5 w-3.5" />
                      </Button>
                    }
                  />
                </TooltipTrigger>
                <TooltipContent side="top">Metric settings</TooltipContent>
              </Tooltip>
            )}

            {/* Eye toggle button - shows canvas status */}
            {enableDragDrop && onToggleVisibility && (
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="outline"
                    size="icon"
                    className={cn(
                      "h-7 w-7 transition-all duration-200 hover:scale-105",
                      isOnCanvas
                        ? "border-primary bg-primary/10 text-primary hover:bg-primary/20"
                        : "border-border hover:border-primary/50 opacity-0 group-hover:opacity-100",
                    )}
                    onClick={(e) => {
                      e.stopPropagation();
                      onToggleVisibility(dashboardChart);
                    }}
                  >
                    <Eye className="h-3.5 w-3.5" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent side="top">
                  {isOnCanvas ? "Remove from canvas" : "Add to canvas"}
                </TooltipContent>
              </Tooltip>
            )}
          </div>
        </div>

        {/* Progress bars (stacked) */}
        {goalProgress && timeElapsedPercent !== null && (
          <div className="mt-2 space-y-1">
            {/* Goal Progress Row */}
            <div className="flex items-center gap-1.5 text-[10px]">
              <div className="bg-muted h-1 w-14 overflow-hidden rounded-full">
                <div
                  className={cn(
                    "h-full transition-all",
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
              <span className="font-medium">
                {Math.round(goalProgress.progressPercent)}%
              </span>
              <span className="text-muted-foreground">goal</span>
            </div>

            {/* Time Progress Row */}
            <div className="flex items-center gap-1.5 text-[10px]">
              <div className="bg-muted h-1 w-14 overflow-hidden rounded-full">
                <div
                  className="h-full bg-blue-500 transition-all"
                  style={{
                    width: `${Math.min(timeElapsedPercent, 100)}%`,
                  }}
                />
              </div>
              <span className="font-medium">
                {Math.round(timeElapsedPercent)}%
              </span>
              <span className="text-muted-foreground">·</span>
              <span className="text-muted-foreground">
                {formatTimeRemaining(goalProgress)}
              </span>
              <span className="text-muted-foreground">·</span>
              <span className="text-muted-foreground capitalize">
                {formatCadence(goalProgress.cadence)}
              </span>
            </div>
          </div>
        )}

        {/* No goal state */}
        {!goalProgress && (
          <div className="text-muted-foreground/60 mt-2 flex items-center gap-1.5 text-[10px]">
            <div className="bg-muted h-1 w-14 rounded-full" />
            <span>No goal</span>
          </div>
        )}

        {/* Role display */}
        <div className="mt-1.5">
          {roles.length > 0 ? (
            <div className="flex items-center gap-1 text-[10px]">
              <div
                className="h-1.5 w-1.5 shrink-0 rounded-full"
                style={{ backgroundColor: roles[0]!.color }}
              />
              <span className="text-muted-foreground truncate font-medium">
                {roles[0]!.title}
              </span>
              {roles.length > 1 && (
                <span className="text-muted-foreground/60 shrink-0">
                  +{roles.length - 1}
                </span>
              )}
            </div>
          ) : (
            <div className="text-muted-foreground/60 flex items-center gap-1 text-[10px]">
              <div className="bg-muted-foreground/30 h-1.5 w-1.5 rounded-full" />
              <span>No role</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
