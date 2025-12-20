"use client";

import { memo } from "react";

import { Handle, type Node, type NodeProps, Position } from "@xyflow/react";

import { DashboardMetricCard } from "@/app/dashboard/[teamId]/_components/dashboard-metric-card";
import { cn } from "@/lib/utils";

import { usePublicView } from "../../../_context/public-view-context";

export type PublicChartNodeData = {
  dashboardMetricId: string;
};

export type PublicChartNode = Node<PublicChartNodeData, "chart-node">;

const handleClassName = cn(
  "!bg-primary !border-background !h-3 !w-3 !border-2",
  "transition-transform hover:!scale-125",
);

function PublicChartNodeComponent({
  data,
  selected,
}: NodeProps<PublicChartNode>) {
  const { dashboard } = usePublicView();

  const dashboardMetric = dashboard?.dashboardCharts.find(
    (chart) => chart.id === data.dashboardMetricId,
  );

  if (!dashboardMetric) {
    return (
      <div
        className={cn(
          "bg-card w-[750px] rounded-xl border-2 p-6 shadow-md",
          selected && "ring-primary ring-2 ring-offset-2",
        )}
      >
        <Handle
          type="target"
          position={Position.Top}
          id="top"
          className={handleClassName}
        />
        <Handle
          type="source"
          position={Position.Right}
          id="right"
          className={handleClassName}
        />
        <Handle
          type="source"
          position={Position.Bottom}
          id="bottom"
          className={handleClassName}
        />
        <Handle
          type="target"
          position={Position.Left}
          id="left"
          className={handleClassName}
        />
        <p className="text-muted-foreground text-center text-sm">
          Chart not available
        </p>
      </div>
    );
  }

  return (
    <div
      className={cn(
        "bg-card w-[750px] rounded-xl border-2 p-3 shadow-md",
        "transition-shadow hover:shadow-lg",
        selected && "ring-primary ring-2 ring-offset-2",
      )}
    >
      <Handle
        type="target"
        position={Position.Top}
        id="top"
        className={handleClassName}
      />
      <Handle
        type="source"
        position={Position.Right}
        id="right"
        className={handleClassName}
      />
      <Handle
        type="source"
        position={Position.Bottom}
        id="bottom"
        className={handleClassName}
      />
      <Handle
        type="target"
        position={Position.Left}
        id="left"
        className={handleClassName}
      />

      <div className="overflow-hidden rounded-lg">
        <DashboardMetricCard dashboardMetric={dashboardMetric} readOnly />
      </div>
    </div>
  );
}

export const PublicChartNodeMemo = memo(PublicChartNodeComponent);
