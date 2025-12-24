"use client";

import type { RouterOutputs } from "@/trpc/react";

import { DashboardMetricCard } from "./dashboard-metric-card";

type DashboardMetrics = RouterOutputs["dashboard"]["getDashboardCharts"];

interface DashboardClientProps {
  teamId: string;
  dashboardCharts: DashboardMetrics;
}

/**
 * Dashboard client - renders metric cards.
 *
 * Cards handle their own status tracking via useMetricStatus hook.
 * Completion detection and error toasts are handled in each card.
 */
export function DashboardClient({
  teamId,
  dashboardCharts,
}: DashboardClientProps) {
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
          {dashboardCharts.map((dc) => (
            <DashboardMetricCard
              key={dc.id}
              metricId={dc.metric.id}
              teamId={teamId}
            />
          ))}
        </div>
      )}
    </div>
  );
}
