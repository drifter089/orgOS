import { useCallback } from "react";

import { useShallow } from "zustand/react/shallow";

import { type TeamStore, useTeamStore } from "../store/team-store";
import { layoutTeamWithForce } from "../utils/force-layout";

const selector = (state: TeamStore) => ({
  nodes: state.nodes,
  edges: state.edges,
  setNodes: state.setNodes,
});

/**
 * Hook to trigger force-directed layout of team canvas nodes
 * Uses d3-force to arrange nodes with physics-based positioning
 */
export function useTeamLayout() {
  const { nodes, edges, setNodes } = useTeamStore(useShallow(selector));

  return useCallback(() => {
    const layoutedNodes = layoutTeamWithForce(nodes, edges);
    setNodes(layoutedNodes);
  }, [edges, nodes, setNodes]);
}
