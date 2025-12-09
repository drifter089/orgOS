"use client";

import { DashboardSidebar } from "@/app/dashboard/[teamId]/_components/dashboard-sidebar";
import type { RouterOutputs } from "@/trpc/react";

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
