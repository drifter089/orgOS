"use client";

import { useState } from "react";

import {
  ClipboardCheck,
  Info,
  Loader2,
  RefreshCw,
  Trash2,
  X,
} from "lucide-react";
import { Link } from "next-transition-router";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Drawer,
  DrawerClose,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
  DrawerTrigger,
} from "@/components/ui/drawer";
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

import { DashboardMetricDrawer } from "./dashboard-metric-drawer";
import { useDashboardCharts } from "./use-dashboard-charts";
import { useMetricDrawerMutations } from "./use-metric-drawer-mutations";

interface MetricSettingsDrawerProps {
  dashboardChart: DashboardChartWithRelations;
  teamId: string;
  trigger: React.ReactNode;
}

export function MetricSettingsDrawer({
  dashboardChart,
  teamId,
  trigger,
}: MetricSettingsDrawerProps) {
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
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
    onClose: () => setIsDrawerOpen(false),
  });

  return (
    <Drawer open={isDrawerOpen} onOpenChange={setIsDrawerOpen}>
      <DrawerTrigger asChild>{trigger}</DrawerTrigger>

      <DrawerContent className="flex h-[60vh] max-h-[60vh] flex-col overflow-hidden">
        <DrawerHeader className="relative flex flex-row items-center justify-between border-b px-6 py-4">
          <div className="flex items-center gap-3">
            <DrawerTitle className="text-lg font-semibold">
              {metric.name}
            </DrawerTitle>
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
                <TooltipContent side="bottom" className="max-w-[280px]">
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

            <div className="bg-border mx-1 h-6 w-px" />

            {/* Refresh/Rebuild Button with Toggle */}
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="outline"
                  size="sm"
                  className="h-8 gap-2 border px-2 transition-all duration-150 hover:scale-[1.02] hover:shadow-sm active:scale-[0.98]"
                  onClick={() => handleRefresh(forceRebuild)}
                  disabled={processing}
                >
                  <RefreshCw
                    className={cn("h-3.5 w-3.5", processing && "animate-spin")}
                  />
                  <span className="text-xs">
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
              <TooltipContent side="bottom" className="max-w-[200px]">
                <p className="text-xs">
                  {forceRebuild
                    ? "Rebuild: Re-fetch and regenerate chart from scratch"
                    : "Refresh: Fetch latest data"}
                </p>
                <p className="text-muted-foreground mt-1 text-[10px]">
                  Toggle to switch modes
                </p>
              </TooltipContent>
            </Tooltip>

            {/* Delete Button */}
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="outline"
                  size="icon"
                  className="hover:border-destructive/50 hover:bg-destructive/10 hover:text-destructive h-8 w-8 border transition-all duration-150 hover:scale-[1.02] hover:shadow-sm active:scale-[0.98]"
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

            <div className="bg-border mx-1 h-6 w-px" />

            {/* Close Button */}
            <DrawerClose asChild>
              <Button
                variant="outline"
                size="icon"
                className="h-8 w-8 border transition-all duration-150 hover:scale-[1.02] hover:shadow-sm active:scale-[0.98]"
              >
                <X className="h-3.5 w-3.5" />
                <span className="sr-only">Close</span>
              </Button>
            </DrawerClose>
          </div>
        </DrawerHeader>

        <div className="min-h-0 w-full flex-1">
          <DashboardMetricDrawer
            dashboardChartId={dashboardChart.id}
            teamId={teamId}
            onUpdateMetric={handleUpdateMetric}
            onClose={() => setIsDrawerOpen(false)}
            onRegenerateChart={handleRegenerateChart}
          />
        </div>
      </DrawerContent>
    </Drawer>
  );
}
