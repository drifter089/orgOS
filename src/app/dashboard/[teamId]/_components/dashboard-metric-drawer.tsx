"use client";

import { useEffect, useState } from "react";

import type { Cadence } from "@prisma/client";
import { ClipboardCheck, Loader2, X } from "lucide-react";
import { Link } from "next-transition-router";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { DrawerClose } from "@/components/ui/drawer";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { getLatestMetricValue } from "@/lib/metrics/get-latest-value";
import type { ChartTransformResult } from "@/lib/metrics/transformer-types";
import { getPlatformConfig } from "@/lib/platform-config";
import { cn } from "@/lib/utils";
import { api } from "@/trpc/react";
import type { DashboardChartWithRelations } from "@/types/dashboard";

import { DashboardMetricChart } from "./dashboard-metric-chart";
import {
  ChartStatsBar,
  type DrawerTab,
  DrawerTabButtons,
  GoalTabContent,
  RoleTabContent,
  SettingsTabContent,
} from "./drawer";

interface DashboardMetricDrawerProps {
  dashboardChart: DashboardChartWithRelations;
  isProcessing: boolean;
  error: string | null;
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

export function DashboardMetricDrawer({
  dashboardChart,
  isProcessing,
  error,
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
    if (!isProcessing) {
      setSelectedChartType(chartTransformer?.chartType ?? "bar");
      setSelectedCadence(chartTransformer?.cadence ?? "WEEKLY");
      setSelectedDimension(chartTransformer?.selectedDimension ?? "value");
    }
  }, [chartTransformer, isProcessing]);

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
    <div className="grid h-full grid-cols-[50%_30%_20%] gap-0">
      {/* Chart Column (50%) */}
      <div className="flex flex-col border-r">
        {/* Header with Goal & Time Progress */}
        <div className="flex items-center justify-between border-b px-6 py-4">
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
            {error && (
              <Badge variant="destructive" className="text-xs">
                Error
              </Badge>
            )}
            {isProcessing && (
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

        {/* Stats Bar with Goal & Time Progress */}
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
            isProcessing={isProcessing}
          />
        </div>
      </div>

      {/* Tab Content Column (30%) */}
      <div className="bg-muted/20 relative overflow-hidden border-r">
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
            isProcessing={isProcessing}
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
