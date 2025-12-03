import type { Edge } from "@xyflow/react";

import {
  type StoredEdge,
  type StoredNode,
  type TextNodeFontSize,
} from "@/lib/canvas";

import type { SystemsNode } from "../store/systems-store";

// Re-export shared types for convenience
export type { StoredEdge, StoredNode };

/**
 * Systems-specific stored node data shape.
 * NOTE: Freehand data is not included - drawings are session-only
 */
export type SystemsStoredNodeData = {
  // For text nodes
  text?: string;
  fontSize?: TextNodeFontSize;
};

/**
 * Systems-specific stored node (position + optional text data).
 */
export type SystemsStoredNode = {
  id: string;
  type?: string;
  position: { x: number; y: number };
  data?: SystemsStoredNodeData;
  style?: { width?: number; height?: number };
};

/**
 * Serialize SystemsNodes to StoredNodes for database storage
 * NOTE: Freehand nodes are excluded - drawings are session-only and not persisted
 */
export function serializeNodes(nodes: SystemsNode[]): SystemsStoredNode[] {
  return nodes
    .filter((node) => node.type !== "freehand") // Exclude freehand nodes from persistence
    .map((node) => {
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
