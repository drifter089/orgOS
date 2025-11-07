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

import { Badge } from "@/components/ui/badge";
import { ZoomSlider } from "@/components/zoom-slider";
import { cn } from "@/lib/utils";

import { useAutoSave } from "../hooks/use-auto-save";
import { useTeamStore } from "../store/team-store";
import { RoleDialog } from "./role-dialog";
import { type RoleNodeData, RoleNodeMemo } from "./role-node";

const nodeTypes = {
  "role-node": RoleNodeMemo,
};

export function TeamCanvas() {
  const nodes = useTeamStore((state) => state.nodes);
  const edges = useTeamStore((state) => state.edges);
  const teamId = useTeamStore((state) => state.teamId);
  const onNodesChange = useTeamStore((state) => state.onNodesChange);
  const onEdgesChange = useTeamStore((state) => state.onEdgesChange);
  const onConnect = useTeamStore((state) => state.onConnect);
  const isDirty = useTeamStore((state) => state.isDirty);

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
        ...node.data,
        nodeId: node.id,
      });
      setEditDialogOpen(true);
    }
  };

  return (
    <div className="relative h-full w-full">
      {/* Save Status Indicator */}
      <div className="absolute top-4 right-4 z-10 flex items-center gap-2">
        {isSaving ? (
          <Badge variant="secondary" className="gap-2">
            <Loader2 className="h-3 w-3 animate-spin" />
            Saving...
          </Badge>
        ) : isDirty ? (
          <Badge variant="outline" className="gap-2">
            <div className="h-2 w-2 rounded-full bg-yellow-500" />
            Unsaved changes
          </Badge>
        ) : lastSaved ? (
          <Badge variant="secondary" className="gap-2">
            <Save className="h-3 w-3" />
            Saved
          </Badge>
        ) : null}
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
        fitView
        className={cn(
          "bg-background",
          "transition-opacity duration-200",
          isSaving && "opacity-90",
        )}
        defaultEdgeOptions={{
          type: "smoothstep",
          animated: true,
        }}
      >
        <Background variant={BackgroundVariant.Dots} gap={16} size={1} />
        <ZoomSlider position="bottom-left" className="bg-card" />
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
