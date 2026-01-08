"use client";

import { memo, useCallback } from "react";

import { Handle, type Node, type NodeProps, Position } from "@xyflow/react";

import { RoleCard, type RoleCardData } from "@/components/role/role-card";
import { cn } from "@/lib/utils";

import { useTeamStoreOptional } from "../store/team-store";

/**
 * Role data structure for override props (compatible with both private and public data).
 * This allows the component to work without hooks when data is pre-fetched.
 */
export type RoleDataOverride = RoleCardData;

/**
 * Minimal data stored in node.data - just a reference to the role.
 * All display data comes from TanStack Query cache via RoleCard,
 * or from roleDataOverride when provided (for public views).
 */
export type RoleNodeData = {
  roleId: string;
  /** Only set during optimistic create, before server confirms */
  isPending?: boolean;
  /** Temporary title during optimistic create (used until cache is populated) */
  pendingTitle?: string;
  /** Temporary color during optimistic create */
  pendingColor?: string;
  /** When true, hides edit/delete buttons and disables interactions (for public views) */
  readOnly?: boolean;
  /** Pre-fetched role data (for public views that can't use hooks) */
  roleDataOverride?: RoleDataOverride;
  /** Pre-resolved user name (for public views that can't call WorkOS) */
  userNameOverride?: string | null;
};

export type RoleNode = Node<RoleNodeData, "role-node">;

const handleClassName = cn(
  "!bg-primary !border-background !h-3 !w-3 !border-2",
  "transition-transform hover:!scale-125",
);

function RoleNodeComponent({ data, selected, id }: NodeProps<RoleNode>) {
  const teamId = useTeamStoreOptional((state) => state.teamId);
  const setEditingNodeId = useTeamStoreOptional(
    (state) => state.setEditingNodeId,
  );

  const handleEdit = useCallback(() => {
    setEditingNodeId?.(id);
  }, [setEditingNodeId, id]);

  // Double-click to edit (only if not pending and not readOnly)
  const handleDoubleClick = useCallback(() => {
    if (!data.isPending && !data.readOnly) {
      setEditingNodeId?.(id);
    }
  }, [data.isPending, data.readOnly, setEditingNodeId, id]);

  return (
    <div onDoubleClick={handleDoubleClick}>
      {/* Single handle per side - floating edges calculate best connection point */}
      <Handle
        type="source"
        position={Position.Top}
        id="top"
        className={handleClassName}
      />
      <Handle
        type="source"
        position={Position.Right}
        id="right"
        className={handleClassName}
      />

      <RoleCard
        roleId={data.roleId}
        teamId={teamId ?? ""}
        isPending={data.isPending}
        pendingTitle={data.pendingTitle}
        pendingColor={data.pendingColor}
        roleDataOverride={data.roleDataOverride}
        userNameOverride={data.userNameOverride}
        variant="canvas"
        selected={selected}
        readOnly={data.readOnly}
        onEdit={!data.readOnly ? handleEdit : undefined}
      />

      <Handle
        type="source"
        position={Position.Bottom}
        id="bottom"
        className={handleClassName}
      />
      <Handle
        type="source"
        position={Position.Left}
        id="left"
        className={handleClassName}
      />
    </div>
  );
}

export const RoleNodeMemo = memo(RoleNodeComponent);
