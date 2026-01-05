"use client";

import { memo } from "react";

import {
  Handle,
  type Node,
  type NodeProps,
  NodeResizer,
  Position,
} from "@xyflow/react";

import {
  DashboardMetricCard,
  ReadOnlyMetricCard,
} from "@/app/dashboard/[teamId]/_components/dashboard-metric-card";
import { cn } from "@/lib/utils";
import type { RouterOutputs } from "@/trpc/react";

type DashboardMetrics = RouterOutputs["dashboard"]["getDashboardCharts"];
type DashboardMetricWithRelations = DashboardMetrics[number];

// Public view uses a different but compatible type from publicView router
type PublicDashboardMetrics =
  RouterOutputs["publicView"]["getDashboardByShareToken"]["dashboardCharts"];
type PublicDashboardMetric = PublicDashboardMetrics[number];

export type ChartNodeData = {
  dashboardMetricId: string;
  /** Team ID for cache queries */
  teamId: string;
  /** Dashboard metric data - required for private view, optional if using override */
  dashboardMetric?: DashboardMetricWithRelations;
  /** Pre-fetched metric data for public views */
  dashboardMetricOverride?: PublicDashboardMetric;
  /** When true, hides edit controls (for public views) */
  readOnly?: boolean;
};

export type ChartNode = Node<ChartNodeData, "chart-node">;

const handleClassName = cn(
  "!bg-primary !border-background !h-3 !w-3 !border-2",
  "transition-transform hover:!scale-125",
);

const MIN_WIDTH = 400;
const MIN_HEIGHT = 200;

function ChartNodeComponent({ data, selected }: NodeProps<ChartNode>) {
  // Use override data if provided (public view), otherwise use direct data (private view)
  const dashboardMetric = data.dashboardMetricOverride ?? data.dashboardMetric;

  const isReadOnly = data.readOnly;

  // Fallback UI when metric not found
  if (!dashboardMetric) {
    return (
      <div
        className={cn(
          "bg-card h-full w-full rounded-xl border-2 p-6 shadow-md",
          selected && "ring-primary ring-2 ring-offset-2",
        )}
      >
        {!isReadOnly && (
          <NodeResizer
            isVisible={selected}
            minWidth={MIN_WIDTH}
            minHeight={MIN_HEIGHT}
            lineClassName="!border-primary/40"
            handleClassName="!h-2 !w-2 !rounded-full !border-primary/60 !bg-background"
          />
        )}
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
        "bg-card h-full w-full rounded-xl border-2 p-3 shadow-md",
        "transition-shadow hover:shadow-lg",
        selected && "ring-primary ring-2 ring-offset-2",
      )}
    >
      {!isReadOnly && (
        <NodeResizer
          isVisible={selected}
          minWidth={MIN_WIDTH}
          minHeight={MIN_HEIGHT}
          lineClassName="!border-primary/40"
          handleClassName="!h-2 !w-2 !rounded-full !border-primary/60 !bg-background"
        />
      )}
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

      <div className="h-full overflow-hidden rounded-lg">
        {isReadOnly ? (
          <ReadOnlyMetricCard dashboardChart={dashboardMetric} />
        ) : (
          <DashboardMetricCard
            dashboardChart={dashboardMetric}
            teamId={data.teamId}
          />
        )}
      </div>
    </div>
  );
}

export const ChartNodeMemo = memo(ChartNodeComponent);
