import { api } from "@/trpc/server";

import { DashboardClient } from "./_components/dashboard-client";

export default async function DashboardPage() {
  // Prefetch dashboard metrics from server
  const dashboardMetrics = await api.dashboard.getDashboardMetrics();

  return (
    <div className="container mx-auto py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
        <p className="text-muted-foreground mt-2">
          Visualize and monitor your key metrics in one place
        </p>
      </div>

      <DashboardClient initialDashboardMetrics={dashboardMetrics} />
    </div>
  );
}
