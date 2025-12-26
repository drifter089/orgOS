"use client";

import { type GoalData, GoalsRadarChart } from "@/components/charts";

export type { GoalData };

interface MemberGoalsChartProps {
  goalsData: GoalData[];
}

export function MemberGoalsChart({ goalsData }: MemberGoalsChartProps) {
  return <GoalsRadarChart goalsData={goalsData} showHeader={true} />;
}
