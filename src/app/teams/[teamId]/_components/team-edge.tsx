"use client";

import { useCallback } from "react";

import {
  BaseEdge,
  type Edge,
  EdgeLabelRenderer,
  type EdgeProps,
  MarkerType,
  getBezierPath,
} from "@xyflow/react";
import { Loader2, Plus, Trash2 } from "lucide-react";
import { nanoid } from "nanoid";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { api } from "@/trpc/react";

import { useTeamStore, useTeamStoreApi } from "../store/team-store";
import { type RoleNodeData } from "./role-node";

export type TeamEdge = Edge;

export function TeamEdge({
  id,
  sourceX,
  sourceY,
  targetX,
  targetY,
  sourcePosition,
  targetPosition,
  source: _source,
  target: _target,
  style = {},
  markerEnd,
  selected,
}: EdgeProps<TeamEdge>) {
  const [edgePath, labelX, labelY] = getBezierPath({
    sourceX,
    sourceY,
    sourcePosition,
    targetX,
    targetY,
    targetPosition,
  });

  const storeApi = useTeamStoreApi();
  const teamId = useTeamStore((state) => state.teamId);
  const setNodes = useTeamStore((state) => state.setNodes);
  const setEdges = useTeamStore((state) => state.setEdges);
  const markDirty = useTeamStore((state) => state.markDirty);

  const utils = api.useUtils();

  const createRole = api.role.create.useMutation({
    onMutate: async (variables) => {
      await utils.role.getByTeam.cancel({ teamId });

      const previousRoles = utils.role.getByTeam.getData({ teamId });
      // Get current state from store to avoid stale closures
      const { nodes: currentNodes, edges: currentEdges } = storeApi.getState();
      const previousNodes = [...currentNodes];
      const previousEdges = [...currentEdges];

      const tempRoleId = `temp-role-${nanoid(8)}`;
      const nodeId = variables.nodeId;

      const optimisticRole = {
        id: tempRoleId,
        title: variables.title,
        purpose: variables.purpose,
        accountabilities: null,
        teamId: variables.teamId,
        metricId: null,
        nodeId: variables.nodeId,
        assignedUserId: null,
        color: variables.color ?? "#3b82f6",
        createdAt: new Date(),
        updatedAt: new Date(),
        metric: null,
        isPending: true,
      };

      // Find the edge we're adding the node to
      const edgeIndex = currentEdges.findIndex((e) => e.id === id);
      const edge = currentEdges[edgeIndex];
      if (!edge) return { previousRoles, previousNodes, previousEdges };

      // Calculate position between source and target
      const position = { x: labelX - 140, y: labelY - 50 };

      const optimisticNode = {
        id: nodeId,
        type: "role-node" as const,
        position,
        data: {
          roleId: tempRoleId,
          title: variables.title,
          purpose: variables.purpose,
          accountabilities: undefined,
          color: variables.color ?? "#3b82f6",
          isPending: true,
        } as RoleNodeData,
      };

      // Remove the old edge and add two new edges
      const newEdges = [
        ...currentEdges.slice(0, edgeIndex),
        ...currentEdges.slice(edgeIndex + 1),
        {
          id: `edge-${edge.source}-${nodeId}`,
          source: edge.source,
          target: nodeId,
          type: "team-edge",
          animated: true,
          markerEnd: { type: MarkerType.ArrowClosed, width: 20, height: 20 },
        },
        {
          id: `edge-${nodeId}-${edge.target}`,
          source: nodeId,
          target: edge.target,
          type: "team-edge",
          animated: true,
          markerEnd: { type: MarkerType.ArrowClosed, width: 20, height: 20 },
        },
      ];

      setNodes([...currentNodes, optimisticNode]);
      setEdges(newEdges);
      markDirty();

      utils.role.getByTeam.setData({ teamId }, (old) => {
        const roleWithPending = optimisticRole as typeof old extends
          | (infer T)[]
          | undefined
          ? T
          : never;
        if (!old) return [roleWithPending];
        return [...old, roleWithPending];
      });

      return {
        previousRoles,
        previousNodes,
        previousEdges,
        tempRoleId,
        nodeId,
      };
    },
    onSuccess: (newRole, _variables, context) => {
      if (!context) return;

      // Use fresh state to preserve user's node position changes during mutation
      const currentNodes = storeApi.getState().nodes;
      const updatedNodes = currentNodes.map((node) => {
        if (node.id === context.nodeId) {
          return {
            ...node,
            data: {
              ...node.data,
              roleId: newRole.id,
              isPending: undefined,
            },
          };
        }
        return node;
      });
      setNodes(updatedNodes);

      utils.role.getByTeam.setData({ teamId }, (old) => {
        if (!old) return [newRole];
        return old.map((role) =>
          role.id === context.tempRoleId ? newRole : role,
        );
      });
    },
    onError: (error, variables, context) => {
      if (context?.previousRoles) {
        utils.role.getByTeam.setData({ teamId }, context.previousRoles);
      }
      if (context?.previousNodes) {
        setNodes(context.previousNodes);
      }
      if (context?.previousEdges) {
        setEdges(context.previousEdges);
      }
      toast.error("Failed to create role", {
        description: error.message ?? "An unexpected error occurred",
      });
    },
  });

  const handleAddRole = useCallback(() => {
    const nodeId = `role-node-${nanoid(8)}`;
    createRole.mutate({
      teamId,
      title: "New Role",
      purpose: "Define the purpose of this role",
      nodeId,
      color: "#3b82f6",
    });
  }, [teamId, createRole]);

  const handleDeleteEdge = useCallback(() => {
    const currentEdges = storeApi.getState().edges;
    const newEdges = currentEdges.filter((e) => e.id !== id);
    setEdges(newEdges);
    markDirty();
  }, [storeApi, id, setEdges, markDirty]);

  const isPending = createRole.isPending;

  return (
    <>
      <BaseEdge
        id={id}
        path={edgePath}
        markerEnd={markerEnd}
        style={{
          ...style,
          strokeWidth: selected ? 2 : 1.5,
          pointerEvents: "auto",
        }}
      />
      <EdgeLabelRenderer>
        <div
          className="nodrag nopan pointer-events-auto absolute flex gap-1"
          style={{
            transform: `translate(-50%, -50%) translate(${labelX}px, ${labelY}px)`,
          }}
        >
          {/* Add Role Button */}
          <Button
            onClick={(e) => {
              e.stopPropagation();
              handleAddRole();
            }}
            size="icon"
            variant="secondary"
            disabled={isPending}
            className={cn(
              "hover:bg-primary hover:text-primary-foreground h-6 w-6 rounded-lg border shadow-sm transition-all hover:shadow-md",
              selected && "border-primary",
            )}
            title="Add role between"
          >
            {isPending ? (
              <Loader2 className="h-3 w-3 animate-spin" />
            ) : (
              <Plus className="h-3 w-3" />
            )}
          </Button>

          {/* Delete Edge Button */}
          <Button
            onClick={(e) => {
              e.stopPropagation();
              handleDeleteEdge();
            }}
            size="icon"
            variant="secondary"
            className={cn(
              "hover:bg-destructive hover:text-destructive-foreground h-6 w-6 rounded-lg border shadow-sm transition-all hover:shadow-md",
              selected && "border-destructive",
            )}
            title="Delete connection"
          >
            <Trash2 className="h-3 w-3" />
          </Button>
        </div>
      </EdgeLabelRenderer>
    </>
  );
}
