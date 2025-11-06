import { useCallback } from "react";

import { useShallow } from "zustand/react/shallow";

import { useAppStore } from "@/app/workflow/store";
import { type AppStore } from "@/app/workflow/store/app-store";
import { layoutGraph } from "@/app/workflow/utils/layout-helper";

const selector = (state: AppStore) => ({
  getNodes: state.getNodes,
  setNodes: state.setNodes,
  getEdges: state.getEdges,
});

export function useLayout() {
  const { getNodes, getEdges, setNodes } = useAppStore(useShallow(selector));

  return useCallback(async () => {
    const layoutedNodes = await layoutGraph(getNodes(), getEdges());
    setNodes(layoutedNodes);
  }, [getEdges, getNodes, setNodes]);
}
