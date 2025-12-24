"use client";

import { Skeleton } from "@/components/ui/skeleton";
import { api } from "@/trpc/react";

import { DashboardClient } from "./dashboard-client";
import { DashboardSidebar } from "./dashboard-sidebar";

interface DashboardPageClientProps {
  teamId: string;
}

/**
 * Dashboard page client component.
 *
 * Single source of truth for dashboard queries:
 * - Fetches getDashboardCharts once here
 * - Passes data down to DashboardClient (no duplicate queries)
 * - DashboardClient handles centralized polling for processing metrics
 */
export function DashboardPageClient({ teamId }: DashboardPageClientProps) {
  // Single query for dashboard charts - data is hydrated from server prefetch
  // refetchInterval: Poll every 3s when any metric is processing (catches completion)
  const {
    data: dashboardCharts,
    isLoading: chartsLoading,
    isError: chartsError,
    isFetching,
  } = api.dashboard.getDashboardCharts.useQuery(
    { teamId },
    {
      refetchInterval: (query) => {
        const hasProcessing = query.state.data?.some(
          (dc) => dc.metric.refreshStatus !== null,
        );
        return hasProcessing ? 3000 : false;
      },
    },
  );

  const {
    data: integrations,
    isLoading: integrationsLoading,
    isError: integrationsError,
  } = api.integration.listWithStats.useQuery();

  // Loading state
  if (chartsLoading || integrationsLoading) {
    return (
      <div className="container mx-auto px-4 py-8 pt-24">
        <div className="mb-8">
          <h1 className="text-3xl font-bold tracking-tight">KPIs</h1>
          <p className="text-muted-foreground mt-2">Loading dashboard...</p>
        </div>
        <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
          {[1, 2, 3, 4].map((i) => (
            <Skeleton key={i} className="h-[420px] rounded-lg" />
          ))}
        </div>
      </div>
    );
  }

  // Error state
  if (chartsError || integrationsError || !dashboardCharts || !integrations) {
    return (
      <div className="container mx-auto px-4 py-8 pt-24">
        <div className="mb-8">
          <h1 className="text-3xl font-bold tracking-tight">KPIs</h1>
          <p className="text-destructive mt-2">
            Failed to load dashboard. Please refresh the page.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8 pt-24">
      <div className="mb-8">
        <h1 className="text-3xl font-bold tracking-tight">KPIs</h1>
        <p className="text-muted-foreground mt-2">
          Visualize and monitor your key metrics in one place
        </p>
      </div>

      <DashboardClient
        teamId={teamId}
        dashboardCharts={dashboardCharts}
        isFetching={isFetching}
      />
      <DashboardSidebar teamId={teamId} initialIntegrations={integrations} />
    </div>
  );
}
