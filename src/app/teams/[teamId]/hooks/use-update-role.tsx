"use client";

import { toast } from "sonner";

import { api } from "@/trpc/react";

import {
  type TeamNode,
  useTeamStore,
  useTeamStoreApi,
} from "../store/team-store";

/** Member type for assignedUserName lookup */
interface Member {
  id: string;
  firstName?: string | null;
  lastName?: string | null;
  email: string;
}

/** Metric type for metricName lookup */
interface Metric {
  id: string;
  name: string;
}

export interface UseUpdateRoleOptions {
  teamId: string;
  /** Callback before mutation (e.g., close dialog) */
  onBeforeMutate?: () => void;
  /** Metric lookup for optimistic data */
  getMetric?: (metricId: string) => Metric | null | undefined;
  /** Member lookup for optimistic data */
  getMember?: (userId: string) => Member | null | undefined;
}

/**
 * Shared hook for updating roles with optimistic updates
 */
export function useUpdateRole({
  teamId,
  onBeforeMutate,
  getMetric,
  getMember,
}: UseUpdateRoleOptions) {
  const storeApi = useTeamStoreApi();
  const setNodes = useTeamStore((state) => state.setNodes);
  const markDirty = useTeamStore((state) => state.markDirty);
  const utils = api.useUtils();

  return api.role.update.useMutation({
    onMutate: async (variables) => {
      onBeforeMutate?.();

      await utils.role.getByTeam.cancel({ teamId });

      const previousRoles = utils.role.getByTeam.getData({ teamId });
      const currentNodes = storeApi.getState().nodes;
      const previousNodes = [...currentNodes];

      const selectedMetric = variables.metricId
        ? getMetric?.(variables.metricId)
        : null;

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

      const updatedNodes: TeamNode[] = currentNodes.map((node) => {
        if (node.type === "role-node" && node.data.roleId === variables.id) {
          return {
            ...node,
            data: {
              ...node.data,
              title: variables.title ?? node.data.title,
              purpose: variables.purpose ?? node.data.purpose,
              accountabilities: variables.accountabilities ?? undefined,
              metricId: variables.metricId ?? undefined,
              metricName: selectedMetric?.name ?? undefined,
              assignedUserId: variables.assignedUserId ?? null,
              assignedUserName,
              color: variables.color ?? node.data.color,
              effortPoints:
                variables.effortPoints !== undefined
                  ? variables.effortPoints
                  : node.data.effortPoints,
            },
          };
        }
        return node;
      });

      setNodes(updatedNodes);
      markDirty();

      utils.role.getByTeam.setData({ teamId }, (old) => {
        if (!old) return old;
        return old.map((role) =>
          role.id === variables.id
            ? {
                ...role,
                title: variables.title ?? role.title,
                purpose: variables.purpose ?? role.purpose,
                accountabilities: variables.accountabilities ?? null,
                metricId: variables.metricId ?? null,
                assignedUserId: variables.assignedUserId ?? null,
                color: variables.color ?? role.color,
                metric: null,
                effortPoints:
                  variables.effortPoints !== undefined
                    ? variables.effortPoints
                    : role.effortPoints,
              }
            : role,
        );
      });

      return { previousRoles, previousNodes };
    },
    onSuccess: (updatedRole) => {
      const currentNodes = storeApi.getState().nodes;
      const updatedNodes = currentNodes.map((node) => {
        if (node.type === "role-node" && node.data.roleId === updatedRole.id) {
          return {
            ...node,
            data: {
              ...node.data,
              metricName: updatedRole.metric?.name ?? undefined,
              effortPoints: updatedRole.effortPoints ?? undefined,
            },
          };
        }
        return node;
      });
      setNodes(updatedNodes);

      utils.role.getByTeam.setData({ teamId }, (old) => {
        if (!old) return [updatedRole];
        return old.map((role) =>
          role.id === updatedRole.id ? updatedRole : role,
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
      toast.error("Failed to update role", {
        description: error.message ?? "An unexpected error occurred",
      });
    },
  });
}
