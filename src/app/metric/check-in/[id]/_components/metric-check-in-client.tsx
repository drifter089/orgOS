"use client";

import { BaseMetricCheckInForm } from "@/app/metric/_components/base-metric-check-in-form";
import type { Cadence } from "@/lib/metrics/periods";
import { api } from "@/trpc/react";

interface MetricCheckInClientProps {
  metricId: string;
}

export function MetricCheckInClient({ metricId }: MetricCheckInClientProps) {
  const {
    data: metric,
    isLoading,
    error,
  } = api.metric.getManualMetricById.useQuery({ metricId });

  const utils = api.useUtils();

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="space-y-2">
          <div className="bg-muted h-8 w-48 animate-pulse rounded" />
          <div className="bg-muted h-4 w-64 animate-pulse rounded" />
        </div>
        <div className="bg-muted h-48 animate-pulse rounded-lg" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center">
        <p className="text-destructive">Failed to load metric</p>
        <p className="text-muted-foreground text-sm">{error.message}</p>
      </div>
    );
  }

  if (!metric) {
    return (
      <div className="py-12 text-center">
        <h2 className="text-xl font-semibold">Metric not found</h2>
        <p className="text-muted-foreground mt-2">
          This metric does not exist or you don&apos;t have access to it.
        </p>
      </div>
    );
  }

  const config = metric.endpointConfig as {
    type?: string;
    unitType?: string;
    cadence?: string;
  } | null;
  const cadence = (config?.cadence ?? "weekly") as Cadence;
  const role = metric.roles[0] ?? null;

  const handleSuccess = async () => {
    await utils.metric.getManualMetricById.invalidate();
  };

  return (
    <div className="space-y-8">
      <div className="space-y-1">
        <h1 className="text-2xl font-bold">check-in</h1>
        <p className="text-muted-foreground">
          update {metric.name} for this period
        </p>
      </div>

      <BaseMetricCheckInForm
        metric={metric}
        cadence={cadence}
        role={role}
        onSuccess={handleSuccess}
      />
    </div>
  );
}
