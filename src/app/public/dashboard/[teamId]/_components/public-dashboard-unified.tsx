"use client";

import { Eye } from "lucide-react";

import { DashboardMetricCard } from "@/app/dashboard/[teamId]/_components/dashboard-metric-card";
import { Badge } from "@/components/ui/badge";

import { usePublicView } from "../../../_context/public-view-context";

export function PublicDashboardUnified() {
  const { dashboard } = usePublicView();

  if (!dashboard) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="mb-8">
          <Badge variant="secondary" className="mb-4 gap-1.5 px-3 py-1.5">
            <Eye className="h-3.5 w-3.5" />
            Preview
          </Badge>
          <p className="text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }

  const { team, dashboardCharts } = dashboard;

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-8">
        <div className="mb-4 flex items-center gap-3">
          <Badge variant="secondary" className="gap-1.5 px-3 py-1.5">
            <Eye className="h-3.5 w-3.5" />
            Preview
          </Badge>
          <h1 className="text-2xl font-bold">{team.name}</h1>
        </div>

        {dashboardCharts.length > 0 && (
          <p className="text-muted-foreground text-sm">
            {`Showing ${dashboardCharts.length} metric${dashboardCharts.length === 1 ? "" : "s"}`}
          </p>
        )}
      </div>

      {dashboardCharts.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-lg border-2 border-dashed py-16">
          <div className="space-y-2 text-center">
            <h3 className="text-lg font-semibold">No KPIs configured</h3>
            <p className="text-muted-foreground max-w-sm text-sm">
              This dashboard has no metrics to display yet.
            </p>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
          {dashboardCharts.map((dashboardMetric) => (
            <DashboardMetricCard
              key={dashboardMetric.id}
              dashboardMetric={dashboardMetric}
              readOnly
            />
          ))}
        </div>
      )}
    </div>
  );
}
