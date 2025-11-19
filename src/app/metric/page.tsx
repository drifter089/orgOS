import { api } from "@/trpc/server";

import { MetricClient } from "./_components/metric-client";

export default async function MetricPage() {
  // Prefetch data on server for instant page load
  const [metrics, integrations] = await Promise.all([
    api.metric.getAll(),
    api.integration.listWithStats(),
  ]);

  return (
    <div className="container mx-auto max-w-7xl space-y-6 p-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Metrics</h1>
          <p className="text-muted-foreground mt-1">
            Track and manage your organization&apos;s key performance indicators
          </p>
        </div>
      </div>

      <MetricClient
        initialMetrics={metrics}
        initialIntegrations={integrations}
      />
    </div>
  );
}
