"use client";

import { useCallback, useRef } from "react";

import { api } from "@/trpc/react";

import type { DashboardClientHandle } from "./dashboard-client";
import { DashboardClient } from "./dashboard-client";
import { DashboardSidebar } from "./dashboard-sidebar";

interface DashboardPageClientProps {
  teamId: string;
}

export function DashboardPageClient({ teamId }: DashboardPageClientProps) {
  // Data is already hydrated from server prefetch - instant availability
  const { data: dashboardMetrics } = api.dashboard.getDashboardMetrics.useQuery(
    { teamId },
  );
  const { data: integrations } = api.integration.listWithStats.useQuery();

  const importTriggerRef = useRef<DashboardClientHandle | null>(null);

  const handleMetricCreated = () => {
    importTriggerRef.current?.triggerImport();
  };

  const handleImportRef = useCallback((handle: DashboardClientHandle) => {
    importTriggerRef.current = handle;
  }, []);

  // Data should be available from server prefetch
  // Fallback loading state in case of edge cases
  if (!dashboardMetrics || !integrations) {
    return (
      <div className="container mx-auto px-4 py-8 pt-24">
        <div className="mb-8">
          <h1 className="text-3xl font-bold tracking-tight">KPIs</h1>
          <p className="text-muted-foreground mt-2">Loading...</p>
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
        initialDashboardMetrics={dashboardMetrics}
        onImportRef={handleImportRef}
      />
      <DashboardSidebar
        teamId={teamId}
        initialIntegrations={integrations}
        onMetricCreated={handleMetricCreated}
      />
    </div>
  );
}
