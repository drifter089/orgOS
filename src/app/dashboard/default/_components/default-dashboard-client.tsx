"use client";

import { Badge } from "@/components/ui/badge";
import { api } from "@/trpc/react";

import { DashboardMetricCard } from "../../[teamId]/_components/dashboard-metric-card";

export function DefaultDashboardClient() {
  const { data: dashboardCharts } =
    api.dashboard.getAllDashboardChartsWithData.useQuery();

  if (!dashboardCharts) {
    return (
      <div className="container mx-auto px-4 py-8 pt-24">
        <div className="mb-8">
          <h1 className="text-3xl font-bold tracking-tight">All KPIs</h1>
          <p className="text-muted-foreground mt-2">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8 pt-24">
      <div className="mb-8">
        <h1 className="text-3xl font-bold tracking-tight">All KPIs</h1>
        <p className="text-muted-foreground mt-2">
          View all metrics with visualizations across your teams
        </p>
      </div>

      <div className="space-y-6">
        <div>
          <p className="text-muted-foreground text-sm">
            {dashboardCharts.length === 0
              ? "No metrics with visualizations yet."
              : `Showing ${dashboardCharts.length} metric${dashboardCharts.length === 1 ? "" : "s"}`}
          </p>
        </div>

        {dashboardCharts.length === 0 ? (
          <div className="flex flex-col items-center justify-center rounded-lg border-2 border-dashed py-16">
            <div className="space-y-2 text-center">
              <h3 className="text-lg font-semibold">No visualizations yet</h3>
              <p className="text-muted-foreground max-w-sm text-sm">
                Create metrics with visualizations from your team dashboards to
                see them here
              </p>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
            {dashboardCharts.map((dc) => (
              <div key={dc.id} className="relative">
                {dc.metric.team && (
                  <Badge
                    variant="secondary"
                    className="absolute top-2 left-2 z-20"
                  >
                    {dc.metric.team.name}
                  </Badge>
                )}
                <DashboardMetricCard
                  metricId={dc.metric.id}
                  teamId={dc.metric.teamId ?? ""}
                  dataOverride={dc}
                  readOnly
                />
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
