"use client";

import type { RouterOutputs } from "@/trpc/react";
import { api } from "@/trpc/react";

import { DashboardMetricCard } from "./dashboard-metric-card";

type DashboardMetrics = RouterOutputs["dashboard"]["getDashboardMetrics"];

interface DashboardClientProps {
  teamId: string;
  initialDashboardMetrics: DashboardMetrics;
}

export function DashboardClient({
  teamId,
  initialDashboardMetrics,
}: DashboardClientProps) {
  const { data: dashboardMetrics } = api.dashboard.getDashboardMetrics.useQuery(
    { teamId },
    {
      initialData: initialDashboardMetrics,
    },
  );

  return (
    <div className="space-y-6">
      <div>
        <p className="text-muted-foreground text-sm">
          {dashboardMetrics.length === 0
            ? "No metrics on dashboard yet. Add metrics from the sidebar."
            : `Showing ${dashboardMetrics.length} metric${dashboardMetrics.length === 1 ? "" : "s"}`}
        </p>
      </div>

      {dashboardMetrics.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-lg border-2 border-dashed py-16">
          <div className="space-y-2 text-center">
            <h3 className="text-lg font-semibold">No metrics yet</h3>
            <p className="text-muted-foreground max-w-sm text-sm">
              Add metrics from connected integrations using the sidebar to start
              tracking and visualizing your data
            </p>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
          {dashboardMetrics.map((dashboardMetric) => (
            <DashboardMetricCard
              key={dashboardMetric.id}
              dashboardMetric={dashboardMetric}
            />
          ))}
        </div>
      )}
    </div>
  );
}
