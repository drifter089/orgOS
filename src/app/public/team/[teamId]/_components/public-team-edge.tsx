"use client";

import {
  BaseEdge,
  type Edge,
  type EdgeProps,
  getBezierPath,
  useInternalNode,
} from "@xyflow/react";

import { getFloatingEdgeParams } from "@/lib/canvas/edges/floating-edge-utils";

export type PublicTeamEdge = Edge;

export function PublicTeamEdge({
  id,
  source,
  target,
  style = {},
  markerEnd,
  selected,
}: EdgeProps<PublicTeamEdge>) {
  const sourceNode = useInternalNode(source);
  const targetNode = useInternalNode(target);

  if (!sourceNode || !targetNode) {
    return null;
  }

  const { sx, sy, tx, ty, sourcePos, targetPos } = getFloatingEdgeParams(
    sourceNode,
    targetNode,
  );

  const [edgePath] = getBezierPath({
    sourceX: sx,
    sourceY: sy,
    sourcePosition: sourcePos,
    targetX: tx,
    targetY: ty,
    targetPosition: targetPos,
  });

  return (
    <BaseEdge
      id={id}
      path={edgePath}
      markerEnd={markerEnd}
      style={{
        ...style,
        stroke: "#b1b1b7",
        strokeWidth: selected ? 2 : 1.5,
      }}
    />
  );
}
