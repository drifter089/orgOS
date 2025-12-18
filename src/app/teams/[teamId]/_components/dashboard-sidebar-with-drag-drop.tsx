"use client";

import { useEffect } from "react";

import { DashboardSidebar } from "@/app/dashboard/[teamId]/_components/dashboard-sidebar";
import { type RouterOutputs, api } from "@/trpc/react";

import { useChartDragContext } from "../context/chart-drag-context";

type IntegrationsWithStats = RouterOutputs["integration"]["listWithStats"];

interface DashboardSidebarWithDragDropProps {
  teamId: string;
  initialIntegrations: IntegrationsWithStats;
}

export function DashboardSidebarWithDragDrop({
  teamId,
  initialIntegrations,
}: DashboardSidebarWithDragDropProps) {
  const { chartNodesOnCanvas, onToggleChartVisibility } = useChartDragContext();
  const utils = api.useUtils();

  // Prefetch sidebar data after page loads so it's ready when user opens sidebar
  useEffect(() => {
    void utils.dashboard.getDashboardCharts.prefetch({ teamId });
    void utils.metric.getByTeamId.prefetch({ teamId });
  }, [teamId, utils]);

  return (
    <DashboardSidebar
      teamId={teamId}
      initialIntegrations={initialIntegrations}
      side="left"
      enableDragDrop={true}
      chartNodesOnCanvas={chartNodesOnCanvas}
      onToggleChartVisibility={onToggleChartVisibility ?? undefined}
    />
  );
}
