"use client";

import { Skeleton } from "@/components/ui/skeleton";

import { DashboardProvider } from "./dashboard-context";
import { DashboardMetricCard } from "./dashboard-metric-card";
import { useDashboardCharts } from "./use-dashboard-charts";

interface DashboardContentProps {
  teamId: string;
}

export function DashboardContent({ teamId }: DashboardContentProps) {
  const dashboardData = useDashboardCharts(teamId);
  const { charts, isLoading, isError } = dashboardData;

  if (isLoading) {
    return (
      <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
        {[1, 2, 3, 4].map((i) => (
          <Skeleton key={i} className="h-[420px] rounded-lg" />
        ))}
      </div>
    );
  }

  if (isError) {
    return (
      <div className="flex flex-col items-center justify-center rounded-lg border-2 border-dashed py-16">
        <div className="space-y-2 text-center">
          <h3 className="text-lg font-semibold">Failed to load</h3>
          <p className="text-muted-foreground max-w-sm text-sm">
            Failed to load dashboard charts. Please refresh the page.
          </p>
        </div>
      </div>
    );
  }

  return (
    <DashboardProvider value={dashboardData}>
      <div className="space-y-6">
        {charts.length > 0 && (
          <p className="text-muted-foreground text-sm">
            {`Showing ${charts.length} metric${charts.length === 1 ? "" : "s"}`}
          </p>
        )}

        {charts.length === 0 ? (
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
            {charts.map((dc) => (
              <DashboardMetricCard
                key={dc.id}
                dashboardChart={dc}
                teamId={teamId}
              />
            ))}
          </div>
        )}
      </div>
    </DashboardProvider>
  );
}
