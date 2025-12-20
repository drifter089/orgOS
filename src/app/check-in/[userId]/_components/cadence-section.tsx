"use client";

import type { Cadence } from "@/lib/metrics/periods";
import type { RouterOutputs } from "@/trpc/react";

import { MetricCheckInCard } from "./metric-check-in-card";

type ManualMetricsForUser = RouterOutputs["metric"]["getManualMetricsForUser"];
type MetricWithRole = ManualMetricsForUser["weekly"][number];

interface CadenceSectionProps {
  title: string;
  cadence: Cadence;
  metrics: MetricWithRole[];
}

export function CadenceSection({
  title,
  cadence,
  metrics,
}: CadenceSectionProps) {
  return (
    <section className="space-y-4">
      <h2 className="text-lg font-semibold">{title}</h2>
      <div className="space-y-6">
        {metrics.map(({ metric, role }) => (
          <MetricCheckInCard
            key={metric.id}
            metric={metric}
            role={role}
            cadence={cadence}
          />
        ))}
      </div>
    </section>
  );
}
