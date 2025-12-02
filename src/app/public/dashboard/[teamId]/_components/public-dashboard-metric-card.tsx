"use client";

import type { ChartTransformResult } from "@/app/dashboard/[teamId]/_components/dashboard-metric-card";
import { DashboardMetricChart } from "@/app/dashboard/[teamId]/_components/dashboard-metric-chart";
import type { RouterOutputs } from "@/trpc/react";

type PublicDashboardMetrics =
  RouterOutputs["publicView"]["getDashboardByShareToken"]["dashboardMetrics"];
type PublicDashboardMetricWithRelations = PublicDashboardMetrics[number];

interface PublicDashboardMetricCardProps {
  dashboardMetric: PublicDashboardMetricWithRelations;
}

/**
 * Read-only version of DashboardMetricCard
 * No settings tab, no delete button, no mutations
 */
export function PublicDashboardMetricCard({
  dashboardMetric,
}: PublicDashboardMetricCardProps) {
  const { metric } = dashboardMetric;
  const isIntegrationMetric = !!metric.integrationId;

  const chartTransform =
    dashboardMetric.graphConfig as unknown as ChartTransformResult | null;
  const hasChartData = !!(
    chartTransform?.chartData && chartTransform.chartData.length > 0
  );

  const title = chartTransform?.title ?? metric.name;

  return (
    <div className="h-[380px]">
      <DashboardMetricChart
        title={title}
        chartTransform={chartTransform}
        hasChartData={hasChartData}
        isIntegrationMetric={isIntegrationMetric}
        isPending={false}
        isProcessing={false}
        integrationId={metric.integration?.integrationId}
      />
    </div>
  );
}
