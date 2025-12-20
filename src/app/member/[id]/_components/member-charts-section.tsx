"use client";

import type { RouterOutputs } from "@/trpc/react";

import { MemberEffortChart } from "./member-effort-chart";
import { MemberGoalsChart } from "./member-goals-chart";

type Role = RouterOutputs["role"]["getByUser"][number];
type DashboardMetrics = RouterOutputs["dashboard"]["getDashboardCharts"];

interface MemberChartsSectionProps {
  roles: Role[];
  totalEffortPoints: number;
  chartsByMetricId: Map<string, DashboardMetrics[number]>;
}

export function MemberChartsSection({
  roles,
  totalEffortPoints,
  chartsByMetricId,
}: MemberChartsSectionProps) {
  const goalsData = roles
    .filter((role) => {
      if (!role.metricId) return false;
      const chart = chartsByMetricId.get(role.metricId);
      return chart?.goalProgress != null;
    })
    .map((role) => {
      const chart = chartsByMetricId.get(role.metricId!)!;
      return {
        goalName: chart.metric.name ?? role.metric?.name ?? "Unknown",
        progressPercent: chart.goalProgress!.progressPercent,
        status: chart.goalProgress!.status,
      };
    });

  const hasEffortData = roles.some(
    (role) => role.effortPoints && role.effortPoints > 0,
  );
  const hasGoalsData = goalsData.length > 0;

  if (!hasEffortData && !hasGoalsData) {
    return null;
  }

  return (
    <div className="grid gap-4 md:grid-cols-2">
      <MemberEffortChart roles={roles} totalEffortPoints={totalEffortPoints} />
      <MemberGoalsChart goalsData={goalsData} />
    </div>
  );
}
