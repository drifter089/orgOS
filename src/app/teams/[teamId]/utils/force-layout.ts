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

import { type TeamEdge, type TeamNode } from "../store/team-store";

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
 * Run force-directed layout on team nodes
 * This runs the simulation to completion and returns final positions
 * (not continuous - runs once on button click)
 */
export function layoutTeamWithForce(
  nodes: TeamNode[],
  edges: TeamEdge[],
  options: ForceLayoutOptions = {},
): TeamNode[] {
  const { strength = -800, distance = 200, iterations = 300 } = options;

  if (nodes.length === 0) {
    return nodes;
  }

  const NODE_WIDTH = 280;
  const NODE_HEIGHT = 160;

  const avgX = nodes.reduce((sum, n) => sum + n.position.x, 0) / nodes.length;
  const avgY = nodes.reduce((sum, n) => sum + n.position.y, 0) / nodes.length;

  const simulationNodes: SimNodeType[] = nodes.map((node) => ({
    id: node.id,
    x: node.position.x,
    y: node.position.y,
    width: node.width ?? node.measured?.width ?? NODE_WIDTH,
    height: node.height ?? node.measured?.height ?? NODE_HEIGHT,
  }));

  const nodeMap = new Map(simulationNodes.map((n) => [n.id, n]));

  const simulationLinks: SimEdgeType[] = edges
    .filter((edge) => nodeMap.has(edge.source) && nodeMap.has(edge.target))
    .map((edge) => ({
      source: edge.source,
      target: edge.target,
    }));

  const collisionRadius = Math.max(NODE_WIDTH, NODE_HEIGHT) / 2 + 20;

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
