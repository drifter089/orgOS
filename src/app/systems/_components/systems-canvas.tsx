"use client";

import {
  Background,
  BackgroundVariant,
  ConnectionLineType,
  type ProOptions,
  ReactFlow,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import { Loader2, Save } from "lucide-react";
import { useShallow } from "zustand/react/shallow";

import { ZoomSlider } from "@/components/zoom-slider";
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
      <div className="absolute top-4 right-4 z-20">
        <div className="supports-backdrop-filter:bg-background/60 bg-background/95 ring-border/50 rounded-md border px-3 py-2 shadow-md ring-1 backdrop-blur-sm">
          {isSaving ? (
            <div className="flex items-center gap-2 text-sm">
              <Loader2 className="text-primary h-3.5 w-3.5 animate-spin" />
              <span className="font-medium">Saving...</span>
            </div>
          ) : isDirty ? (
            <div className="flex items-center gap-2 text-sm">
              <div className="h-2 w-2 animate-pulse rounded-full bg-yellow-500" />
              <span className="text-muted-foreground font-medium">
                Unsaved changes
              </span>
            </div>
          ) : lastSaved ? (
            <div className="flex items-center gap-2 text-sm">
              <Save className="h-3.5 w-3.5 text-emerald-500" />
              <span className="text-muted-foreground font-medium">Saved</span>
            </div>
          ) : null}
        </div>
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
