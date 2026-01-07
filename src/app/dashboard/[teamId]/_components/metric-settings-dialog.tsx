"use client";

import { useState } from "react";

import { ClipboardCheck, Info, Loader2, RefreshCw, Trash2 } from "lucide-react";
import { Link } from "next-transition-router";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Switch } from "@/components/ui/switch";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import type { ChartTransformResult } from "@/lib/metrics/transformer-types";
import { getPlatformConfig } from "@/lib/platform-config";
import { cn } from "@/lib/utils";
import type { DashboardChartWithRelations } from "@/types/dashboard";

import { DashboardMetricDialog } from "./dashboard-metric-dialog";
import { useDashboardCharts } from "./use-dashboard-charts";
import { useMetricDrawerMutations } from "./use-metric-drawer-mutations";

interface MetricSettingsDialogProps {
  dashboardChart: DashboardChartWithRelations;
  teamId: string;
  trigger: React.ReactNode;
}

export function MetricSettingsDialog({
  dashboardChart,
  teamId,
  trigger,
}: MetricSettingsDialogProps) {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [forceRebuild, setForceRebuild] = useState(false);
  const { isProcessing, getError } = useDashboardCharts(teamId);

  const metric = dashboardChart.metric;
  const metricId = metric.id;
  const processing = isProcessing(metricId);
  const error = getError(metricId);

  const isIntegrationMetric = !!metric.integration?.providerId;
  const chartTransform =
    dashboardChart.chartConfig as ChartTransformResult | null;
  const platformConfig = metric.integration?.providerId
    ? getPlatformConfig(metric.integration.providerId)
    : null;

  const {
    isDeleting,
    handleRefresh,
    handleDelete,
    handleUpdateMetric,
    handleRegenerateChart,
  } = useMetricDrawerMutations({
    metricId,
    metricName: metric.name,
    teamId,
    isIntegrationMetric,
    onClose: () => setIsDialogOpen(false),
  });

  return (
    <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
      <DialogTrigger asChild>{trigger}</DialogTrigger>

      <DialogContent
        className="flex h-[92vh] max-h-[92vh] w-full max-w-[calc(100%-1rem)] flex-col gap-0 overflow-hidden rounded-none p-0 sm:h-[85vh] sm:max-h-[85vh] sm:max-w-4xl md:h-[80vh] md:max-h-[80vh] md:max-w-5xl"
        closeButtonPosition="edge"
      >
        {/* Header */}
        <div className="flex flex-col gap-3 border-b px-4 py-4 pr-12 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between sm:px-6">
          {/* Left side: Title and badges */}
          <div className="flex min-w-0 flex-1 flex-wrap items-center gap-2 sm:gap-3">
            <DialogTitle className="max-w-52 truncate text-lg font-semibold sm:max-w-72 md:max-w-none">
              {metric.name}
            </DialogTitle>
            {chartTransform && (
              <Tooltip>
                <TooltipTrigger asChild>
                  <button
                    type="button"
                    className="text-muted-foreground/60 hover:text-muted-foreground shrink-0 transition-colors"
                  >
                    <Info className="h-4 w-4" />
                  </button>
                </TooltipTrigger>
                <TooltipContent side="bottom" className="max-w-72">
                  <p className="text-xs">
                    {chartTransform.description ??
                      `Showing ${chartTransform.chartType} chart with ${chartTransform.dataKeys?.join(", ") ?? "data"}`}
                  </p>
                </TooltipContent>
              </Tooltip>
            )}
            {platformConfig && (
              <Badge
                variant="secondary"
                className={cn(platformConfig.bgColor, platformConfig.textColor)}
              >
                {platformConfig.name}
              </Badge>
            )}
            {error && (
              <Badge variant="destructive" className="text-xs">
                Error
              </Badge>
            )}
            {processing && (
              <Badge variant="outline" className="text-xs">
                <Loader2 className="mr-1 h-3 w-3 animate-spin" />
                Processing
              </Badge>
            )}
          </div>

          {/* Right side: Action buttons */}
          <div className="flex shrink-0 items-center gap-2">
            {!isIntegrationMetric && (
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="default"
                    size="sm"
                    className="h-8 gap-1 px-3"
                    asChild
                  >
                    <Link href={`/metric/check-in/${metricId}`}>
                      <ClipboardCheck className="h-4 w-4" />
                      <span className="hidden sm:inline">Check-in</span>
                    </Link>
                  </Button>
                </TooltipTrigger>
                <TooltipContent side="bottom">
                  <p className="text-xs">Add a new data point</p>
                </TooltipContent>
              </Tooltip>
            )}

            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="outline"
                  size="sm"
                  className="h-8 gap-2 border px-2 transition-all duration-150 hover:shadow-sm active:scale-[0.98] sm:px-3"
                  onClick={() => handleRefresh(forceRebuild)}
                  disabled={processing}
                >
                  <RefreshCw
                    className={cn("h-3.5 w-3.5", processing && "animate-spin")}
                  />
                  <span className="hidden text-xs sm:inline">
                    {forceRebuild ? "Rebuild" : "Refresh"}
                  </span>
                  <div
                    className="flex items-center gap-1.5 border-l pl-2"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <Switch
                      checked={forceRebuild}
                      onCheckedChange={setForceRebuild}
                      className="h-4 w-7 data-[state=checked]:bg-amber-500"
                    />
                  </div>
                </Button>
              </TooltipTrigger>
              <TooltipContent side="bottom" className="max-w-52">
                <p className="text-xs">
                  {forceRebuild
                    ? "Rebuild: Re-fetch and regenerate chart from scratch"
                    : "Refresh: Fetch latest data"}
                </p>
                <p className="text-muted-foreground mt-1 text-xs">
                  Toggle to switch modes
                </p>
              </TooltipContent>
            </Tooltip>

            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="outline"
                  size="icon"
                  className="hover:border-destructive/50 hover:bg-destructive/10 hover:text-destructive h-8 w-8 border transition-all duration-150 hover:shadow-sm active:scale-[0.98]"
                  onClick={handleDelete}
                  disabled={isDeleting}
                >
                  {isDeleting ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  ) : (
                    <Trash2 className="h-3.5 w-3.5" />
                  )}
                  <span className="sr-only">Delete metric</span>
                </Button>
              </TooltipTrigger>
              <TooltipContent side="bottom">
                <p className="text-xs">Delete metric</p>
              </TooltipContent>
            </Tooltip>
          </div>
        </div>

        {/* Content */}
        <div className="min-h-0 w-full flex-1">
          <DashboardMetricDialog
            dashboardChartId={dashboardChart.id}
            teamId={teamId}
            onUpdateMetric={handleUpdateMetric}
            onClose={() => setIsDialogOpen(false)}
            onRegenerateChart={handleRegenerateChart}
          />
        </div>
      </DialogContent>
    </Dialog>
  );
}
