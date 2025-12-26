import { type InternalNode, type Node, Position } from "@xyflow/react";

type NodeWithInternals = InternalNode<Node>;

function getNodeCenter(node: NodeWithInternals): { x: number; y: number } {
  return {
    x: node.internals.positionAbsolute.x + (node.measured?.width ?? 0) / 2,
    y: node.internals.positionAbsolute.y + (node.measured?.height ?? 0) / 2,
  };
}

function getHandleCoordsByPosition(
  node: NodeWithInternals,
  handlePosition: Position,
): [number, number] {
  // Check both source and target handles - chart nodes use target handles for incoming connections
  const sourceHandles = node.internals.handleBounds?.source ?? [];
  const targetHandles = node.internals.handleBounds?.target ?? [];
  const allHandles = [...sourceHandles, ...targetHandles];

  if (allHandles.length === 0) {
    return [
      node.internals.positionAbsolute.x,
      node.internals.positionAbsolute.y,
    ];
  }

  const handle = allHandles.find((h) => h.position === handlePosition);
  if (!handle) {
    return [
      node.internals.positionAbsolute.x + (node.measured?.width ?? 0) / 2,
      node.internals.positionAbsolute.y + (node.measured?.height ?? 0) / 2,
    ];
  }

  let offsetX = handle.width / 2;
  let offsetY = handle.height / 2;

  switch (handlePosition) {
    case Position.Left:
      offsetX = 0;
      break;
    case Position.Right:
      offsetX = handle.width;
      break;
    case Position.Top:
      offsetY = 0;
      break;
    case Position.Bottom:
      offsetY = handle.height;
      break;
  }

  const x = node.internals.positionAbsolute.x + handle.x + offsetX;
  const y = node.internals.positionAbsolute.y + handle.y + offsetY;

  return [x, y];
}

function getParams(
  nodeA: NodeWithInternals,
  nodeB: NodeWithInternals,
): [number, number, Position] {
  const centerA = getNodeCenter(nodeA);
  const centerB = getNodeCenter(nodeB);

  const horizontalDiff = Math.abs(centerA.x - centerB.x);
  const verticalDiff = Math.abs(centerA.y - centerB.y);

  let position: Position;

  if (horizontalDiff > verticalDiff) {
    position = centerA.x > centerB.x ? Position.Left : Position.Right;
  } else {
    position = centerA.y > centerB.y ? Position.Top : Position.Bottom;
  }

  const [x, y] = getHandleCoordsByPosition(nodeA, position);
  return [x, y, position];
}

export interface FloatingEdgeParams {
  sx: number;
  sy: number;
  tx: number;
  ty: number;
  sourcePos: Position;
  targetPos: Position;
}

export function getFloatingEdgeParams(
  source: NodeWithInternals,
  target: NodeWithInternals,
): FloatingEdgeParams {
  const [sx, sy, sourcePos] = getParams(source, target);
  const [tx, ty, targetPos] = getParams(target, source);

  return {
    sx,
    sy,
    tx,
    ty,
    sourcePos,
    targetPos,
  };
}
