import type { Edge } from "@xyflow/react";

import { type StoredEdge, type StoredNode } from "@/lib/canvas";

import type { MetricCardNode } from "../_components/metric-card-node";

// Re-export shared types for convenience
export type { StoredEdge, StoredNode };

/**
 * Systems-specific stored node (just position, no data needed).
 */
export type SystemsStoredNode = {
  id: string;
  position: { x: number; y: number };
};

export function serializeNodes(nodes: MetricCardNode[]): SystemsStoredNode[] {
  return nodes.map((node) => ({
    id: node.id,
    position: node.position,
  }));
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
