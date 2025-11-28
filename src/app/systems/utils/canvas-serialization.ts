import type { Edge } from "@xyflow/react";

import type { MetricCardNode } from "../_components/metric-card-node";

export type StoredNode = {
  id: string;
  position: { x: number; y: number };
};

export type StoredEdge = {
  id: string;
  source: string;
  target: string;
  sourceHandle?: string | null;
  targetHandle?: string | null;
  type?: string;
  animated?: boolean;
};

export function serializeNodes(nodes: MetricCardNode[]): StoredNode[] {
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
