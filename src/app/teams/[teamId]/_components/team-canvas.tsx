"use client";

import { useEffect, useMemo } from "react";

import {
  Background,
  BackgroundVariant,
  MarkerType,
  type ProOptions,
  ReactFlow,
  useReactFlow,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import { Loader2, Save } from "lucide-react";
import { useShallow } from "zustand/react/shallow";

import { ZoomSlider } from "@/components/zoom-slider";
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
  isDirty: state.isDirty,
  editingNodeId: state.editingNodeId,
  setEditingNodeId: state.setEditingNodeId,
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
      {/* Save Status Indicator - Positioned in top-right with visual grouping */}
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
        panOnScroll
        defaultEdgeOptions={{
          type: "team-edge",
          animated: true,
          markerEnd: { type: MarkerType.ArrowClosed, width: 20, height: 20 },
        }}
      >
        <Background variant={BackgroundVariant.Dots} gap={16} size={1} />
        <ZoomSlider position="bottom-left" />
        <TeamCanvasControls />
        <ReactFlowInstanceRegistrar />
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
