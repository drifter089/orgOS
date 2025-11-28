import { HydrateClient, api } from "@/trpc/server";

import { DefaultDashboardClient } from "./_components/default-dashboard-client";

export default async function DefaultDashboardPage() {
  await api.dashboard.getAllDashboardMetricsWithCharts.prefetch();

  return (
    <HydrateClient>
      <DefaultDashboardClient />
    </HydrateClient>
  );
}
