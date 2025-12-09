"use client";

import { useCallback, useEffect, useMemo } from "react";

import {
  Background,
  BackgroundVariant,
  MarkerType,
  type ProOptions,
  ReactFlow,
  SelectionMode,
  useReactFlow,
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
} from "@/lib/canvas";
import { cn } from "@/lib/utils";

import { useAutoSave } from "../hooks/use-auto-save";
import {
  type TeamEdge as TeamEdgeType,
  type TeamNode,
  type TeamStore,
  useTeamStore,
} from "../store/team-store";
import { RoleDialog } from "./role-dialog";
import { RoleNodeMemo } from "./role-node";
import { TeamCanvasControls } from "./team-canvas-controls";
import { TeamEdge } from "./team-edge";
import { TextNodeMemo } from "./text-node";

const nodeTypes = {
  "role-node": RoleNodeMemo,
  "text-node": TextNodeMemo,
  freehand: FreehandNode,
};

const edgeTypes = {
  "team-edge": TeamEdge,
};

const proOptions: ProOptions = { hideAttribution: true };

const selector = (state: TeamStore) => ({
  nodes: state.nodes,
  edges: state.edges,
  teamId: state.teamId,
  onNodesChange: state.onNodesChange,
  onEdgesChange: state.onEdgesChange,
  onConnect: state.onConnect,
  setNodes: state.setNodes,
  isDirty: state.isDirty,
  editingNodeId: state.editingNodeId,
  setEditingNodeId: state.setEditingNodeId,
  isDrawing: state.isDrawing,
  setIsDrawing: state.setIsDrawing,
  markDirty: state.markDirty,
  isInitialized: state.isInitialized,
});

/** Registers React Flow instance with store. Must be inside <ReactFlow>. */
function ReactFlowInstanceRegistrar() {
  const reactFlowInstance = useReactFlow<TeamNode, TeamEdgeType>();
  const setReactFlowInstance = useTeamStore(
    (state) => state.setReactFlowInstance,
  );

  useEffect(() => {
    setReactFlowInstance(reactFlowInstance);
    return () => setReactFlowInstance(null);
  }, [reactFlowInstance, setReactFlowInstance]);

  return null;
}

/**
 * Inner component that uses useDrawingUndoRedo hook.
 * Must be rendered inside <ReactFlow> to access ReactFlowProvider context.
 * Undo/redo is ONLY for freehand drawings (session-only, not persisted).
 */
function TeamCanvasInner() {
  const { nodes, isDrawing, setIsDrawing, setNodes } = useTeamStore(
    useShallow((state) => ({
      nodes: state.nodes,
      isDrawing: state.isDrawing,
      setIsDrawing: state.setIsDrawing,
      setNodes: state.setNodes,
    })),
  );

  const { undo, redo, takeSnapshot, canUndo, canRedo } =
    useDrawingUndoRedo<TeamNode>();

  const handleDrawingComplete = useCallback(
    (node: FreehandNodeType) => {
      takeSnapshot();
      setNodes([...nodes, node]);
    },
    [takeSnapshot, setNodes, nodes],
  );

  return (
    <>
      <TeamCanvasControls
        isDrawing={isDrawing}
        setIsDrawing={setIsDrawing}
        undo={undo}
        redo={redo}
        canUndo={canUndo}
        canRedo={canRedo}
        takeSnapshot={takeSnapshot}
      />
      <ReactFlowInstanceRegistrar />
      {isDrawing && (
        <FreehandOverlay onDrawingComplete={handleDrawingComplete} />
      )}
    </>
  );
}

export function TeamCanvas() {
  const {
    nodes,
    edges,
    teamId,
    onNodesChange,
    onEdgesChange,
    onConnect,
    isDirty,
    editingNodeId,
    setEditingNodeId,
    isDrawing,
  } = useTeamStore(useShallow(selector));

  const { isSaving, lastSaved } = useAutoSave();

  // Get selected role data from editingNodeId
  const selectedRole = useMemo(() => {
    if (!editingNodeId) return null;
    const node = nodes.find((n) => n.id === editingNodeId);
    if (!node || node.type !== "role-node") return null;
    return {
      ...node.data,
      nodeId: node.id,
    };
  }, [editingNodeId, nodes]);

  // Clear editing state when dialog closes
  useEffect(() => {
    if (!selectedRole && editingNodeId) {
      setEditingNodeId(null);
    }
  }, [selectedRole, editingNodeId, setEditingNodeId]);

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

      {/* React Flow Canvas */}
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onConnect={onConnect}
        nodeTypes={nodeTypes}
        edgeTypes={edgeTypes}
        proOptions={proOptions}
        fitView
        fitViewOptions={{
          maxZoom: 0.65,
          minZoom: 0.65,
        }}
        className={cn(
          "bg-background",
          "transition-opacity duration-200",
          isSaving && "opacity-90",
        )}
        panOnScroll={!isDrawing}
        panOnDrag={isDrawing ? false : [1, 2]}
        zoomOnScroll={!isDrawing}
        selectNodesOnDrag={false}
        selectionOnDrag={!isDrawing}
        selectionMode={SelectionMode.Partial}
        defaultEdgeOptions={{
          type: "team-edge",
          animated: true,
          markerEnd: { type: MarkerType.ArrowClosed, width: 20, height: 20 },
        }}
      >
        <Background variant={BackgroundVariant.Dots} gap={16} size={1} />
        <ZoomSlider position="bottom-left" />
        <TeamCanvasInner />
      </ReactFlow>

      {/* Edit Role Dialog */}
      {selectedRole && (
        <RoleDialog
          teamId={teamId}
          roleData={selectedRole}
          open={!!editingNodeId}
          onOpenChange={(open) => {
            if (!open) setEditingNodeId(null);
          }}
        />
      )}
    </div>
  );
}
