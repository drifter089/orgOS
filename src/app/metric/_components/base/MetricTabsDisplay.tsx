"use client";

import { useMemo } from "react";

import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { cn } from "@/lib/utils";
import { type RouterOutputs, api } from "@/trpc/react";

export type DashboardChart =
  RouterOutputs["dashboard"]["getDashboardCharts"][number];

interface MetricTabsDisplayProps {
  teamId: string;
  className?: string;
  tabsListClassName?: string;
  tabTriggerClassName?: string;
  renderMetricCard: (dashboardChart: DashboardChart) => React.ReactNode;
  emptyMessage?: string;
}

export function MetricTabsDisplay({
  teamId,
  className,
  tabsListClassName,
  tabTriggerClassName,
  renderMetricCard,
  emptyMessage = "No metrics yet",
}: MetricTabsDisplayProps) {
  // Single source of truth: dashboard charts query
  const { data: dashboardCharts, isLoading } =
    api.dashboard.getDashboardCharts.useQuery({ teamId });
  // Group dashboard charts by integration/platform
  const { platformTabs, totalCount } = useMemo(() => {
    if (!dashboardCharts?.length) return { platformTabs: [], totalCount: 0 };

    const grouped = new Map<string, DashboardChart[]>();

    dashboardCharts.forEach((dc) => {
      const platformId = dc.metric.integration?.providerId ?? "manual";
      const existing = grouped.get(platformId) ?? [];
      grouped.set(platformId, [...existing, dc]);
    });

    const tabs = Array.from(grouped.entries()).map(([id, items]) => ({
      id,
      label: id,
      count: items.length,
      charts: items,
    }));

    return {
      platformTabs: tabs.sort((a, b) => a.label.localeCompare(b.label)),
      totalCount: dashboardCharts.length,
    };
  }, [dashboardCharts]);

  if (isLoading) {
    return <div>Loading metrics...</div>;
  }

  if (!dashboardCharts?.length) {
    return (
      <div className="text-muted-foreground py-8 text-center">
        {emptyMessage}
      </div>
    );
  }

  return (
    <Tabs defaultValue="all" className={className}>
      <TabsList
        className={cn(
          "grid h-auto grid-cols-3 gap-2 bg-transparent p-0",
          tabsListClassName,
        )}
      >
        <TabsTrigger
          value="all"
          className={cn(
            "bg-muted/50 h-10 rounded-none border px-3 py-2 text-xs font-medium shadow-sm",
            "transition-all duration-150 ease-in-out",
            "hover:bg-accent hover:-translate-y-0.5 hover:shadow-md",
            "data-[state=active]:border-primary data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:ring-primary/20 data-[state=active]:shadow-lg data-[state=active]:ring-2",
            tabTriggerClassName,
          )}
        >
          All
          <Badge className="ml-1.5" variant="secondary">
            {totalCount}
          </Badge>
        </TabsTrigger>
        {platformTabs.map((tab) => (
          <TabsTrigger
            key={tab.id}
            value={tab.id}
            className={cn(
              "bg-muted/50 h-10 rounded-none border px-3 py-2 text-xs font-medium capitalize shadow-sm",
              "transition-all duration-150 ease-in-out",
              "hover:bg-accent hover:-translate-y-0.5 hover:shadow-md",
              "data-[state=active]:border-primary data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:ring-primary/20 data-[state=active]:shadow-lg data-[state=active]:ring-2",
              tabTriggerClassName,
            )}
          >
            {tab.label}
            <Badge className="ml-1.5" variant="secondary">
              {tab.count}
            </Badge>
          </TabsTrigger>
        ))}
      </TabsList>

      {/* All metrics tab */}
      <TabsContent value="all" className="space-y-2">
        {dashboardCharts.map((dc) => renderMetricCard(dc))}
      </TabsContent>

      {/* Per-platform tabs */}
      {platformTabs.map((tab) => (
        <TabsContent key={tab.id} value={tab.id} className="space-y-2">
          {tab.charts.map((dc) => renderMetricCard(dc))}
        </TabsContent>
      ))}
    </Tabs>
  );
}
