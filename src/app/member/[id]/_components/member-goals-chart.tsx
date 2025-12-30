"use client";

import { GoalsRadarChart } from "@/components/charts";

interface MemberGoalsChartProps {
  metricIds: string[];
}

export function MemberGoalsChart({ metricIds }: MemberGoalsChartProps) {
  return <GoalsRadarChart metricIds={metricIds} showHeader={true} />;
}
