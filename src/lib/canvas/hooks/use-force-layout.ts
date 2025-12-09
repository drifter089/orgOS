import { useEffect, useMemo, useRef } from "react";

import {
  type Node,
  type ReactFlowProps,
  type ReactFlowState,
  useNodesInitialized,
  useReactFlow,
  useStore,
} from "@xyflow/react";
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

type SimNodeType = SimulationNodeDatum & Node;
type SimEdgeType = SimulationLinkDatum<SimNodeType>;

type DragEvents = {
  start: ReactFlowProps["onNodeDragStart"];
  drag: ReactFlowProps["onNodeDrag"];
  stop: ReactFlowProps["onNodeDragStop"];
};

export type UseForceLayoutOptions = {
  strength?: number;
  distance?: number;
  collisionRadius?: (node: Node) => number;
};

const elementCountSelector = (state: ReactFlowState) =>
  state.nodes.length + state.edges.length;

const defaultCollisionRadius = () => 100;

/**
 * Continuous force-directed layout hook for React Flow canvases.
 * Runs simulation continuously and updates node positions on every tick.
 * Returns drag event handlers to allow interactive dragging while simulation runs.
 */
export function useForceLayout({
  strength = -1000,
  distance = 200,
  collisionRadius = defaultCollisionRadius,
}: UseForceLayoutOptions = {}) {
  const elementCount = useStore(elementCountSelector);
  const nodesInitialized = useNodesInitialized();
  const { setNodes, getNodes, getEdges } = useReactFlow();

  const draggingNodeRef = useRef<Node | null>(null);
  const simulationNodesRef = useRef<SimNodeType[]>([]);
  const simulationRef = useRef<ReturnType<
    typeof forceSimulation<SimNodeType>
  > | null>(null);

  const dragEvents = useMemo<DragEvents>(
    () => ({
      start: (_event, node) => {
        draggingNodeRef.current = node;
        simulationRef.current?.alpha(0.3).restart();
      },
      drag: (_event, node) => {
        draggingNodeRef.current = node;
        const simNode = simulationNodesRef.current.find(
          (n) => n.id === node.id,
        );
        if (simNode) {
          simNode.fx = node.position.x;
          simNode.fy = node.position.y;
        }
        if (simulationRef.current) {
          simulationRef.current.alpha(0.3).restart();
        }
      },
      stop: () => {
        if (draggingNodeRef.current) {
          const simNode = simulationNodesRef.current.find(
            (n) => n.id === draggingNodeRef.current?.id,
          );
          if (simNode) {
            delete simNode.fx;
            delete simNode.fy;
          }
        }
        draggingNodeRef.current = null;
        simulationRef.current?.alpha(1).restart();
      },
    }),
    [],
  );

  useEffect(() => {
    const nodes = getNodes();
    const edges = getEdges();

    if (!nodes.length || !nodesInitialized) {
      return;
    }

    const simulationNodes: SimNodeType[] = nodes.map((node) => ({
      ...node,
      x: node.position.x,
      y: node.position.y,
    }));
    simulationNodesRef.current = simulationNodes;

    const simulationLinks: SimEdgeType[] = edges.map((edge) => edge);

    // Calculate center of mass for centering forces
    const avgX = nodes.reduce((sum, n) => sum + n.position.x, 0) / nodes.length;
    const avgY = nodes.reduce((sum, n) => sum + n.position.y, 0) / nodes.length;

    const simulation = forceSimulation<SimNodeType>()
      .nodes(simulationNodes)
      .force("charge", forceManyBody().strength(strength))
      .force(
        "link",
        forceLink<SimNodeType, SimEdgeType>(simulationLinks)
          .id((d) => d.id)
          .strength(0.05)
          .distance(distance),
      )
      .force("x", forceX(avgX).strength(0.05))
      .force("y", forceY(avgY).strength(0.05))
      .force(
        "collision",
        forceCollide((d) => collisionRadius(d as Node)),
      )
      .on("tick", () => {
        setNodes((nodes) =>
          nodes.map((node, i) => {
            if (simulationNodes[i]) {
              const { x, y } = simulationNodes[i];
              const dragging = draggingNodeRef.current?.id === node.id;

              if (dragging) {
                simulationNodes[i].fx = node.position.x;
                simulationNodes[i].fy = node.position.y;
                return node;
              } else {
                delete simulationNodes[i].fx;
                delete simulationNodes[i].fy;
              }

              return { ...node, position: { x: x ?? 0, y: y ?? 0 } };
            }
            return node;
          }),
        );
      });

    simulationRef.current = simulation;

    return () => {
      simulation.stop();
    };
  }, [
    elementCount,
    getNodes,
    getEdges,
    setNodes,
    strength,
    distance,
    collisionRadius,
    nodesInitialized,
  ]);

  return dragEvents;
}
