"use client";

import { useCallback, useEffect, useState } from "react";

import type { Cadence } from "@prisma/client";
import { Loader2 } from "lucide-react";

import { getLatestMetricValue } from "@/lib/metrics/get-latest-value";
import type { ChartTransformResult } from "@/lib/metrics/transformer-types";
import { cn } from "@/lib/utils";
import { api } from "@/trpc/react";
import type { DashboardChartWithRelations } from "@/types/dashboard";

import { DashboardMetricChart } from "./dashboard-metric-chart";
import {
  type DialogTab,
  DialogTabButtons,
  GoalTabContent,
  RoleTabContent,
  SettingsTabContent,
} from "./drawer";

interface DashboardMetricDialogProps {
  dashboardChartId: string;
  teamId: string;
  onUpdateMetric: (name: string, description: string) => void;
  onClose: () => void;
  onRegenerateChart: (
    chartType: string,
    cadence: Cadence,
    selectedDimension?: string,
  ) => void;
}

export function DashboardMetricDialog({
  dashboardChartId,
  teamId,
  onUpdateMetric,
  onClose,
  onRegenerateChart,
}: DashboardMetricDialogProps) {
  // Subscribe to cache directly - dialog re-renders when cache changes
  const { data: dashboardChart, isLoading } =
    api.dashboard.getDashboardCharts.useQuery(
      { teamId },
      {
        select: useCallback(
          (charts: DashboardChartWithRelations[]) =>
            charts.find((c) => c.id === dashboardChartId),
          [dashboardChartId],
        ),
      },
    );

  const isProcessing = !!dashboardChart?.metric.refreshStatus;

  const metric = dashboardChart?.metric;
  const metricId = metric?.id;
  const chartTransform = dashboardChart?.chartConfig as
    | ChartTransformResult
    | null
    | undefined;
  const chartTransformer = dashboardChart?.chartTransformer;
  const goalProgress = dashboardChart?.goalProgress ?? null;

  const [activeTab, setActiveTab] = useState<DialogTab>("goal");
  const [selectedChartType, setSelectedChartType] = useState(
    chartTransformer?.chartType ?? "bar",
  );
  const [selectedCadence, setSelectedCadence] = useState<Cadence>(
    chartTransformer?.cadence ?? "WEEKLY",
  );
  const [selectedDimension, setSelectedDimension] = useState<string>(
    chartTransformer?.selectedDimension ?? "value",
  );

  const isIntegrationMetric = !!metric?.integration?.providerId;
  const { data: availableDimensions, isLoading: isDimensionsLoading } =
    api.pipeline.getAvailableDimensions.useQuery(
      { metricId: metricId! },
      { enabled: isIntegrationMetric && !!metricId },
    );

  // Sync form state when cache data changes
  useEffect(() => {
    if (!isProcessing && chartTransformer) {
      setSelectedChartType(chartTransformer.chartType ?? "bar");
      setSelectedCadence(chartTransformer.cadence ?? "WEEKLY");
      setSelectedDimension(chartTransformer.selectedDimension ?? "value");
    }
  }, [chartTransformer, isProcessing]);

  // Loading state - should rarely show since parent already has cache data
  if (isLoading) {
    return (
      <div className="flex h-full items-center justify-center">
        <Loader2 className="text-muted-foreground h-8 w-8 animate-spin" />
      </div>
    );
  }

  // Not found state - chart was deleted or cache cleared
  if (!dashboardChart || !metric) {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-4">
        <p className="text-muted-foreground">Chart not found</p>
        <button
          onClick={onClose}
          className="text-primary text-sm hover:underline"
        >
          Close dialog
        </button>
      </div>
    );
  }

  const hasChartChanges =
    selectedChartType !== (chartTransformer?.chartType ?? "bar") ||
    selectedCadence !== (chartTransformer?.cadence ?? "WEEKLY") ||
    selectedDimension !== (chartTransformer?.selectedDimension ?? "value");

  const hasChartData = !!(
    chartTransform?.chartData && chartTransform.chartData.length > 0
  );
  const currentValue = getLatestMetricValue(chartTransform ?? null);

  const handleApplyChanges = () => {
    onRegenerateChart(
      selectedChartType,
      selectedCadence,
      selectedDimension !== "value" ? selectedDimension : undefined,
    );
  };

  return (
    <div className="grid h-full min-h-0 md:grid-cols-[45%_55%]">
      {/* Left side: Tabs + Tab Content (45%) */}
      <div className="flex min-h-52 flex-col border-b md:border-r md:border-b-0">
        <DialogTabButtons activeTab={activeTab} onTabChange={setActiveTab} />

        <div className="bg-muted/10 relative flex-1">
          {/* Goal Tab */}
          <div
            id="tabpanel-goal"
            role="tabpanel"
            aria-labelledby="tab-goal"
            className={cn(
              "absolute inset-0 overflow-auto transition-all duration-200 ease-out",
              activeTab === "goal"
                ? "translate-y-0 opacity-100"
                : "pointer-events-none translate-y-2 opacity-0",
            )}
          >
            <GoalTabContent
              metricId={metric.id}
              teamId={teamId}
              goal={metric.goal}
              goalProgress={goalProgress}
              currentValue={currentValue}
              valueLabel={dashboardChart.valueLabel ?? null}
              cadence={chartTransformer?.cadence}
              isProcessing={isProcessing}
            />
          </div>

          {/* Role Tab */}
          <div
            id="tabpanel-role"
            role="tabpanel"
            aria-labelledby="tab-role"
            className={cn(
              "absolute inset-0 overflow-auto transition-all duration-200 ease-out",
              activeTab === "role"
                ? "translate-y-0 opacity-100"
                : "pointer-events-none translate-y-2 opacity-0",
            )}
          >
            <RoleTabContent
              metricId={metric.id}
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
            id="tabpanel-settings"
            role="tabpanel"
            aria-labelledby="tab-settings"
            className={cn(
              "absolute inset-0 overflow-auto transition-all duration-200 ease-out",
              activeTab === "settings"
                ? "translate-y-0 opacity-100"
                : "pointer-events-none translate-y-2 opacity-0",
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
              onApplyChanges={handleApplyChanges}
              onUpdateMetric={onUpdateMetric}
            />
          </div>
        </div>
      </div>

      {/* Right side: Chart (70%) */}
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
        latestDataTimestamp={dashboardChart.latestDataTimestamp ?? null}
        className="h-full rounded-none border-0 shadow-none"
      />
    </div>
  );
}
