import { HydrateClient, api } from "@/trpc/server";

import { SystemsCanvas } from "./_components/systems-canvas";
import { SystemsStoreProvider } from "./store/systems-store";

export default async function SystemsPage() {
  await api.dashboard.getAllDashboardMetricsWithCharts.prefetch();

  return (
    <HydrateClient>
      <SystemsStoreProvider>
        <div className="flex h-screen w-full overflow-hidden">
          <div className="relative h-full w-full flex-1 overflow-hidden">
            <SystemsCanvas />
          </div>
        </div>
      </SystemsStoreProvider>
    </HydrateClient>
  );
}
