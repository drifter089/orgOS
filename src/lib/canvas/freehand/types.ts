import type { Node } from "@xyflow/react";

/**
 * Points array for freehand drawing.
 * Each point is [x, y, pressure] where pressure is from pointer events.
 */
export type Points = [number, number, number][];

/**
 * Data stored in a freehand node.
 */
export type FreehandNodeData = {
  points: Points;
  initialSize: { width: number; height: number };
};

/**
 * Freehand node type for React Flow.
 */
export type FreehandNode = Node<FreehandNodeData, "freehand">;
