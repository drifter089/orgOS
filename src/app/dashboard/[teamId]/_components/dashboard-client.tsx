"use client";

import type { DashboardChartWithRelations } from "@/types/dashboard";

import { DashboardMetricCard } from "./dashboard-metric-card";

interface DashboardClientProps {
  dashboardCharts: DashboardChartWithRelations[];
}

/**
 * Dashboard client - renders metric cards.
 * Cards receive data as props and use PipelineStatusProvider for status.
 */
export function DashboardClient({ dashboardCharts }: DashboardClientProps) {
  return (
    <div className="space-y-6">
      {dashboardCharts.length > 0 && (
        <p className="text-muted-foreground text-sm">
          {`Showing ${dashboardCharts.length} metric${dashboardCharts.length === 1 ? "" : "s"}`}
        </p>
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
            <DashboardMetricCard key={dc.id} dashboardChart={dc} />
          ))}
        </div>
      )}
    </div>
  );
}
