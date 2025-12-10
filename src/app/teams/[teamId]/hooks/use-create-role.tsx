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
  /** Optional metric lookup for optimistic data */
  getMetric?: (
    metricId: string,
  ) => { id: string; name: string } | null | undefined;
  /** Optional member lookup for optimistic data */
  getMember?: (
    userId: string,
  ) =>
    | { firstName?: string | null; lastName?: string | null; email: string }
    | null
    | undefined;
}

/**
 * Shared hook for creating roles with optimistic updates
 * Used by RoleDialog, TeamCanvas, and TeamEdge components
 */
export function useCreateRole({
  teamId,
  getNodeOptions,
  getEdgeOptions,
  onBeforeMutate,
  getMetric,
  getMember,
}: UseCreateRoleOptions) {
  const storeApi = useTeamStoreApi();
  const setNodes = useTeamStore((state) => state.setNodes);
  const setEdges = useTeamStore((state) => state.setEdges);
  const markDirty = useTeamStore((state) => state.markDirty);
  const utils = api.useUtils();

  return api.role.create.useMutation({
    onMutate: async (variables) => {
      onBeforeMutate?.();
      await utils.role.getByTeam.cancel({ teamId });

      const previousRoles = utils.role.getByTeam.getData({ teamId });
      const { nodes: currentNodes, edges: currentEdges } = storeApi.getState();
      const previousNodes = [...currentNodes];
      const previousEdges = [...currentEdges];

      const tempRoleId = `temp-role-${nanoid(8)}`;
      const nodeId = variables.nodeId;

      const selectedMetric = variables.metricId
        ? getMetric?.(variables.metricId)
        : null;

      // Metric populated on success from server response
      const optimisticRole = {
        id: tempRoleId,
        title: variables.title,
        purpose: variables.purpose,
        accountabilities: variables.accountabilities ?? null,
        teamId: variables.teamId,
        metricId: variables.metricId ?? null,
        nodeId: variables.nodeId,
        assignedUserId: variables.assignedUserId ?? null,
        effortPoints: variables.effortPoints ?? null,
        color: variables.color ?? "#3b82f6",
        createdAt: new Date(),
        updatedAt: new Date(),
        metric: null,
        isPending: true,
      };

      const nodeOptions = getNodeOptions(variables);

      let assignedUserName: string | undefined;
      if (variables.assignedUserId && getMember) {
        const member = getMember(variables.assignedUserId);
        if (member) {
          assignedUserName =
            [member.firstName, member.lastName].filter(Boolean).join(" ") ||
            member.email;
        } else {
          assignedUserName = `User ${variables.assignedUserId.substring(0, 8)}`;
        }
      }

      const optimisticNode: TeamNode = {
        id: nodeId,
        type: "role-node" as const,
        position: nodeOptions.position,
        data: {
          roleId: tempRoleId,
          title: variables.title,
          purpose: variables.purpose,
          accountabilities: variables.accountabilities ?? undefined,
          metricId: variables.metricId ?? undefined,
          metricName: selectedMetric?.name ?? undefined,
          assignedUserId: variables.assignedUserId ?? null,
          assignedUserName,
          effortPoints: variables.effortPoints ?? null,
          color: variables.color ?? "#3b82f6",
          isPending: true,
          ...nodeOptions.additionalData,
        },
      };

      setNodes([...currentNodes, optimisticNode]);

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
      } as CreateRoleContext;
    },
    onSuccess: (newRole, _variables, context) => {
      if (!context) return;

      // Invalidate team.getById cache to ensure fresh data on next fetch
      void utils.team.getById.invalidate({ id: teamId });

      const currentNodes = storeApi.getState().nodes;
      const updatedNodes = currentNodes.map((node) => {
        if (node.id === context.nodeId && node.type === "role-node") {
          return {
            ...node,
            data: {
              ...node.data,
              roleId: newRole.id,
              metricName: newRole.metric?.name ?? undefined,
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
    onError: (error, _variables, context) => {
      if (context?.previousRoles !== undefined) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        utils.role.getByTeam.setData({ teamId }, context.previousRoles as any);
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
