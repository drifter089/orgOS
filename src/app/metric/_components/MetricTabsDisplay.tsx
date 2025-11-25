"use client";

import { useMemo } from "react";

import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { cn } from "@/lib/utils";
import { type RouterOutputs, api } from "@/trpc/react";

type Metric = RouterOutputs["metric"]["getAll"][number];

interface MetricTabsDisplayProps {
  // Styling props for flexibility
  className?: string;
  tabsListClassName?: string;
  tabTriggerClassName?: string;

  // Render function for metric cards (different in dashboard vs page)
  renderMetricCard: (metric: Metric) => React.ReactNode;

  // Optional: for SSR/initial data
  initialMetrics?: Metric[];

  // Optional: empty state message
  emptyMessage?: string;
}

export function MetricTabsDisplay({
  className,
  tabsListClassName,
  tabTriggerClassName,
  renderMetricCard,
  initialMetrics,
  emptyMessage = "No metrics yet",
}: MetricTabsDisplayProps) {
  const { data: metrics, isLoading } = api.metric.getAll.useQuery(undefined, {
    initialData: initialMetrics,
  });

  // Group metrics by integration
  const { platformTabs, totalCount } = useMemo(() => {
    if (!metrics) return { platformTabs: [], totalCount: 0 };

    const grouped = new Map<string, typeof metrics>();

    metrics.forEach((metric) => {
      const platformId = metric.integration?.integrationId ?? "other";
      const existing = grouped.get(platformId) ?? [];
      grouped.set(platformId, [...existing, metric]);
    });

    const tabs = Array.from(grouped.entries()).map(([id, items]) => ({
      id,
      label: id,
      count: items.length,
      metrics: items,
    }));

    return {
      platformTabs: tabs.sort((a, b) => a.label.localeCompare(b.label)),
      totalCount: metrics.length,
    };
  }, [metrics]);

  if (isLoading) {
    return <div>Loading metrics...</div>;
  }

  if (!metrics || metrics.length === 0) {
    return (
      <div className="text-muted-foreground py-8 text-center">
        {emptyMessage}
      </div>
    );
  }

  return (
    <Tabs defaultValue="all" className={className}>
      <TabsList className={cn("w-full", tabsListClassName)}>
        <TabsTrigger value="all" className={tabTriggerClassName}>
          All
          <Badge className="ml-2" variant="secondary">
            {totalCount}
          </Badge>
        </TabsTrigger>
        {platformTabs.map((tab) => (
          <TabsTrigger
            key={tab.id}
            value={tab.id}
            className={cn("capitalize", tabTriggerClassName)}
          >
            {tab.label}
            <Badge className="ml-2" variant="secondary">
              {tab.count}
            </Badge>
          </TabsTrigger>
        ))}
      </TabsList>

      {/* All metrics tab */}
      <TabsContent value="all" className="space-y-2">
        {metrics.map((metric) => renderMetricCard(metric))}
      </TabsContent>

      {/* Per-platform tabs */}
      {platformTabs.map((tab) => (
        <TabsContent key={tab.id} value={tab.id} className="space-y-2">
          {tab.metrics.map((metric) => renderMetricCard(metric))}
        </TabsContent>
      ))}
    </Tabs>
  );
}
