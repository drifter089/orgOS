import { useCallback } from "react";

import { useShallow } from "zustand/react/shallow";

import { type SystemsStore, useSystemsStore } from "../store/systems-store";
import { layoutSystemsWithForce } from "../utils/force-layout";

const selector = (state: SystemsStore) => ({
  nodes: state.nodes,
  edges: state.edges,
  setNodes: state.setNodes,
});

/**
 * Hook to trigger force-directed layout of systems canvas nodes
 * Uses d3-force to arrange nodes with physics-based positioning
 */
export function useSystemsLayout() {
  const { nodes, edges, setNodes } = useSystemsStore(useShallow(selector));

  return useCallback(() => {
    const layoutedNodes = layoutSystemsWithForce(nodes, edges);
    setNodes(layoutedNodes);
  }, [edges, nodes, setNodes]);
}
