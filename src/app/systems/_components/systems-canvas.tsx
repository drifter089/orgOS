"use client";

import {
  Background,
  BackgroundVariant,
  ConnectionLineType,
  type ProOptions,
  ReactFlow,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import { useShallow } from "zustand/react/shallow";

import { ZoomSlider } from "@/components/react-flow";
import { SaveStatus } from "@/lib/canvas";
import { cn } from "@/lib/utils";

import { useSystemsAutoSave } from "../hooks/use-systems-auto-save";
import { type SystemsStore, useSystemsStore } from "../store/systems-store";
import { MetricCardNode } from "./metric-card-node";

const nodeTypes = {
  metricCard: MetricCardNode,
};

const proOptions: ProOptions = { hideAttribution: true };

const selector = (state: SystemsStore) => ({
  nodes: state.nodes,
  edges: state.edges,
  onNodesChange: state.onNodesChange,
  onEdgesChange: state.onEdgesChange,
  onConnect: state.onConnect,
  isDirty: state.isDirty,
});

export function SystemsCanvas() {
  const { nodes, edges, onNodesChange, onEdgesChange, onConnect, isDirty } =
    useSystemsStore(useShallow(selector));

  const { isSaving, lastSaved } = useSystemsAutoSave();

  return (
    <div className="relative h-full w-full">
      {/* Save Status Indicator */}
      <div className="absolute top-4 right-4 z-20">
        <SaveStatus
          isSaving={isSaving}
          isDirty={isDirty}
          lastSaved={lastSaved}
        />
      </div>

      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onConnect={onConnect}
        nodeTypes={nodeTypes}
        proOptions={proOptions}
        connectionLineType={ConnectionLineType.SmoothStep}
        defaultEdgeOptions={{
          type: "smoothstep",
          animated: true,
        }}
        fitView
        fitViewOptions={{ padding: 0.2 }}
        minZoom={0.1}
        maxZoom={1.5}
        className={cn(
          "bg-background",
          "transition-opacity duration-200",
          isSaving && "opacity-90",
        )}
      >
        <Background variant={BackgroundVariant.Dots} gap={16} size={1} />
        <ZoomSlider position="bottom-left" />
      </ReactFlow>
    </div>
  );
}
