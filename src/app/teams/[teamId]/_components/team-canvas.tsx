"use client";

import { useState } from "react";

import {
  Background,
  BackgroundVariant,
  type NodeMouseHandler,
  ReactFlow,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import { Loader2, Save } from "lucide-react";
import { useShallow } from "zustand/react/shallow";

import { ZoomSlider } from "@/components/zoom-slider";
import { cn } from "@/lib/utils";

import { useAutoSave } from "../hooks/use-auto-save";
import { type TeamStore, useTeamStore } from "../store/team-store";
import { RoleDialog } from "./role-dialog";
import { type RoleNodeData, RoleNodeMemo } from "./role-node";
import { TeamCanvasControls } from "./team-canvas-controls";
import { TeamEdge } from "./team-edge";

const nodeTypes = {
  "role-node": RoleNodeMemo,
};

const edgeTypes = {
  "team-edge": TeamEdge,
};

const selector = (state: TeamStore) => ({
  nodes: state.nodes,
  edges: state.edges,
  teamId: state.teamId,
  onNodesChange: state.onNodesChange,
  onEdgesChange: state.onEdgesChange,
  onConnect: state.onConnect,
  isDirty: state.isDirty,
});

export function TeamCanvas() {
  const {
    nodes,
    edges,
    teamId,
    onNodesChange,
    onEdgesChange,
    onConnect,
    isDirty,
  } = useTeamStore(useShallow(selector));

  const { isSaving, lastSaved } = useAutoSave();

  // State for edit dialog
  const [selectedRole, setSelectedRole] = useState<
    (RoleNodeData & { nodeId: string }) | null
  >(null);
  const [editDialogOpen, setEditDialogOpen] = useState(false);

  // Handle node double-click to edit role
  const handleNodeDoubleClick: NodeMouseHandler = (event, node) => {
    if (node.type === "role-node") {
      setSelectedRole({
        ...(node.data as RoleNodeData),
        nodeId: node.id,
      });
      setEditDialogOpen(true);
    }
  };

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
        onNodeDoubleClick={handleNodeDoubleClick}
        nodeTypes={nodeTypes}
        edgeTypes={edgeTypes}
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
        defaultEdgeOptions={{
          type: "team-edge",
          animated: true,
        }}
      >
        <Background variant={BackgroundVariant.Dots} gap={16} size={1} />
        <ZoomSlider position="bottom-left" />
        <TeamCanvasControls />
      </ReactFlow>

      {/* Edit Role Dialog */}
      {selectedRole && (
        <RoleDialog
          teamId={teamId}
          roleData={selectedRole}
          open={editDialogOpen}
          onOpenChange={(open) => {
            setEditDialogOpen(open);
            if (!open) setSelectedRole(null);
          }}
        />
      )}
    </div>
  );
}
