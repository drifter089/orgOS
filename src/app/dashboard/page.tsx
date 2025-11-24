"use client";

import { useCallback, useRef } from "react";

import { api } from "@/trpc/react";

import type { DashboardClientHandle } from "./_components/dashboard-client";
import { DashboardClient } from "./_components/dashboard-client";
import { DashboardSidebar } from "./_components/dashboard-sidebar";

export default function DashboardPage() {
  const dashboardMetrics = api.dashboard.getDashboardMetrics.useQuery();
  const integrations = api.integration.listWithStats.useQuery();

  const importTriggerRef = useRef<DashboardClientHandle | null>(null);

  const handleMetricCreated = () => {
    importTriggerRef.current?.triggerImport();
  };

  const handleImportRef = useCallback((handle: DashboardClientHandle) => {
    importTriggerRef.current = handle;
  }, []);

  if (!dashboardMetrics.data || !integrations.data) {
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
        initialDashboardMetrics={dashboardMetrics.data}
        onImportRef={handleImportRef}
      />
      <DashboardSidebar
        initialIntegrations={integrations.data}
        onMetricCreated={handleMetricCreated}
      />
    </div>
  );
}
