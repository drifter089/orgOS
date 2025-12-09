"use client";

import { useCallback } from "react";

import {
  Background,
  BackgroundVariant,
  ConnectionLineType,
  type ProOptions,
  ReactFlow,
  SelectionMode,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import { useShallow } from "zustand/react/shallow";

import { ZoomSlider } from "@/components/react-flow";
import {
  FreehandNode,
  type FreehandNodeType,
  FreehandOverlay,
  SaveStatus,
  useDrawingUndoRedo,
  useForceLayout,
} from "@/lib/canvas";
import { cn } from "@/lib/utils";

import { useSystemsAutoSave } from "../hooks/use-systems-auto-save";
import {
  type SystemsNode,
  type SystemsStore,
  useSystemsStore,
} from "../store/systems-store";
import { MetricCardNode } from "./metric-card-node";
import { SystemsCanvasControls } from "./systems-canvas-controls";
import { SystemsTextNodeMemo } from "./text-node";

const nodeTypes = {
  metricCard: MetricCardNode,
  freehand: FreehandNode,
  "text-node": SystemsTextNodeMemo,
};

const proOptions: ProOptions = { hideAttribution: true };

const selector = (state: SystemsStore) => ({
  nodes: state.nodes,
  edges: state.edges,
  onNodesChange: state.onNodesChange,
  onEdgesChange: state.onEdgesChange,
  onConnect: state.onConnect,
  isDirty: state.isDirty,
  isDrawing: state.isDrawing,
  isForceLayoutEnabled: state.isForceLayoutEnabled,
});

/**
 * Inner component that uses useDrawingUndoRedo hook.
 * Must be rendered inside <ReactFlow> to access ReactFlowProvider context.
 * Undo/redo is ONLY for freehand drawings (session-only, not persisted).
 */
function SystemsCanvasInner() {
  const { nodes, isDrawing, setIsDrawing, setNodes } = useSystemsStore(
    useShallow((state) => ({
      nodes: state.nodes,
      isDrawing: state.isDrawing,
      setIsDrawing: state.setIsDrawing,
      setNodes: state.setNodes,
    })),
  );

  const { undo, redo, takeSnapshot, canUndo, canRedo } =
    useDrawingUndoRedo<SystemsNode>();

  const handleDrawingComplete = useCallback(
    (node: FreehandNodeType) => {
      takeSnapshot();
      setNodes([...nodes, node]);
    },
    [takeSnapshot, setNodes, nodes],
  );

  return (
    <>
      <SystemsCanvasControls
        isDrawing={isDrawing}
        setIsDrawing={setIsDrawing}
        undo={undo}
        redo={redo}
        canUndo={canUndo}
        canRedo={canRedo}
        takeSnapshot={takeSnapshot}
      />
      {isDrawing && (
        <FreehandOverlay onDrawingComplete={handleDrawingComplete} />
      )}
    </>
  );
}

export function SystemsCanvas() {
  const {
    nodes,
    edges,
    onNodesChange,
    onEdgesChange,
    onConnect,
    isDirty,
    isDrawing,
    isForceLayoutEnabled,
  } = useSystemsStore(useShallow(selector));

  const { isSaving, lastSaved } = useSystemsAutoSave();
  const dragEvents = useForceLayout({
    enabled: isForceLayoutEnabled,
    strength: -2000,
    distance: 500,
    collisionRadius: (node) => (node.type === "metricCard" ? 400 : 100),
  });

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
        onNodeDragStart={dragEvents.start}
        onNodeDrag={dragEvents.drag}
        onNodeDragStop={dragEvents.stop}
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
        panOnScroll={!isDrawing}
        panOnDrag={isDrawing ? false : [1, 2]}
        zoomOnScroll={!isDrawing}
        selectNodesOnDrag={false}
        selectionOnDrag={!isDrawing}
        selectionMode={SelectionMode.Partial}
        className={cn(
          "bg-background",
          "transition-opacity duration-200",
          isSaving && "opacity-90",
        )}
      >
        <Background variant={BackgroundVariant.Dots} gap={16} size={1} />
        <ZoomSlider position="bottom-left" />
        <SystemsCanvasInner />
      </ReactFlow>
    </div>
  );
}
