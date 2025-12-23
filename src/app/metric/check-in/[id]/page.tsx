import { HydrateClient, api } from "@/trpc/server";

import { MetricCheckInClient } from "./_components/metric-check-in-client";

interface MetricCheckInPageProps {
  params: Promise<{ id: string }>;
}

export default async function MetricCheckInPage({
  params,
}: MetricCheckInPageProps) {
  const { id: metricId } = await params;

  // Prefetch the metric data
  await api.manualMetric.getById.prefetch({ metricId });

  return (
    <HydrateClient>
      <div className="container mx-auto max-w-4xl py-8">
        <MetricCheckInClient metricId={metricId} />
      </div>
    </HydrateClient>
  );
}
