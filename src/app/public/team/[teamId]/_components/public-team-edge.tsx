"use client";

import {
  BaseEdge,
  type Edge,
  type EdgeProps,
  Position,
  getBezierPath,
  useInternalNode,
} from "@xyflow/react";

export type PublicTeamEdge = Edge;

const NODE_DIMENSIONS: Record<string, { width: number; height: number }> = {
  "role-node": { width: 320, height: 160 },
  "text-node": { width: 180, height: 60 },
};

const DEFAULT_DIMENSIONS = { width: 200, height: 100 };

function getNodeDimensions(nodeType: string | undefined): {
  width: number;
  height: number;
} {
  if (nodeType && nodeType in NODE_DIMENSIONS) {
    return NODE_DIMENSIONS[nodeType]!;
  }
  return DEFAULT_DIMENSIONS;
}

function getFloatingParams(
  sourceNode: { x: number; y: number; width: number; height: number },
  targetNode: { x: number; y: number; width: number; height: number },
) {
  const sourceCenter = {
    x: sourceNode.x + sourceNode.width / 2,
    y: sourceNode.y + sourceNode.height / 2,
  };
  const targetCenter = {
    x: targetNode.x + targetNode.width / 2,
    y: targetNode.y + targetNode.height / 2,
  };

  const horizontalDiff = Math.abs(sourceCenter.x - targetCenter.x);
  const verticalDiff = Math.abs(sourceCenter.y - targetCenter.y);

  let sourcePos: Position;
  let targetPos: Position;
  let sx: number;
  let sy: number;
  let tx: number;
  let ty: number;

  if (horizontalDiff > verticalDiff) {
    if (sourceCenter.x < targetCenter.x) {
      sourcePos = Position.Right;
      targetPos = Position.Left;
      sx = sourceNode.x + sourceNode.width;
      tx = targetNode.x;
    } else {
      sourcePos = Position.Left;
      targetPos = Position.Right;
      sx = sourceNode.x;
      tx = targetNode.x + targetNode.width;
    }
    sy = sourceCenter.y;
    ty = targetCenter.y;
  } else {
    if (sourceCenter.y < targetCenter.y) {
      sourcePos = Position.Bottom;
      targetPos = Position.Top;
      sy = sourceNode.y + sourceNode.height;
      ty = targetNode.y;
    } else {
      sourcePos = Position.Top;
      targetPos = Position.Bottom;
      sy = sourceNode.y;
      ty = targetNode.y + targetNode.height;
    }
    sx = sourceCenter.x;
    tx = targetCenter.x;
  }

  return { sx, sy, tx, ty, sourcePos, targetPos };
}

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

  const sourceDimensions = getNodeDimensions(sourceNode.type);
  const targetDimensions = getNodeDimensions(targetNode.type);

  const sourceRect = {
    x: sourceNode.internals.positionAbsolute.x,
    y: sourceNode.internals.positionAbsolute.y,
    width: sourceNode.measured?.width ?? sourceDimensions.width,
    height: sourceNode.measured?.height ?? sourceDimensions.height,
  };

  const targetRect = {
    x: targetNode.internals.positionAbsolute.x,
    y: targetNode.internals.positionAbsolute.y,
    width: targetNode.measured?.width ?? targetDimensions.width,
    height: targetNode.measured?.height ?? targetDimensions.height,
  };

  const { sx, sy, tx, ty, sourcePos, targetPos } = getFloatingParams(
    sourceRect,
    targetRect,
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
