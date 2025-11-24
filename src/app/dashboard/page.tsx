import { api } from "@/trpc/server";

import { DashboardClient } from "./_components/dashboard-client";
import { DashboardSidebar } from "./_components/dashboard-sidebar";

export default async function DashboardPage() {
  const dashboardMetrics = await api.dashboard.getDashboardMetrics();
  const integrations = await api.integration.listWithStats();

  return (
    <div className="container mx-auto py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
        <p className="text-muted-foreground mt-2">
          Visualize and monitor your key metrics in one place
        </p>
      </div>

      <DashboardClient initialDashboardMetrics={dashboardMetrics} />
      <DashboardSidebar initialIntegrations={integrations} />
    </div>
  );
}
