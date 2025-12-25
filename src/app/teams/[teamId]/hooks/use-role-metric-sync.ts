"use client";

import { useCallback, useEffect, useRef } from "react";

import { toast } from "sonner";

import { api } from "@/trpc/react";

import { useTeamStore } from "../store/team-store";
import { type KpiEdgeData } from "../types/canvas";

/**
 * Hook to synchronize KPI edge changes with the backend.
 * Handles:
 * - Assigning metric to role when KPI edge is created
 * - Unassigning metric from role when KPI edge is deleted
 * - Tracking pending mutations to prevent duplicates
 */
export function useRoleMetricSync() {
  const teamId = useTeamStore((state) => state.teamId);
  const edges = useTeamStore((state) => state.edges);
  const isInitialized = useTeamStore((state) => state.isInitialized);
  const utils = api.useUtils();

  // Track pending mutations to prevent duplicates
  const pendingMutations = useRef(new Map<string, boolean>());

  // Track previous edges to detect additions/removals
  const prevEdgesRef = useRef<typeof edges>([]);

  const updateRole = api.role.update.useMutation({
    onSuccess: () => {
      void utils.role.getByTeamId.invalidate({ teamId });
      void utils.dashboard.getDashboardCharts.invalidate({ teamId });
    },
    onError: (error) => {
      toast.error(`Failed to sync metric assignment: ${error.message}`);
    },
    onSettled: (_data, _error, variables) => {
      pendingMutations.current.delete(variables.id);
    },
  });

  const assignMetricToRole = useCallback(
    (roleId: string, metricId: string) => {
      if (pendingMutations.current.get(roleId)) return;
      pendingMutations.current.set(roleId, true);

      updateRole.mutate({ id: roleId, metricId });
    },
    [updateRole],
  );

  const unassignMetricFromRole = useCallback(
    (roleId: string) => {
      if (pendingMutations.current.get(roleId)) return;
      pendingMutations.current.set(roleId, true);

      // Pass undefined to trigger metricId update; backend converts to null
      updateRole.mutate({ id: roleId, metricId: undefined });
    },
    [updateRole],
  );

  // Watch for edge changes and sync to backend
  useEffect(() => {
    if (!isInitialized) {
      prevEdgesRef.current = edges;
      return;
    }

    const prevEdges = prevEdgesRef.current;
    const currentEdges = edges;

    // Find KPI edges that were added
    const addedKpiEdges = currentEdges.filter(
      (edge) =>
        edge.type === "kpi-edge" &&
        !prevEdges.some((prev) => prev.id === edge.id),
    );

    // Find KPI edges that were removed
    const removedKpiEdges = prevEdges.filter(
      (edge) =>
        edge.type === "kpi-edge" &&
        !currentEdges.some((curr) => curr.id === edge.id),
    );

    // Assign metrics for new edges
    for (const edge of addedKpiEdges) {
      const data = edge.data as KpiEdgeData | undefined;
      if (data?.roleId && data?.metricId) {
        assignMetricToRole(data.roleId, data.metricId);
      }
    }

    // Unassign metrics for removed edges
    for (const edge of removedKpiEdges) {
      const data = edge.data as KpiEdgeData | undefined;
      if (data?.roleId) {
        unassignMetricFromRole(data.roleId);
      }
    }

    prevEdgesRef.current = currentEdges;
  }, [edges, isInitialized, assignMetricToRole, unassignMetricFromRole]);

  return {
    assignMetricToRole,
    unassignMetricFromRole,
    isPending: updateRole.isPending,
  };
}
