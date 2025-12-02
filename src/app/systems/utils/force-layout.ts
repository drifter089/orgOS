import {
  type SimulationLinkDatum,
  type SimulationNodeDatum,
  forceCollide,
  forceLink,
  forceManyBody,
  forceSimulation,
  forceX,
  forceY,
} from "d3-force";

import { type SystemsEdge, type SystemsNode } from "../store/systems-store";

type SimNodeType = SimulationNodeDatum & {
  id: string;
  width: number;
  height: number;
};

type SimEdgeType = SimulationLinkDatum<SimNodeType>;

type ForceLayoutOptions = {
  strength?: number;
  distance?: number;
  iterations?: number;
};

/**
 * Run force-directed layout on systems canvas nodes
 * This runs the simulation to completion and returns final positions
 * (not continuous - runs once on button click)
 */
export function layoutSystemsWithForce(
  nodes: SystemsNode[],
  edges: SystemsEdge[],
  options: ForceLayoutOptions = {},
): SystemsNode[] {
  const { strength = -1200, distance = 300, iterations = 300 } = options;

  if (nodes.length === 0) {
    return nodes;
  }

  // Default sizes for different node types
  const METRIC_CARD_WIDTH = 540;
  const METRIC_CARD_HEIGHT = 450;
  const TEXT_NODE_WIDTH = 180;
  const TEXT_NODE_HEIGHT = 60;
  const FREEHAND_DEFAULT_SIZE = 100;

  const avgX = nodes.reduce((sum, n) => sum + n.position.x, 0) / nodes.length;
  const avgY = nodes.reduce((sum, n) => sum + n.position.y, 0) / nodes.length;

  const simulationNodes: SimNodeType[] = nodes.map((node) => {
    let width: number;
    let height: number;

    if (node.type === "metricCard") {
      width = node.width ?? node.measured?.width ?? METRIC_CARD_WIDTH;
      height = node.height ?? node.measured?.height ?? METRIC_CARD_HEIGHT;
    } else if (node.type === "text-node") {
      width =
        (node.style?.width as number | undefined) ??
        node.width ??
        TEXT_NODE_WIDTH;
      height =
        (node.style?.height as number | undefined) ??
        node.height ??
        TEXT_NODE_HEIGHT;
    } else {
      // freehand node
      width = node.width ?? FREEHAND_DEFAULT_SIZE;
      height = node.height ?? FREEHAND_DEFAULT_SIZE;
    }

    return {
      id: node.id,
      x: node.position.x,
      y: node.position.y,
      width,
      height,
    };
  });

  const nodeMap = new Map(simulationNodes.map((n) => [n.id, n]));

  const simulationLinks: SimEdgeType[] = edges
    .filter((edge) => nodeMap.has(edge.source) && nodeMap.has(edge.target))
    .map((edge) => ({
      source: edge.source,
      target: edge.target,
    }));

  // Use larger collision radius for metric cards
  const maxNodeSize = Math.max(METRIC_CARD_WIDTH, METRIC_CARD_HEIGHT);
  const collisionRadius = maxNodeSize / 2 + 40;

  const simulation = forceSimulation<SimNodeType>(simulationNodes)
    .force("charge", forceManyBody().strength(strength))
    .force(
      "link",
      forceLink<SimNodeType, SimEdgeType>(simulationLinks)
        .id((d) => d.id)
        .distance(distance)
        .strength(0.3),
    )
    .force("x", forceX(avgX).strength(0.05))
    .force("y", forceY(avgY).strength(0.05))
    .force("collision", forceCollide(collisionRadius))
    .stop();

  for (let i = 0; i < iterations; i++) {
    simulation.tick();
  }

  const resultMap = new Map(simulationNodes.map((n) => [n.id, n]));

  return nodes.map((node) => {
    const simNode = resultMap.get(node.id);
    if (simNode && simNode.x !== undefined && simNode.y !== undefined) {
      return {
        ...node,
        position: {
          x: simNode.x,
          y: simNode.y,
        },
      };
    }
    return node;
  });
}
