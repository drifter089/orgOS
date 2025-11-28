import { HydrateClient, api } from "@/trpc/server";

import { SystemsCanvas } from "./_components/systems-canvas";

export default async function SystemsPage() {
  await api.dashboard.getAllDashboardMetricsWithCharts.prefetch();

  return (
    <HydrateClient>
      <SystemsCanvas />
    </HydrateClient>
  );
}
