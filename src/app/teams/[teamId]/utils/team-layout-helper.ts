import { type Edge } from "@xyflow/react";
import ELK, { type ElkNode } from "elkjs/lib/elk.bundled.js";

import { type TeamNode } from "../store/team-store";

// ELK layout configuration - same as workflow
const layoutOptions = {
  "elk.algorithm": "layered",
  "elk.direction": "DOWN",
  "elk.layered.spacing.edgeNodeBetweenLayers": "80",
  "elk.spacing.nodeNode": "150",
  "elk.layered.nodePlacement.strategy": "SIMPLE",
  "elk.separateConnectedComponents": "true",
  "elk.spacing.componentComponent": "150",
  "elk.layered.spacing.nodeNodeBetweenLayers": "100",
};

/**
 * Layout nodes in a simple grid when there are no connections
 */
function layoutNodesInGrid(nodes: TeamNode[]): TeamNode[] {
  const NODE_WIDTH = 280;
  const NODE_HEIGHT = 160;
  const SPACING = 120;
  const COLUMNS = 3;

  return nodes.map((node, index) => {
    const col = index % COLUMNS;
    const row = Math.floor(index / COLUMNS);

    return {
      ...node,
      position: {
        x: col * (NODE_WIDTH + SPACING),
        y: row * (NODE_HEIGHT + SPACING),
      },
    };
  });
}

/**
 * Layout team nodes using ELK (Eclipse Layout Kernel)
 * Based on workflow implementation but simplified for single-port nodes
 *
 * Key difference from workflow:
 * - Workflow nodes have multiple handles with IDs and use ports
 * - Team nodes have simple top/bottom handles without IDs, no ports needed
 */
export async function layoutTeamGraph(nodes: TeamNode[], edges: Edge[]) {
  // If there are no edges, layout all nodes in a simple grid
  if (edges.length === 0) {
    return layoutNodesInGrid(nodes);
  }

  const connectedNodes = new Set<string>();
  const elk = new ELK();

  // Fixed dimensions for role nodes (based on RoleNode component styling)
  const NODE_WIDTH = 280;
  const NODE_HEIGHT = 160;

  const graph: ElkNode = {
    id: "root",
    layoutOptions,
    edges: edges
      .filter((edge) => {
        // Validate that both source and target nodes exist
        const sourceExists = nodes.some((n) => n.id === edge.source);
        const targetExists = nodes.some((n) => n.id === edge.target);

        // Silently skip invalid edges (e.g., edges created during transitions)
        if (!sourceExists || !targetExists) {
          return false;
        }

        connectedNodes.add(edge.source);
        connectedNodes.add(edge.target);
        return true;
      })
      .map((edge) => {
        // CRITICAL: Team nodes don't have named handles/ports
        // React Flow's addEdge includes sourceHandle/targetHandle properties
        // We must explicitly create a clean edge object with ONLY id, sources, targets
        // Do NOT spread the edge object or ELK will try to use the handle properties
        return {
          id: edge.id,
          sources: [edge.source], // Just node ID, no handle reference
          targets: [edge.target], // Just node ID, no handle reference
        };
      }),
    // Only include connected nodes in layout (same as workflow)
    children: nodes.reduce<ElkNode[]>((acc, node) => {
      if (!connectedNodes.has(node.id)) {
        return acc;
      }

      acc.push({
        id: node.id,
        width: node.width ?? node.measured?.width ?? NODE_WIDTH,
        height: node.height ?? node.measured?.height ?? NODE_HEIGHT,
        // No ports needed - team nodes have simple top/bottom handles
      });
      return acc;
    }, []),
  };

  try {
    const elkNodes = await elk.layout(graph);
    const layoutedNodesMap = new Map(elkNodes.children?.map((n) => [n.id, n]));

    const layoutedNodes: TeamNode[] = nodes.map((node) => {
      const layoutedNode = layoutedNodesMap.get(node.id);

      // If layout was successful, use the new position
      if (layoutedNode?.x !== undefined && layoutedNode?.y !== undefined) {
        return {
          ...node,
          position: {
            x: layoutedNode.x,
            y: layoutedNode.y,
          },
        };
      }

      // Keep original position if layout failed for this node
      return node;
    });

    return layoutedNodes;
  } catch (error) {
    console.error("ELK layout failed:", error);
    // Fallback to grid layout if ELK fails
    return layoutNodesInGrid(nodes);
  }
}
