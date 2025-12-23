"use client";

import { BaseMetricCheckInForm } from "@/app/metric/_components/base-metric-check-in-form";
import type { Cadence } from "@/lib/metrics/periods";
import type { RouterOutputs } from "@/trpc/react";
import { api } from "@/trpc/react";

type ManualMetricsForUser = RouterOutputs["manualMetric"]["getForUser"];
type MetricWithDataPoints = ManualMetricsForUser["weekly"][number]["metric"];

interface MetricCheckInCardProps {
  metric: MetricWithDataPoints;
  role: {
    id: string;
    title: string;
    team: { id: string; name: string };
  };
  cadence: Cadence;
}

export function MetricCheckInCard({
  metric,
  role,
  cadence,
}: MetricCheckInCardProps) {
  const utils = api.useUtils();

  const handleSuccess = async () => {
    await utils.manualMetric.getForUser.invalidate();
  };

  return (
    <BaseMetricCheckInForm
      metric={metric}
      cadence={cadence}
      role={role}
      onSuccess={handleSuccess}
    />
  );
}
