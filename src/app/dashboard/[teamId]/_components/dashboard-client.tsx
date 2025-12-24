"use client";

import { useEffect, useRef } from "react";

import { toast } from "sonner";

import type { RouterOutputs } from "@/trpc/react";

import { DashboardMetricCard } from "./dashboard-metric-card";

type DashboardMetrics = RouterOutputs["dashboard"]["getDashboardCharts"];

interface DashboardClientProps {
  teamId: string;
  dashboardCharts: DashboardMetrics;
  /** Whether the dashboard charts query is currently fetching */
  isFetching?: boolean;
}

/** Dashboard client - receives data from parent, handles completion detection. */
export function DashboardClient({
  teamId,
  dashboardCharts,
  isFetching = false,
}: DashboardClientProps) {
  const prevChartsRef = useRef<DashboardMetrics | null>(null);

  useEffect(() => {
    if (!prevChartsRef.current) {
      prevChartsRef.current = dashboardCharts;
      return;
    }

    for (const prevChart of prevChartsRef.current) {
      const wasProcessing = !!prevChart.metric.refreshStatus;
      if (!wasProcessing) continue;

      const currentChart = dashboardCharts.find((c) => c.id === prevChart.id);
      const isNowProcessing = !!currentChart?.metric.refreshStatus;

      if (!isNowProcessing && currentChart?.metric.lastError) {
        toast.error("Pipeline failed", {
          description: currentChart.metric.lastError,
          duration: 10000,
        });
      }
    }

    prevChartsRef.current = dashboardCharts;
  }, [dashboardCharts]);

  return (
    <div className="space-y-6">
      {dashboardCharts.length > 0 && (
        <div>
          <p className="text-muted-foreground text-sm">
            {`Showing ${dashboardCharts.length} metric${dashboardCharts.length === 1 ? "" : "s"}`}
          </p>
        </div>
      )}

      {dashboardCharts.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-lg border-2 border-dashed py-16">
          <div className="space-y-2 text-center">
            <h3 className="text-lg font-semibold">No KPIs yet</h3>
            <p className="text-muted-foreground max-w-sm text-sm">
              Add KPIs from connected integrations using the sidebar to start
              tracking and visualizing your data
            </p>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
          {dashboardCharts.map((dashboardMetric) => (
            <DashboardMetricCard
              key={dashboardMetric.id}
              dashboardMetric={dashboardMetric}
              teamId={teamId}
              isFetching={isFetching}
            />
          ))}
        </div>
      )}
    </div>
  );
}
