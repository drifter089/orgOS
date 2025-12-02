import type { Edge } from "@xyflow/react";

import {
  type Points,
  type StoredEdge,
  type StoredNode,
  type TextNodeFontSize,
} from "@/lib/canvas";

import type { SystemsNode } from "../store/systems-store";

// Re-export shared types for convenience
export type { StoredEdge, StoredNode };

/**
 * Systems-specific stored node data shape.
 */
export type SystemsStoredNodeData = {
  // For freehand nodes
  points?: Points;
  initialSize?: { width: number; height: number };
  // For text nodes
  text?: string;
  fontSize?: TextNodeFontSize;
};

/**
 * Systems-specific stored node (position + optional freehand data).
 */
export type SystemsStoredNode = {
  id: string;
  type?: string;
  position: { x: number; y: number };
  data?: SystemsStoredNodeData;
  style?: { width?: number; height?: number };
};

export function serializeNodes(nodes: SystemsNode[]): SystemsStoredNode[] {
  return nodes.map((node) => {
    // Handle freehand node type
    if (node.type === "freehand") {
      const freehandData = node.data;
      return {
        id: node.id,
        type: node.type,
        position: node.position,
        data: {
          points: freehandData.points,
          initialSize: freehandData.initialSize,
        },
        style:
          node.width && node.height
            ? { width: node.width, height: node.height }
            : undefined,
      };
    }

    // Handle text node type
    if (node.type === "text-node") {
      const textData = node.data;
      return {
        id: node.id,
        type: node.type,
        position: node.position,
        data: {
          text: textData.text,
          fontSize: textData.fontSize,
        },
        style: node.style as { width?: number; height?: number } | undefined,
      };
    }

    // Handle metricCard node (just position)
    return {
      id: node.id,
      position: node.position,
    };
  });
}

export function serializeEdges(edges: Edge[]): StoredEdge[] {
  return edges.map((edge) => ({
    id: edge.id,
    source: edge.source,
    target: edge.target,
    sourceHandle: edge.sourceHandle,
    targetHandle: edge.targetHandle,
    type: edge.type,
    animated: edge.animated,
  }));
}
