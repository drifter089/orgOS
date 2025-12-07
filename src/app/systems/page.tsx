import { HydrateClient, api } from "@/trpc/server";

import { SystemsCanvasWrapper } from "./_components/systems-canvas-wrapper";
import { SystemsStoreProvider } from "./store/systems-store";
import type { StoredEdge, StoredNode } from "./utils/canvas-serialization";

export default async function SystemsPage() {
  const [dashboardCharts, canvasState] = await Promise.all([
    api.dashboard.getAllDashboardChartsWithData(),
    api.systemsCanvas.get(),
  ]);

  const savedNodes = (canvasState?.reactFlowNodes ?? []) as StoredNode[];
  const savedEdges = (canvasState?.reactFlowEdges ?? []) as StoredEdge[];

  if (dashboardCharts.length === 0) {
    return (
      <div className="flex h-screen w-full items-center justify-center">
        <p className="text-muted-foreground">
          No metrics with chart data found. Add metrics from the dashboard
          first.
        </p>
      </div>
    );
  }

  return (
    <HydrateClient>
      <SystemsStoreProvider>
        <div className="flex h-screen w-full overflow-hidden">
          <div className="relative h-full w-full flex-1 overflow-hidden">
            <SystemsCanvasWrapper
              dashboardCharts={dashboardCharts}
              savedNodes={savedNodes}
              savedEdges={savedEdges}
            />
          </div>
        </div>
      </SystemsStoreProvider>
    </HydrateClient>
  );
}
