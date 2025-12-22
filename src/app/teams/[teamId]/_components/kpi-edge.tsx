"use client";

import { useCallback, useId } from "react";

import {
  BaseEdge,
  type Edge,
  type EdgeProps,
  getBezierPath,
  useInternalNode,
} from "@xyflow/react";

import { EdgeActionButtons, getFloatingEdgeParams } from "@/lib/canvas";

import { useTeamStore, useTeamStoreApi } from "../store/team-store";
import { type KpiEdgeData } from "../types/canvas";

export type KpiEdge = Edge<KpiEdgeData, "kpi-edge">;

/**
 * KPI Edge component for role-metric connections.
 * Features an animated gradient effect to visually distinguish from regular edges.
 * Backend sync is handled externally via the useRoleMetricSync hook.
 */
export function KpiEdge({
  id,
  source,
  target,
  style = {},
  selected,
  data,
}: EdgeProps<KpiEdge>) {
  const gradientId = useId();
  const sourceNode = useInternalNode(source);
  const targetNode = useInternalNode(target);

  const storeApi = useTeamStoreApi();
  const setEdges = useTeamStore((state) => state.setEdges);
  const markDirty = useTeamStore((state) => state.markDirty);

  const handleDeleteEdge = useCallback(() => {
    const currentEdges = storeApi.getState().edges;
    setEdges(currentEdges.filter((e) => e.id !== id));
    markDirty();
    // Backend sync (unassign metric) is handled by useRoleMetricSync
  }, [storeApi, id, setEdges, markDirty]);

  if (!sourceNode || !targetNode) {
    return null;
  }

  // Determine direction: arrow should always point from role-node TO chart-node
  // Swap nodes if source is chart-node so arrow points correctly
  const sourceIsChart = sourceNode.type === "chart-node";
  const fromNode = sourceIsChart ? targetNode : sourceNode;
  const toNode = sourceIsChart ? sourceNode : targetNode;

  // Calculate floating edge path (from role to chart)
  const { sx, sy, tx, ty, sourcePos, targetPos } = getFloatingEdgeParams(
    fromNode,
    toNode,
  );
  const [edgePath, labelX, labelY] = getBezierPath({
    sourceX: sx,
    sourceY: sy,
    sourcePosition: sourcePos,
    targetX: tx,
    targetY: ty,
    targetPosition: targetPos,
  });

  const isReadOnly = data?.readOnly ?? false;

  const markerId = `${gradientId}-marker`;

  return (
    <>
      {/* Animated gradient and arrow marker definitions */}
      <defs>
        <linearGradient
          id={gradientId}
          gradientUnits="userSpaceOnUse"
          x1={sx}
          y1={sy}
          x2={tx}
          y2={ty}
        >
          <stop offset="0%" stopColor="hsl(var(--primary))" stopOpacity="0.3">
            <animate
              attributeName="stop-opacity"
              values="0.3;0.8;0.3"
              dur="2s"
              repeatCount="indefinite"
            />
          </stop>
          <stop offset="50%" stopColor="hsl(var(--primary))" stopOpacity="1">
            <animate
              attributeName="offset"
              values="0.3;0.5;0.7;0.5;0.3"
              dur="2s"
              repeatCount="indefinite"
            />
          </stop>
          <stop offset="100%" stopColor="hsl(var(--primary))" stopOpacity="0.3">
            <animate
              attributeName="stop-opacity"
              values="0.3;0.8;0.3"
              dur="2s"
              repeatCount="indefinite"
            />
          </stop>
        </linearGradient>
        {/* Arrow marker for KPI edge (Role → Chart direction) */}
        <marker
          id={markerId}
          viewBox="0 0 10 10"
          refX="10"
          refY="5"
          markerWidth="6"
          markerHeight="6"
          orient="auto-start-reverse"
        >
          <path d="M 0 0 L 10 5 L 0 10 z" fill="hsl(var(--primary))" />
        </marker>
      </defs>

      {/* Glow effect layer (behind main edge) */}
      <BaseEdge
        id={`${id}-glow`}
        path={edgePath}
        style={{
          stroke: "hsl(var(--primary))",
          strokeWidth: selected ? 8 : 6,
          strokeOpacity: 0.2,
          filter: "blur(4px)",
          pointerEvents: "none",
        }}
      />

      {/* Main edge with animated gradient and arrow */}
      <BaseEdge
        id={id}
        path={edgePath}
        markerEnd={`url(#${markerId})`}
        style={{
          ...style,
          stroke: `url(#${gradientId})`,
          strokeWidth: selected ? 3 : 2.5,
          pointerEvents: "auto",
        }}
      />

      {!isReadOnly && (
        <EdgeActionButtons
          labelX={labelX}
          labelY={labelY}
          selected={selected}
          onDelete={handleDeleteEdge}
          showAdd={false}
          deleteTitle="Disconnect metric from role"
        />
      )}
    </>
  );
}
