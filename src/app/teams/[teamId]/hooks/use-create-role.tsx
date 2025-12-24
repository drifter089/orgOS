"use client";

import { nanoid } from "nanoid";
import { toast } from "sonner";

import { api } from "@/trpc/react";

import type { RoleNodeData } from "../_components/role-node";
import {
  type TeamEdge,
  type TeamNode,
  useTeamStore,
  useTeamStoreApi,
} from "../store/team-store";

/**
 * Context passed to onMutate callback for component-specific logic
 */
export interface CreateRoleContext {
  /** Temporary role ID used for optimistic updates */
  tempRoleId: string;
  /** The node ID for the new role */
  nodeId: string;
  /** Previous nodes state for rollback */
  previousNodes: TeamNode[];
  /** Previous edges state for rollback */
  previousEdges: TeamEdge[];
  /** Previous roles cache for rollback - type inferred from tRPC query */
  previousRoles: unknown;
}

/**
 * Options for creating an optimistic node
 */
export interface OptimisticNodeOptions {
  /** Position for the new node */
  position: { x: number; y: number };
  /** Additional node data beyond the basics */
  additionalData?: Partial<RoleNodeData>;
}

/**
 * Options for handling edges when creating a role
 */
export interface EdgeHandlingOptions {
  /** Source node ID to create an edge from */
  sourceNodeId?: string;
  /** Callback to create custom edges (for edge splitting) */
  createEdges?: (nodeId: string, currentEdges: TeamEdge[]) => TeamEdge[];
}

/** Variables passed to create role mutation */
export interface CreateRoleVariables {
  nodeId: string;
  title: string;
  purpose: string;
  accountabilities?: string;
  color?: string;
  metricId?: string;
  assignedUserId?: string | null;
  effortPoints?: number | null;
}

/**
 * Options for the useCreateRole hook
 */
export interface UseCreateRoleOptions {
  /** Team ID for the role */
  teamId: string;
  /** Callback to get the node position and additional data */
  getNodeOptions: (variables: CreateRoleVariables) => OptimisticNodeOptions;
  /** Optional callback to handle edges (nodeId passed for convenience) */
  getEdgeOptions?: (nodeId: string) => EdgeHandlingOptions;
  /** Callback before mutation starts (e.g., close dialog, reset form) */
  onBeforeMutate?: () => void;
}

/**
 * Shared hook for creating roles with optimistic updates.
 * Creates a minimal node with { roleId, isPending, pendingTitle, pendingColor }
 * and adds role to TanStack Query cache.
 */
export function useCreateRole({
  teamId,
  getNodeOptions,
  getEdgeOptions,
  onBeforeMutate,
}: UseCreateRoleOptions) {
  const storeApi = useTeamStoreApi();
  const setNodes = useTeamStore((state) => state.setNodes);
  const setEdges = useTeamStore((state) => state.setEdges);
  const markDirty = useTeamStore((state) => state.markDirty);
  const utils = api.useUtils();

  return api.role.create.useMutation({
    onMutate: async (variables) => {
      onBeforeMutate?.();
      await utils.role.getByTeamId.cancel({ teamId });

      const previousRoles = utils.role.getByTeamId.getData({ teamId });
      const { nodes: currentNodes, edges: currentEdges } = storeApi.getState();
      const previousNodes = [...currentNodes];
      const previousEdges = [...currentEdges];

      const tempRoleId = `temp-role-${nanoid(8)}`;
      const nodeId = variables.nodeId;
      const nodeOptions = getNodeOptions(variables);

      // Create optimistic role for cache (component reads from here)
      const optimisticRole = {
        id: tempRoleId,
        title: variables.title,
        purpose: variables.purpose,
        accountabilities: variables.accountabilities ?? null,
        teamId: variables.teamId,
        metricId: variables.metricId ?? null,
        nodeId: variables.nodeId,
        assignedUserId: variables.assignedUserId ?? null,
        assignedUserName: null, // Will be populated by server
        effortPoints: variables.effortPoints ?? null,
        color: variables.color ?? "#3b82f6",
        createdAt: new Date(),
        updatedAt: new Date(),
        metric: null,
        isPending: true,
      };

      // Create minimal node - only roleId and pending state
      // Component fetches display data from cache via useRoleData hook
      const optimisticNode: TeamNode = {
        id: nodeId,
        type: "role-node" as const,
        position: nodeOptions.position,
        data: {
          roleId: tempRoleId,
          isPending: true,
          pendingTitle: variables.title,
          pendingColor: variables.color ?? "#3b82f6",
          ...nodeOptions.additionalData,
        },
      };

      setNodes([...currentNodes, optimisticNode]);

      // Handle edges
      const edgeOptions = getEdgeOptions?.(nodeId);
      if (edgeOptions?.createEdges) {
        const newEdges = edgeOptions.createEdges(nodeId, currentEdges);
        setEdges(newEdges);
      } else if (edgeOptions?.sourceNodeId) {
        const { MarkerType } = await import("@xyflow/react");
        const newEdge: TeamEdge = {
          id: `edge-${edgeOptions.sourceNodeId}-${nodeId}`,
          source: edgeOptions.sourceNodeId,
          target: nodeId,
          type: "team-edge",
          animated: true,
          markerEnd: { type: MarkerType.ArrowClosed, width: 20, height: 20 },
        };
        setEdges([...currentEdges, newEdge]);
      }

      markDirty();

      // Add optimistic role to cache
      utils.role.getByTeamId.setData({ teamId }, (old) => {
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
      } as CreateRoleContext;
    },
    onSuccess: (newRole, _variables, context) => {
      if (!context) return;

      // Invalidate caches to ensure fresh data on next fetch
      void utils.team.getById.invalidate({ id: teamId });
      void utils.role.getByTeamId.invalidate({ teamId });

      // Update node with real roleId and clear pending state
      const currentNodes = storeApi.getState().nodes;
      const updatedNodes = currentNodes.map((node) => {
        if (node.id === context.nodeId && node.type === "role-node") {
          return {
            ...node,
            data: {
              roleId: newRole.id,
              // Clear pending fields
              isPending: undefined,
              pendingTitle: undefined,
              pendingColor: undefined,
            },
          };
        }
        return node;
      });
      setNodes(updatedNodes);

      // Replace temp role with real role in cache
      utils.role.getByTeamId.setData({ teamId }, (old) => {
        if (!old) return [newRole];
        return old.map((role) =>
          role.id === context.tempRoleId ? newRole : role,
        );
      });
    },
    onError: (error, _variables, context) => {
      if (context?.previousRoles !== undefined) {
        utils.role.getByTeamId.setData(
          { teamId },
          context.previousRoles as Parameters<
            typeof utils.role.getByTeamId.setData
          >[1],
        );
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
}
