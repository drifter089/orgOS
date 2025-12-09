"use client";

import { useCallback, useRef } from "react";

import {
  BaseEdge,
  type Edge,
  type EdgeProps,
  MarkerType,
  getBezierPath,
  useInternalNode,
} from "@xyflow/react";
import { nanoid } from "nanoid";
import { toast } from "sonner";

import { EdgeActionButtons, getFloatingEdgeParams } from "@/lib/canvas";
import { markdownToHtml } from "@/lib/utils";
import { api } from "@/trpc/react";

import { useRoleSuggestions } from "../hooks/use-role-suggestions";
import { useTeamStore, useTeamStoreApi } from "../store/team-store";
import { type RoleNodeData } from "./role-node";

export type TeamEdge = Edge;

export function TeamEdge({
  id,
  source,
  target,
  style = {},
  markerEnd,
  selected,
}: EdgeProps<TeamEdge>) {
  const sourceNode = useInternalNode(source);
  const targetNode = useInternalNode(target);

  const storeApi = useTeamStoreApi();
  const teamId = useTeamStore((state) => state.teamId);
  const setNodes = useTeamStore((state) => state.setNodes);
  const setEdges = useTeamStore((state) => state.setEdges);
  const markDirty = useTeamStore((state) => state.markDirty);

  const { consumeNextRole } = useRoleSuggestions(teamId);
  const utils = api.useUtils();

  // Ref to store the current edge midpoint position (updated each render)
  const positionRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 });

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
        accountabilities: variables.accountabilities ?? null,
        teamId: variables.teamId,
        metricId: null,
        nodeId: variables.nodeId,
        assignedUserId: null,
        effortPoints: null,
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

      // Use the stored position (offset to center the node on the edge midpoint)
      const position = {
        x: positionRef.current.x - 140,
        y: positionRef.current.y - 50,
      };

      const optimisticNode = {
        id: nodeId,
        type: "role-node" as const,
        position,
        data: {
          roleId: tempRoleId,
          title: variables.title,
          purpose: variables.purpose,
          accountabilities: variables.accountabilities ?? undefined,
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
        if (node.id === context.nodeId && node.type === "role-node") {
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
    const suggestion = consumeNextRole();

    if (suggestion) {
      createRole.mutate({
        teamId,
        title: suggestion.title,
        purpose: markdownToHtml(suggestion.purpose),
        accountabilities: markdownToHtml(suggestion.accountabilities),
        nodeId,
        color: suggestion.color,
      });
    } else {
      createRole.mutate({
        teamId,
        title: "New Role",
        purpose: "Define the purpose of this role",
        nodeId,
        color: "#3b82f6",
      });
    }
  }, [teamId, createRole, consumeNextRole]);

  const handleDeleteEdge = useCallback(() => {
    const currentEdges = storeApi.getState().edges;
    const newEdges = currentEdges.filter((e) => e.id !== id);
    setEdges(newEdges);
    markDirty();
  }, [storeApi, id, setEdges, markDirty]);

  // Early return after all hooks
  if (!sourceNode || !targetNode) {
    return null;
  }

  // Calculate floating edge path
  const { sx, sy, tx, ty, sourcePos, targetPos } = getFloatingEdgeParams(
    sourceNode,
    targetNode,
  );
  const [edgePath, labelX, labelY] = getBezierPath({
    sourceX: sx,
    sourceY: sy,
    sourcePosition: sourcePos,
    targetX: tx,
    targetY: ty,
    targetPosition: targetPos,
  });

  // Update the position ref each render so onMutate has access to current values
  positionRef.current = { x: labelX, y: labelY };

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
      <EdgeActionButtons
        labelX={labelX}
        labelY={labelY}
        selected={selected}
        onAdd={handleAddRole}
        onDelete={handleDeleteEdge}
        isAdding={createRole.isPending}
        addTitle="Add role between"
      />
    </>
  );
}
