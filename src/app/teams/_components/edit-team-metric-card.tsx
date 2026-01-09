"use client";

import { type DashboardChart } from "@/app/metric/_components";
import { KpiCard } from "@/components/metric/kpi-card";

interface EditTeamMetricCardProps {
  dashboardChart: DashboardChart;
  teamId: string;
}

export function EditTeamMetricCard({
  dashboardChart,
  teamId,
}: EditTeamMetricCardProps) {
  return <KpiCard dashboardChart={dashboardChart} teamId={teamId} />;
}
