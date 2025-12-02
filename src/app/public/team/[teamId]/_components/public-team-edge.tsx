"use client";

import {
  BaseEdge,
  type Edge,
  type EdgeProps,
  getBezierPath,
} from "@xyflow/react";

export type PublicTeamEdge = Edge;

/**
 * Read-only version of TeamEdge
 * No add/delete buttons, just the edge line
 */
export function PublicTeamEdge({
  id,
  sourceX,
  sourceY,
  targetX,
  targetY,
  sourcePosition,
  targetPosition,
  style = {},
  markerEnd,
  selected,
}: EdgeProps<PublicTeamEdge>) {
  const [edgePath] = getBezierPath({
    sourceX,
    sourceY,
    sourcePosition,
    targetX,
    targetY,
    targetPosition,
  });

  return (
    <BaseEdge
      id={id}
      path={edgePath}
      markerEnd={markerEnd}
      style={{
        ...style,
        strokeWidth: selected ? 2 : 1.5,
      }}
    />
  );
}
