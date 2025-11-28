"use client";

import { memo } from "react";

import { Handle, type Node, type NodeProps, Position } from "@xyflow/react";

import { DashboardMetricCard } from "@/app/dashboard/[teamId]/_components/dashboard-metric-card";
import { cn } from "@/lib/utils";
import type { RouterOutputs } from "@/trpc/react";

type DashboardMetrics = RouterOutputs["dashboard"]["getDashboardMetrics"];
type DashboardMetricWithRelations = DashboardMetrics[number];

export type MetricCardNodeData = {
  dashboardMetric: DashboardMetricWithRelations;
};

export type MetricCardNode = Node<MetricCardNodeData, "metricCard">;

const handleClassName = cn(
  "!bg-primary !border-background !h-3 !w-3 !border-2",
  "transition-transform hover:!scale-125",
);

function MetricCardNodeComponent({
  data,
  selected,
}: NodeProps<MetricCardNode>) {
  return (
    <div
      className={cn(
        "bg-card w-[500px] rounded-xl border-2 p-3 shadow-md",
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
        <DashboardMetricCard dashboardMetric={data.dashboardMetric} />
      </div>
    </div>
  );
}

export const MetricCardNode = memo(MetricCardNodeComponent);
