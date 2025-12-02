"use client";

import { Eye } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { api } from "@/trpc/react";

import { PublicDashboardMetricCard } from "./public-dashboard-metric-card";

interface PublicDashboardClientProps {
  teamId: string;
  token: string;
}

export function PublicDashboardClient({
  teamId,
  token,
}: PublicDashboardClientProps) {
  const { data } = api.publicView.getDashboardByShareToken.useQuery({
    teamId,
    token,
  });

  if (!data) {
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

  const { dashboardMetrics } = data;

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-8">
        <Badge variant="secondary" className="mb-4 gap-1.5 px-3 py-1.5">
          <Eye className="h-3.5 w-3.5" />
          Preview
        </Badge>
        {dashboardMetrics.length > 0 && (
          <p className="text-muted-foreground text-sm">
            {`Showing ${dashboardMetrics.length} metric${dashboardMetrics.length === 1 ? "" : "s"}`}
          </p>
        )}
      </div>

      {dashboardMetrics.length === 0 ? (
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
          {dashboardMetrics.map((dashboardMetric) => (
            <PublicDashboardMetricCard
              key={dashboardMetric.id}
              dashboardMetric={dashboardMetric}
            />
          ))}
        </div>
      )}
    </div>
  );
}
