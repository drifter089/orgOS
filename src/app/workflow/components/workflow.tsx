"use client";

import React, { useEffect, useState } from "react";

import {
  Background,
  type ColorMode,
  ConnectionLineType,
  ReactFlow,
} from "@xyflow/react";
import { useTheme } from "next-themes";
import { useShallow } from "zustand/react/shallow";

import { WorkflowEdge } from "@/app/workflow/components/edges/workflow-edge";
import FlowContextMenu from "@/app/workflow/components/flow-context-menu";
import { FlowRunButton } from "@/app/workflow/components/flow-run-button";
import { nodeTypes } from "@/app/workflow/components/nodes";
import { useDragAndDrop } from "@/app/workflow/hooks/useDragAndDrop";
import { useAppStore } from "@/app/workflow/store";
import { type AppStore } from "@/app/workflow/store/app-store";

import { WorkflowControls } from "./controls";

const edgeTypes = {
  workflow: WorkflowEdge,
};

const defaultEdgeOptions = { type: "workflow" };

const selector = (state: AppStore) => ({
  nodes: state.nodes,
  edges: state.edges,
  onNodesChange: state.onNodesChange,
  onEdgesChange: state.onEdgesChange,
  onConnect: state.onConnect,
  onNodeDragStart: state.onNodeDragStart,
  onNodeDragStop: state.onNodeDragStop,
});

export default function Workflow() {
  const store = useAppStore(useShallow(selector));
  const { onDragOver, onDrop } = useDragAndDrop();
  const { theme, resolvedTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  // Avoid hydration mismatch by only rendering theme-dependent content after mount
  useEffect(() => {
    setMounted(true);
  }, []);

  // Use resolved theme after mount to avoid hydration mismatch
  const colorMode = mounted ? (resolvedTheme as ColorMode) : "light";

  return (
    <ReactFlow
      nodes={store.nodes}
      edges={store.edges}
      onNodesChange={store.onNodesChange}
      onEdgesChange={store.onEdgesChange}
      onConnect={store.onConnect}
      connectionLineType={ConnectionLineType.SmoothStep}
      nodeTypes={nodeTypes}
      edgeTypes={edgeTypes}
      onDragOver={onDragOver}
      onDrop={onDrop}
      onNodeDragStart={store.onNodeDragStart}
      onNodeDragStop={store.onNodeDragStop}
      colorMode={colorMode}
      defaultEdgeOptions={defaultEdgeOptions}
      fitView
    >
      <Background />
      <WorkflowControls />
      <FlowContextMenu />
      <FlowRunButton />
    </ReactFlow>
  );
}
