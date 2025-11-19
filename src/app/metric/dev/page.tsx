import { notFound } from "next/navigation";

import { isDevMode } from "@/lib/dev-mode";
import { api } from "@/trpc/server";

import { MetricClient } from "../_components/metric-client";
import { MetricDebugPanel } from "./debug-panel";

export default async function MetricDevPage() {
  if (!isDevMode()) {
    notFound();
  }

  const [metrics, integrations] = await Promise.all([
    api.metric.getAll(),
    api.integration.listWithStats(),
  ]);

  return (
    <div className="container mx-auto max-w-7xl space-y-6 p-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Metrics</h1>
          <p className="text-muted-foreground mt-1">
            Track and manage your organization&apos;s key performance indicators
          </p>
          <span className="mt-2 inline-block rounded bg-yellow-100 px-2 py-1 text-xs font-medium text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200">
            DEV MODE
          </span>
        </div>
      </div>

      <MetricClient
        initialMetrics={metrics}
        initialIntegrations={integrations}
      />

      <MetricDebugPanel
        initialMetrics={metrics}
        initialIntegrations={integrations}
      />
    </div>
  );
}
