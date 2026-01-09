"use client";

import { GoalsBarChart } from "@/components/charts";

interface MemberGoalsChartProps {
  metricIds: string[];
}

export function MemberGoalsChart({ metricIds }: MemberGoalsChartProps) {
  return <GoalsBarChart metricIds={metricIds} showHeader={true} />;
}
