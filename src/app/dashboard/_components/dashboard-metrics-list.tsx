"use client";

import { useMemo } from "react";

import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { cn } from "@/lib/utils";
import { api } from "@/trpc/react";

// Platform logo colors matching integration-client.tsx
const getPlatformColor = (integrationId: string) => {
  const colorMap: Record<string, string> = {
    github: "bg-slate-900",
    gitlab: "bg-orange-600",
    linear: "bg-indigo-600",
    jira: "bg-blue-600",
    notion: "bg-black",
    slack: "bg-purple-900",
    asana: "bg-red-400",
    trello: "bg-blue-500",
    posthog: "bg-yellow-500",
    youtube: "bg-red-600",
    "google-sheet": "bg-green-600",
    "google-sheets": "bg-green-600",
    google: "bg-blue-500",
  };
  return colorMap[integrationId.toLowerCase()] ?? "bg-gray-600";
};

interface DashboardMetricsListProps {
  className?: string;
}

export function DashboardMetricsList({ className }: DashboardMetricsListProps) {
  const { data: metrics, isLoading } = api.metric.getAll.useQuery();

  // Group metrics by platform
  const { platformTabs, metricsCount } = useMemo(() => {
    if (!metrics) return { platformTabs: [], metricsCount: 0 };

    const grouped = new Map<string, typeof metrics>();

    metrics.forEach((metric) => {
      const platformId = metric.integration?.integrationId ?? "other";
      const existing = grouped.get(platformId) ?? [];
      grouped.set(platformId, [...existing, metric]);
    });

    const tabs = Array.from(grouped.entries()).map(([platformId, items]) => ({
      id: platformId,
      label: platformId,
      count: items.length,
      metrics: items,
    }));

    return {
      platformTabs: tabs.sort((a, b) => a.label.localeCompare(b.label)),
      metricsCount: metrics.length,
    };
  }, [metrics]);

  if (isLoading) {
    return (
      <div className={cn("space-y-3", className)}>
        <Skeleton className="h-8 w-full" />
        <div className="space-y-2">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-12 w-full" />
          ))}
        </div>
      </div>
    );
  }

  if (!metrics || metrics.length === 0) {
    return (
      <div
        className={cn(
          "text-muted-foreground flex flex-col items-center justify-center rounded-lg border border-dashed py-8 text-center",
          className,
        )}
      >
        <p className="text-sm font-medium">No metrics yet</p>
        <p className="text-xs">Create metrics from your integrations</p>
      </div>
    );
  }

  return (
    <div className={cn("space-y-3", className)}>
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold">Your Metrics</h3>
        <Badge variant="secondary" className="text-xs">
          {metricsCount}
        </Badge>
      </div>

      <Tabs defaultValue="all" className="w-full">
        <TabsList
          className={cn(
            "h-auto w-full gap-2 bg-transparent p-0",
            platformTabs.length <= 3
              ? "grid grid-cols-4"
              : "flex flex-wrap justify-start",
          )}
        >
          <TabsTrigger
            value="all"
            className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground border-input bg-background hover:bg-accent hover:text-accent-foreground rounded-md border text-xs shadow-sm transition-all data-[state=active]:shadow"
          >
            All
            <Badge
              variant="secondary"
              className="data-[state=active]:bg-primary-foreground/20 ml-1.5 text-xs"
            >
              {metricsCount}
            </Badge>
          </TabsTrigger>
          {platformTabs.map((tab) => (
            <TabsTrigger
              key={tab.id}
              value={tab.id}
              className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground border-input bg-background hover:bg-accent hover:text-accent-foreground rounded-md border text-xs capitalize shadow-sm transition-all data-[state=active]:shadow"
            >
              {tab.label}
              <Badge variant="secondary" className="ml-1.5 text-xs">
                {tab.count}
              </Badge>
            </TabsTrigger>
          ))}
        </TabsList>

        <TabsContent
          value="all"
          className="animate-in fade-in-50 slide-in-from-bottom-2 mt-3 space-y-2 duration-500"
        >
          {metrics.length === 0 ? (
            <EmptyState message="No metrics found" />
          ) : (
            metrics.map((metric, index) => (
              <div
                key={metric.id}
                className="animate-in fade-in-50 slide-in-from-left-2"
                style={{
                  animationDelay: `${index * 50}ms`,
                  animationDuration: "300ms",
                  animationFillMode: "backwards",
                }}
              >
                <MetricCard metric={metric} />
              </div>
            ))
          )}
        </TabsContent>

        {platformTabs.map((tab) => (
          <TabsContent
            key={tab.id}
            value={tab.id}
            className="animate-in fade-in-50 slide-in-from-bottom-2 mt-3 space-y-2 duration-500"
          >
            {tab.metrics.length === 0 ? (
              <EmptyState message={`No ${tab.label} metrics`} />
            ) : (
              tab.metrics.map((metric, index) => (
                <div
                  key={metric.id}
                  className="animate-in fade-in-50 slide-in-from-left-2"
                  style={{
                    animationDelay: `${index * 50}ms`,
                    animationDuration: "300ms",
                    animationFillMode: "backwards",
                  }}
                >
                  <MetricCard metric={metric} />
                </div>
              ))
            )}
          </TabsContent>
        ))}
      </Tabs>
    </div>
  );
}

interface MetricCardProps {
  metric: {
    id: string;
    name: string;
    integration: {
      integrationId: string;
    } | null;
  };
}

function MetricCard({ metric }: MetricCardProps) {
  const platformColor = metric.integration
    ? getPlatformColor(metric.integration.integrationId)
    : "bg-gray-600";

  return (
    <div className="bg-card hover:bg-accent/50 group relative flex items-center gap-3 rounded-lg border p-3 shadow-sm transition-all hover:shadow-md">
      {/* Platform indicator */}
      <div
        className={cn(
          "h-8 w-1 flex-shrink-0 rounded-full transition-all group-hover:w-1.5",
          platformColor,
        )}
      />

      {/* Metric info */}
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm leading-tight font-medium">
          {metric.name}
        </p>
        {metric.integration && (
          <p className="text-muted-foreground mt-0.5 truncate text-xs capitalize">
            {metric.integration.integrationId}
          </p>
        )}
      </div>
    </div>
  );
}

function EmptyState({ message }: { message: string }) {
  return (
    <div className="text-muted-foreground flex flex-col items-center justify-center rounded-lg border border-dashed py-8 text-center">
      <p className="text-xs">{message}</p>
    </div>
  );
}
