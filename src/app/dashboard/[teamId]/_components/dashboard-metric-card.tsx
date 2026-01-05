"use client";

import { AlertCircle, Bug, ClipboardCheck, Settings } from "lucide-react";
import { Link } from "next-transition-router";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { isDevMode } from "@/lib/dev-mode";
import type { ChartTransformResult } from "@/lib/metrics/transformer-types";
import type { DashboardChartWithRelations } from "@/types/dashboard";

import { DashboardMetricChart } from "./dashboard-metric-chart";
import { MetricSettingsDrawer } from "./metric-settings-drawer";
import { useDashboardCharts } from "./use-dashboard-charts";

interface DashboardMetricCardProps {
  dashboardChart: DashboardChartWithRelations;
  teamId: string;
}

export function DashboardMetricCard({
  dashboardChart,
  teamId,
}: DashboardMetricCardProps) {
  const { isProcessing, getError } = useDashboardCharts(teamId);

  const metric = dashboardChart.metric;
  const metricId = metric.id;
  const processing = isProcessing(metricId);
  const error = getError(metricId);

  const isIntegrationMetric = !!metric.integration?.providerId;
  const chartTransform =
    dashboardChart.chartConfig as ChartTransformResult | null;
  const hasChartData = !!chartTransform?.chartData?.length;
  const title = chartTransform?.title ?? metric.name;

  return (
    <div className="relative">
      {error && !processing && (
        <Tooltip>
          <TooltipTrigger asChild>
            <Badge
              variant="destructive"
              className="absolute top-4 left-3 z-10 h-6 gap-1 px-2"
            >
              <AlertCircle className="h-3 w-3" />
              <span className="text-xs">Error</span>
            </Badge>
          </TooltipTrigger>
          <TooltipContent side="bottom" className="max-w-[300px]">
            <p className="text-sm">{error}</p>
          </TooltipContent>
        </Tooltip>
      )}

      <div className="absolute top-2 right-2 z-10 flex items-center gap-1">
        {!isIntegrationMetric && (
          <Tooltip>
            <TooltipTrigger asChild>
              <Button variant="outline" size="icon" className="h-7 w-7" asChild>
                <Link href={`/metric/check-in/${metricId}`}>
                  <ClipboardCheck className="h-4 w-4" />
                </Link>
              </Button>
            </TooltipTrigger>
            <TooltipContent side="bottom">
              <p className="text-xs">Check-in</p>
            </TooltipContent>
          </Tooltip>
        )}
        <MetricSettingsDrawer
          dashboardChart={dashboardChart}
          teamId={teamId}
          trigger={
            <Button variant="outline" size="icon" className="h-7 w-7">
              <Settings className="h-4 w-4" />
            </Button>
          }
        />
      </div>

      {isDevMode() && (
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="ghost"
              size="sm"
              className="text-muted-foreground absolute top-0 left-0 z-10 h-7 w-7 p-0 hover:text-amber-600"
              onClick={() =>
                window.open(`/dev-metric-tool/${metricId}`, "_blank")
              }
            >
              <Bug className="h-3.5 w-3.5" />
            </Button>
          </TooltipTrigger>
          <TooltipContent side="right">
            <p className="text-xs">Open Pipeline Debug Tool</p>
          </TooltipContent>
        </Tooltip>
      )}

      <DashboardMetricChart
        title={title}
        chartTransform={chartTransform}
        hasChartData={hasChartData}
        isIntegrationMetric={isIntegrationMetric}
        integrationId={metric.integration?.providerId}
        roles={metric.roles ?? []}
        goal={metric.goal}
        goalProgress={dashboardChart.goalProgress}
        valueLabel={dashboardChart.valueLabel}
        isProcessing={processing}
        latestDataTimestamp={dashboardChart.latestDataTimestamp}
      />
    </div>
  );
}

export function ReadOnlyMetricCard({
  dashboardChart,
}: {
  dashboardChart: DashboardChartWithRelations;
}) {
  const metric = dashboardChart.metric;
  const chartTransform =
    dashboardChart.chartConfig as ChartTransformResult | null;
  const hasChartData = !!chartTransform?.chartData?.length;

  return (
    <div className="relative">
      {metric.lastError && !metric.refreshStatus && (
        <Badge
          variant="destructive"
          className="absolute top-4 left-3 z-10 h-6 gap-1 px-2"
        >
          <AlertCircle className="h-3 w-3" />
          <span className="text-xs">Error</span>
        </Badge>
      )}

      <DashboardMetricChart
        title={chartTransform?.title ?? metric.name}
        chartTransform={chartTransform}
        hasChartData={hasChartData}
        isIntegrationMetric={!!metric.integration?.providerId}
        integrationId={metric.integration?.providerId}
        roles={metric.roles ?? []}
        goal={metric.goal}
        goalProgress={dashboardChart.goalProgress}
        valueLabel={dashboardChart.valueLabel}
        isProcessing={!!metric.refreshStatus}
        latestDataTimestamp={dashboardChart.latestDataTimestamp}
      />
    </div>
  );
}
