"use client";

import { KpiCard } from "@/components/metric/kpi-card";
import { RoleCard, type RoleCardData } from "@/components/role/role-card";
import { cn } from "@/lib/utils";
import { type RouterOutputs } from "@/trpc/react";

type Role = RouterOutputs["role"]["getByUser"][number];
type DashboardChart = RouterOutputs["dashboard"]["getDashboardCharts"][number];

interface RoleKpiPairProps {
  role: Role;
  dashboardChart?: DashboardChart;
  teamId: string;
}

export function RoleKpiPair({
  role,
  dashboardChart,
  teamId,
}: RoleKpiPairProps) {
  const roleCardData: RoleCardData = {
    id: role.id,
    title: role.title,
    purpose: role.purpose,
    color: role.color ?? "#3b82f6",
    effortPoints: role.effortPoints,
    assignedUserId: role.assignedUserId,
    assignedUserName: role.assignedUserName,
    metric: role.metric
      ? {
          name: role.metric.name,
          dashboardCharts: role.metric.dashboardCharts,
        }
      : null,
  };

  const hasKpi = !!dashboardChart;
  const hasMetricButNoChart = !!role.metricId && !dashboardChart;

  return (
    <div
      className={cn(
        "grid items-stretch gap-3",
        hasKpi || hasMetricButNoChart
          ? "grid-cols-1 lg:grid-cols-2"
          : "grid-cols-1",
      )}
    >
      <RoleCard role={roleCardData} readOnly className="h-full" />

      {hasKpi && (
        <KpiCard
          dashboardChart={dashboardChart}
          teamId={teamId}
          showSettings={false}
          enableDragDrop={false}
        />
      )}

      {hasMetricButNoChart && (
        <div className="border-border/60 text-muted-foreground flex items-center justify-center rounded-lg border border-dashed p-6">
          <span className="text-sm">KPI data loading...</span>
        </div>
      )}
    </div>
  );
}
