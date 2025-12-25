"use client";

import { useCallback, useEffect, useRef } from "react";

import { useOptimisticRoleUpdate } from "@/hooks/use-optimistic-role-update";

import { useTeamStore } from "../store/team-store";
import { type KpiEdgeData } from "../types/canvas";

/**
 * Hook to synchronize KPI edge changes with the backend.
 * Handles:
 * - Assigning metric to role when KPI edge is created
 * - Unassigning metric from role when KPI edge is deleted
 * - Tracking pending mutations to prevent duplicates
 *
 * IMPORTANT: When a chart node is hidden (removed from canvas), the edge is removed
 * but we DON'T unlink the role-metric relationship. Only unlink when user explicitly
 * deletes the edge while both nodes still exist on the canvas.
 */
export function useRoleMetricSync() {
  const teamId = useTeamStore((state) => state.teamId);
  const edges = useTeamStore((state) => state.edges);
  const nodes = useTeamStore((state) => state.nodes);
  const isInitialized = useTeamStore((state) => state.isInitialized);

  // Track pending mutations to prevent duplicates
  const pendingMutations = useRef(new Map<string, boolean>());

  // Track previous edges to detect additions/removals
  const prevEdgesRef = useRef<typeof edges>([]);

  const updateRole = useOptimisticRoleUpdate(teamId);

  const assignMetricToRole = useCallback(
    (roleId: string, metricId: string) => {
      if (pendingMutations.current.get(roleId)) return;
      pendingMutations.current.set(roleId, true);

      updateRole.mutate(
        { id: roleId, metricId },
        {
          onSettled: () => {
            pendingMutations.current.delete(roleId);
          },
        },
      );
    },
    [updateRole],
  );

  const unassignMetricFromRole = useCallback(
    (roleId: string) => {
      if (pendingMutations.current.get(roleId)) return;
      pendingMutations.current.set(roleId, true);

      // Pass undefined to trigger metricId update; backend converts to null
      updateRole.mutate(
        { id: roleId, metricId: undefined },
        {
          onSettled: () => {
            pendingMutations.current.delete(roleId);
          },
        },
      );
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
    // Only unlink if BOTH nodes still exist (user manually deleted edge)
    // If a node was removed (chart hidden), don't unlink - the edge regenerates on re-add
    for (const edge of removedKpiEdges) {
      const data = edge.data as KpiEdgeData | undefined;
      if (data?.roleId) {
        const sourceExists = nodes.some((n) => n.id === edge.source);
        const targetExists = nodes.some((n) => n.id === edge.target);

        if (sourceExists && targetExists) {
          unassignMetricFromRole(data.roleId);
        }
      }
    }

    prevEdgesRef.current = currentEdges;
  }, [edges, nodes, isInitialized, assignMetricToRole, unassignMetricFromRole]);

  return {
    assignMetricToRole,
    unassignMetricFromRole,
    isPending: updateRole.isPending,
  };
}
