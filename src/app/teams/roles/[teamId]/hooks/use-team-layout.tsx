import { useCallback } from "react";

import { useShallow } from "zustand/react/shallow";

import { type TeamStore, useTeamStore } from "../store/team-store";
import { layoutTeamGraph } from "../utils/team-layout-helper";

const selector = (state: TeamStore) => ({
  nodes: state.nodes,
  edges: state.edges,
  setNodes: state.setNodes,
});

/**
 * Hook to trigger auto-layout of team canvas nodes
 * Uses ELK.js to arrange nodes in a hierarchical layout
 */
export function useTeamLayout() {
  const { nodes, edges, setNodes } = useTeamStore(useShallow(selector));

  return useCallback(async () => {
    const layoutedNodes = await layoutTeamGraph(nodes, edges);
    setNodes(layoutedNodes);
  }, [edges, nodes, setNodes]);
}
