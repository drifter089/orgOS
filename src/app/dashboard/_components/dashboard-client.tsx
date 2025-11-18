"use client";

import { useState } from "react";

import { Plus, X } from "lucide-react";

import {
  DashboardAreaChart,
  DashboardBarChart,
  DashboardPieChart,
  DashboardRadarChart,
  DashboardRadialChart,
} from "@/components/charts";
import { Button } from "@/components/ui/button";
import type { RouterOutputs } from "@/trpc/react";
import { api } from "@/trpc/react";

import {
  DashboardMetricCard,
  type DisplayedChart,
} from "./dashboard-metric-card";
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
  const [displayedCharts, setDisplayedCharts] = useState<DisplayedChart[]>([]);

  // Use TanStack Query to keep dashboard metrics in sync
  const { data: dashboardMetrics } = api.dashboard.getDashboardMetrics.useQuery(
    undefined,
    {
      initialData: initialDashboardMetrics,
    },
  );

  const handleShowChart = (chart: DisplayedChart) => {
    setDisplayedCharts((prev) => {
      // Check if chart already exists
      const exists = prev.some((c) => c.id === chart.id);
      if (exists) {
        // Update existing chart
        return prev.map((c) => (c.id === chart.id ? chart : c));
      }
      // Add new chart
      return [...prev, chart];
    });
  };

  const handleRemoveChart = (chartId: string) => {
    setDisplayedCharts((prev) => prev.filter((c) => c.id !== chartId));
  };

  const renderChart = (chart: DisplayedChart) => {
    const { chartTransform, metricName } = chart;
    const { chartType, chartData, chartConfig, xAxisKey, dataKeys } =
      chartTransform;

    const chartProps = {
      chartData,
      chartConfig,
      xAxisKey,
      dataKeys,
      title: metricName,
      description: chartTransform.reasoning,
    };

    switch (chartType) {
      case "line":
      case "area":
        return <DashboardAreaChart {...chartProps} />;
      case "bar":
        return <DashboardBarChart {...chartProps} />;
      case "pie":
        return <DashboardPieChart {...chartProps} />;
      case "radar":
        return <DashboardRadarChart {...chartProps} />;
      case "radial":
        return <DashboardRadialChart {...chartProps} />;
      default:
        return <DashboardBarChart {...chartProps} />;
    }
  };

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
              onShowChart={handleShowChart}
            />
          ))}
        </div>
      )}

      {/* Charts Section */}
      {displayedCharts.length > 0 && (
        <section className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-semibold">Charts</h2>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setDisplayedCharts([])}
            >
              Clear All
            </Button>
          </div>
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
            {displayedCharts.map((chart) => (
              <div key={chart.id} className="relative">
                <Button
                  variant="ghost"
                  size="icon"
                  className="absolute top-2 right-2 z-10 h-6 w-6"
                  onClick={() => handleRemoveChart(chart.id)}
                >
                  <X className="h-4 w-4" />
                </Button>
                {renderChart(chart)}
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Metric Selector Dialog */}
      <MetricSelector open={selectorOpen} onOpenChange={setSelectorOpen} />
    </div>
  );
}
