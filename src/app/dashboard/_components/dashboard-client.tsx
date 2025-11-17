"use client";

import { useState } from "react";

import { Plus } from "lucide-react";

import { Button } from "@/components/ui/button";
import type { RouterOutputs } from "@/trpc/react";
import { api } from "@/trpc/react";

import { DashboardMetricCard } from "./dashboard-metric-card";
import { MetricSelector } from "./metric-selector";

// Infer types from tRPC router
type DashboardMetrics = RouterOutputs["dashboard"]["getDashboardMetrics"];

interface DashboardClientProps {
  initialDashboardMetrics: DashboardMetrics;
}

export function DashboardClient({
  initialDashboardMetrics,
}: DashboardClientProps) {
  const [selectorOpen, setSelectorOpen] = useState(false);

  // Use TanStack Query to keep dashboard metrics in sync
  const { data: dashboardMetrics } = api.dashboard.getDashboardMetrics.useQuery(
    undefined,
    {
      initialData: initialDashboardMetrics,
    },
  );

  return (
    <div className="space-y-6">
      {/* Add Metric Button */}
      <div className="flex items-center justify-between">
        <div>
          <p className="text-muted-foreground text-sm">
            {dashboardMetrics.length === 0
              ? "No metrics on dashboard yet. Add your first metric to get started."
              : `Showing ${dashboardMetrics.length} metric${dashboardMetrics.length === 1 ? "" : "s"}`}
          </p>
        </div>
        <Button onClick={() => setSelectorOpen(true)}>
          <Plus className="mr-2 h-4 w-4" />
          Add Metric
        </Button>
      </div>

      {/* Dashboard Grid */}
      {dashboardMetrics.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-lg border-2 border-dashed py-16">
          <div className="space-y-2 text-center">
            <h3 className="text-lg font-semibold">No metrics yet</h3>
            <p className="text-muted-foreground max-w-sm text-sm">
              Add metrics to your dashboard to start tracking and visualizing
              your data
            </p>
            <Button
              className="mt-4"
              variant="outline"
              onClick={() => setSelectorOpen(true)}
            >
              <Plus className="mr-2 h-4 w-4" />
              Add Your First Metric
            </Button>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
          {dashboardMetrics.map((dashboardMetric) => (
            <DashboardMetricCard
              key={dashboardMetric.id}
              dashboardMetric={dashboardMetric}
            />
          ))}
        </div>
      )}

      {/* Metric Selector Dialog */}
      <MetricSelector open={selectorOpen} onOpenChange={setSelectorOpen} />
    </div>
  );
}
