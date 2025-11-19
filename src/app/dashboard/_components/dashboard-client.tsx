"use client";

import { useState } from "react";

import { Plus } from "lucide-react";

import { Button } from "@/components/ui/button";
import type { RouterOutputs } from "@/trpc/react";
import { api } from "@/trpc/react";

import { DashboardMetricCard } from "./dashboard-metric-card";
import { MetricSelector } from "./metric-selector";

type DashboardMetrics = RouterOutputs["dashboard"]["getDashboardMetrics"];

interface DashboardClientProps {
  initialDashboardMetrics: DashboardMetrics;
  autoTrigger?: boolean;
}

export function DashboardClient({
  initialDashboardMetrics,
  autoTrigger = true,
}: DashboardClientProps) {
  const [selectorOpen, setSelectorOpen] = useState(false);

  const { data: dashboardMetrics } = api.dashboard.getDashboardMetrics.useQuery(
    undefined,
    {
      initialData: initialDashboardMetrics,
    },
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-muted-foreground text-sm">
            {dashboardMetrics.length === 0
              ? "No metrics on dashboard yet. Import your first metric to get started."
              : `Showing ${dashboardMetrics.length} metric${dashboardMetrics.length === 1 ? "" : "s"}`}
          </p>
        </div>
        <Button onClick={() => setSelectorOpen(true)}>
          <Plus className="mr-2 h-4 w-4" />
          Import Metrics
        </Button>
      </div>

      {dashboardMetrics.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-lg border-2 border-dashed py-16">
          <div className="space-y-2 text-center">
            <h3 className="text-lg font-semibold">No metrics yet</h3>
            <p className="text-muted-foreground max-w-sm text-sm">
              Import metrics to your dashboard to start tracking and visualizing
              your data
            </p>
            <Button
              className="mt-4"
              variant="outline"
              onClick={() => setSelectorOpen(true)}
            >
              <Plus className="mr-2 h-4 w-4" />
              Import Your First Metric
            </Button>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-6 md:grid-cols-2 xl:grid-cols-3">
          {dashboardMetrics.map((dashboardMetric) => (
            <DashboardMetricCard
              key={dashboardMetric.id}
              dashboardMetric={dashboardMetric}
              autoTrigger={autoTrigger}
            />
          ))}
        </div>
      )}

      <MetricSelector open={selectorOpen} onOpenChange={setSelectorOpen} />
    </div>
  );
}
