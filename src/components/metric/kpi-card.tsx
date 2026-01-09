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
  showSettings?: boolean;
  enableDragDrop?: boolean;
  isOnCanvas?: boolean;
  isDragging?: boolean;
  onDragStart?: (e: React.DragEvent, chart: DashboardChart) => void;
  onDragEnd?: () => void;
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

  const chartTransform =
    dashboardChart.chartConfig as ChartTransformResult | null;
  const title = chartTransform?.title ?? metric.name;

  const goalProgress = dashboardChart.goalProgress;
  const timeElapsedPercent = goalProgress
    ? (goalProgress.daysElapsed /
        (goalProgress.daysElapsed + goalProgress.daysRemaining)) *
      100
    : null;

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
        "group relative rounded-lg border p-4 transition-colors",
        "hover:bg-accent/50",
        isProcessing && "opacity-70",
        canDrag && "cursor-grab active:cursor-grabbing",
        isDragging && "border-primary opacity-50",
        isOnCanvas && "border-primary/50 bg-primary/5",
      )}
    >
      {/* Header row */}
      <div className="flex items-center gap-3">
        {enableDragDrop &&
          (canDrag ? (
            <GripVertical
              className="text-muted-foreground/40 group-hover:text-muted-foreground h-4 w-4 shrink-0 transition-colors"
              aria-label="Drag to reorder"
            />
          ) : (
            <div className="h-4 w-4 shrink-0" aria-hidden="true" />
          ))}

        <div
          className={cn(
            "h-9 w-1.5 shrink-0 rounded-full",
            getPlatformConfig(metric.integration?.providerId ?? "manual")
              .bgColor,
          )}
          aria-hidden="true"
        />

        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <h3 className="truncate text-sm leading-tight font-semibold">
              {title}
            </h3>
            {isProcessing && (
              <Badge
                variant="secondary"
                className="h-5 shrink-0 px-1.5 text-[10px]"
              >
                <Loader2 className="mr-1 h-2.5 w-2.5 animate-spin" />
                Processing
              </Badge>
            )}
          </div>
          <p className="text-muted-foreground mt-0.5 text-xs capitalize">
            {metric.integration?.providerId ?? "manual"}
          </p>
        </div>

        <div className="flex shrink-0 items-center gap-1">
          {showSettings && (
            <Tooltip>
              <TooltipTrigger asChild>
                <MetricSettingsDialog
                  dashboardChart={dashboardChart}
                  teamId={teamId}
                  trigger={
                    <Button
                      variant="ghost"
                      size="icon"
                      className="text-muted-foreground hover:text-foreground h-7 w-7 opacity-0 transition-all group-hover:opacity-100"
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

          {enableDragDrop && onToggleVisibility && (
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className={cn(
                    "h-7 w-7 transition-all",
                    isOnCanvas
                      ? "text-primary bg-primary/10 opacity-100"
                      : "text-muted-foreground hover:text-foreground opacity-0 group-hover:opacity-100",
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

      {/* Progress section */}
      {goalProgress && timeElapsedPercent !== null && (
        <div className="mt-4 space-y-3">
          <p className="text-muted-foreground text-[11px] font-medium tracking-wider uppercase">
            {formatCadence(goalProgress.cadence)} Goal
          </p>

          <div className="space-y-2.5">
            {/* Goal Progress */}
            <div className="flex items-center gap-3">
              <div className="bg-muted h-2 flex-1 overflow-hidden rounded-full">
                <div
                  className={cn(
                    "h-full rounded-full transition-all",
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
              <div className="flex shrink-0 items-baseline gap-1">
                <span className="w-9 text-right text-xs font-semibold tabular-nums">
                  {Math.round(goalProgress.progressPercent)}%
                </span>
                <span className="text-muted-foreground text-[11px]">goal</span>
              </div>
            </div>

            {/* Time Progress */}
            <div className="flex items-center gap-3">
              <div className="bg-muted h-2 flex-1 overflow-hidden rounded-full">
                <div
                  className="h-full rounded-full bg-blue-500 transition-all"
                  style={{
                    width: `${Math.min(timeElapsedPercent, 100)}%`,
                  }}
                />
              </div>
              <div className="flex shrink-0 items-baseline gap-1">
                <span className="w-9 text-right text-xs font-semibold tabular-nums">
                  {Math.round(timeElapsedPercent)}%
                </span>
                <span className="text-muted-foreground text-[11px]">
                  {formatTimeRemaining(goalProgress)}
                </span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* No goal state */}
      {!goalProgress && (
        <div className="mt-4">
          <div className="flex items-center gap-3">
            <div className="bg-muted h-2 flex-1 rounded-full" />
            <span className="text-muted-foreground/60 shrink-0 text-xs">
              No goal set
            </span>
          </div>
        </div>
      )}

      {/* Role display */}
      <div className="mt-3 flex items-center gap-1.5">
        {roles.length > 0 ? (
          <>
            <div
              className="h-2 w-2 shrink-0 rounded-full"
              style={{ backgroundColor: roles[0]!.color }}
            />
            <span className="text-muted-foreground truncate text-xs font-medium">
              {roles[0]!.title}
            </span>
            {roles.length > 1 && (
              <span className="text-muted-foreground/60 shrink-0 text-xs">
                +{roles.length - 1}
              </span>
            )}
          </>
        ) : (
          <>
            <div className="bg-muted-foreground/20 h-2 w-2 shrink-0 rounded-full" />
            <span className="text-muted-foreground/50 text-xs">
              No role assigned
            </span>
          </>
        )}
      </div>
    </div>
  );
}
