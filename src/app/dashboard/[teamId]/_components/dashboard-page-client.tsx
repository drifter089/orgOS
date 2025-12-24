"use client";

import { Skeleton } from "@/components/ui/skeleton";
import { api } from "@/trpc/react";

import { DashboardContent } from "./dashboard-content";
import { DashboardSidebar } from "./dashboard-sidebar";

interface DashboardPageClientProps {
  teamId: string;
}

export function DashboardPageClient({ teamId }: DashboardPageClientProps) {
  const {
    data: integrations,
    isLoading: integrationsLoading,
    isError: integrationsError,
  } = api.integration.listWithStats.useQuery();

  if (integrationsLoading) {
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

  if (integrationsError || !integrations) {
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

      <DashboardContent teamId={teamId} />
      <DashboardSidebar teamId={teamId} initialIntegrations={integrations} />
    </div>
  );
}
