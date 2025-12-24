"use client";

import { Skeleton } from "@/components/ui/skeleton";
import { api } from "@/trpc/react";

import { DashboardClient } from "./dashboard-client";
import { DashboardSidebar } from "./dashboard-sidebar";
import { PipelineStatusProvider } from "./pipeline-status-provider";

interface DashboardPageClientProps {
  teamId: string;
}

/**
 * Dashboard page client component.
 *
 * Architecture:
 * - Single getDashboardCharts query here
 * - PipelineStatusProvider wraps both client and sidebar
 * - Provider handles all status polling and mutations
 * - Cards receive data as props (no duplicate queries)
 */
export function DashboardPageClient({ teamId }: DashboardPageClientProps) {
  const {
    data: dashboardCharts,
    isLoading: chartsLoading,
    isError: chartsError,
  } = api.dashboard.getDashboardCharts.useQuery({ teamId });

  const {
    data: integrations,
    isLoading: integrationsLoading,
    isError: integrationsError,
  } = api.integration.listWithStats.useQuery();

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
    <PipelineStatusProvider teamId={teamId} dashboardCharts={dashboardCharts}>
      <div className="container mx-auto px-4 py-8 pt-24">
        <div className="mb-8">
          <h1 className="text-3xl font-bold tracking-tight">KPIs</h1>
          <p className="text-muted-foreground mt-2">
            Visualize and monitor your key metrics in one place
          </p>
        </div>

        <DashboardClient dashboardCharts={dashboardCharts} />
        <DashboardSidebar teamId={teamId} initialIntegrations={integrations} />
      </div>
    </PipelineStatusProvider>
  );
}
