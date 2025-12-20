"use client";

import { toast } from "sonner";

import { api } from "@/trpc/react";

import { useTeamStore, useTeamStoreApi } from "../store/team-store";

/**
 * Shared hook for deleting roles with optimistic updates
 * Used by both RoleNode component and TeamSheetSidebar
 */
export function useDeleteRole(teamId: string) {
  const storeApi = useTeamStoreApi();
  const setNodes = useTeamStore((state) => state.setNodes);
  const setEdges = useTeamStore((state) => state.setEdges);
  const markDirty = useTeamStore((state) => state.markDirty);
  const utils = api.useUtils();

  return api.role.delete.useMutation({
    onMutate: async (variables) => {
      await utils.role.getByTeamId.cancel({ teamId });

      const previousRoles = utils.role.getByTeamId.getData({ teamId });
      const { nodes: currentNodes, edges: currentEdges } = storeApi.getState();
      const previousNodes = [...currentNodes];
      const previousEdges = [...currentEdges];

      utils.role.getByTeamId.setData({ teamId }, (old) => {
        if (!old) return [];
        return old.filter((role) => role.id !== variables.id);
      });

      const nodeToRemove = currentNodes.find(
        (node) =>
          node.type === "role-node" && node.data.roleId === variables.id,
      );

      if (nodeToRemove) {
        const updatedNodes = currentNodes.filter(
          (node) => node.id !== nodeToRemove.id,
        );
        const updatedEdges = currentEdges.filter(
          (edge) =>
            edge.source !== nodeToRemove.id && edge.target !== nodeToRemove.id,
        );
        setNodes(updatedNodes);
        setEdges(updatedEdges);
        markDirty();
      }

      return { previousRoles, previousNodes, previousEdges };
    },
    onError: (error, _variables, context) => {
      toast.error("Failed to delete role", {
        description: error.message ?? "An unexpected error occurred",
      });
      if (context?.previousRoles !== undefined) {
        utils.role.getByTeamId.setData({ teamId }, context.previousRoles);
      }
      if (context?.previousNodes && context?.previousEdges) {
        setNodes(context.previousNodes);
        setEdges(context.previousEdges);
      }
    },
    onSettled: () => {
      void utils.role.getByTeamId.invalidate({ teamId });
      // Invalidate team.getById cache to ensure fresh data on next fetch
      void utils.team.getById.invalidate({ id: teamId });
    },
  });
}
