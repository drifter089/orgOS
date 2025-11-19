import { notFound } from "next/navigation";

import { isDevMode } from "@/lib/dev-mode";
import { api } from "@/trpc/server";

import { DashboardClient } from "../_components/dashboard-client";
import { DashboardDebugPanel } from "./debug-panel";

export default async function DashboardDevPage() {
  if (!isDevMode()) {
    notFound();
  }

  const dashboardMetrics = await api.dashboard.getDashboardMetrics();

  return (
    <div className="container mx-auto py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
        <p className="text-muted-foreground mt-2">
          Visualize and monitor your key metrics in one place
        </p>
        <span className="mt-2 inline-block rounded bg-yellow-100 px-2 py-1 text-xs font-medium text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200">
          DEV MODE
        </span>
      </div>

      <DashboardClient
        initialDashboardMetrics={dashboardMetrics}
        autoTrigger={false}
      />
      <DashboardDebugPanel initialDashboardMetrics={dashboardMetrics} />
    </div>
  );
}
