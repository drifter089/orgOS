"use client";

import { useCallback, useEffect, useRef } from "react";

import { useOptimisticRoleUpdate } from "@/hooks/use-optimistic-role-update";
import { api } from "@/trpc/react";

import { useTeamStore, useTeamStoreApi } from "../store/team-store";
import { type KpiEdgeData } from "../types/canvas";

/**
 * Hook to synchronize KPI edge changes with the backend.
 * Handles:
 * - Assigning metric to role when KPI edge is created on canvas
 * - Unassigning metric from role when KPI edge is deleted on canvas
 * - Creating KPI edges when roles are assigned via drawer (bidirectional sync)
 * - Removing KPI edges when roles are unassigned via drawer
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
  const storeApi = useTeamStoreApi();

  // Track pending mutations to prevent duplicates
  const pendingMutations = useRef(new Map<string, boolean>());

  // Track previous edges to detect additions/removals
  const prevEdgesRef = useRef<typeof edges>([]);

  // Track previous roles to detect assignment changes from drawer
  const prevRolesRef = useRef<Array<{ id: string; metricId: string | null }>>(
    [],
  );

  const updateRole = useOptimisticRoleUpdate(teamId);

  // Subscribe to role changes (for drawer-initiated assignments)
  const { data: roles } = api.role.getByTeamId.useQuery(
    { teamId },
    { enabled: !!teamId },
  );

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

  // Watch for role cache changes (from drawer assignments) and sync edges
  // This creates/removes edges when roles are assigned/unassigned via the metric drawer
  useEffect(() => {
    if (!isInitialized || !roles) {
      // Initialize previous roles on first load
      if (roles) {
        prevRolesRef.current = roles.map((r) => ({
          id: r.id,
          metricId: r.metricId,
        }));
      }
      return;
    }

    const prevRoles = prevRolesRef.current;
    const currentNodes = storeApi.getState().nodes;
    const currentEdges = storeApi.getState().edges;

    // Detect role-metric assignment changes
    const changes: Array<{
      roleId: string;
      oldMetricId: string | null;
      newMetricId: string | null;
    }> = [];

    for (const role of roles) {
      const prevRole = prevRoles.find((pr) => pr.id === role.id);
      if (prevRole && prevRole.metricId !== role.metricId) {
        changes.push({
          roleId: role.id,
          oldMetricId: prevRole.metricId,
          newMetricId: role.metricId,
        });
      }
    }

    if (changes.length === 0) {
      prevRolesRef.current = roles.map((r) => ({
        id: r.id,
        metricId: r.metricId,
      }));
      return;
    }

    // Build lookup: roleId -> roleNodeId
    const roleToNode = new Map<string, string>();
    for (const node of currentNodes) {
      if (node.type === "role-node" && node.data.roleId) {
        roleToNode.set(node.data.roleId, node.id);
      }
    }

    // Build lookup: metricId -> chartNodeId
    const metricToChartNode = new Map<string, string>();
    for (const node of currentNodes) {
      if (node.type === "chart-node" && node.data.dashboardMetric?.metric?.id) {
        metricToChartNode.set(node.data.dashboardMetric.metric.id, node.id);
      }
    }

    let edgesChanged = false;
    let newEdges = [...currentEdges];

    for (const change of changes) {
      const roleNodeId = roleToNode.get(change.roleId);
      if (!roleNodeId) continue; // Role not on canvas

      // Remove old edge if exists
      if (change.oldMetricId) {
        const oldChartNodeId = metricToChartNode.get(change.oldMetricId);
        if (oldChartNodeId) {
          const edgeToRemove = newEdges.find(
            (e) =>
              e.type === "kpi-edge" &&
              ((e.source === roleNodeId && e.target === oldChartNodeId) ||
                (e.source === oldChartNodeId && e.target === roleNodeId)),
          );
          if (edgeToRemove) {
            newEdges = newEdges.filter((e) => e.id !== edgeToRemove.id);
            edgesChanged = true;
          }
        }
      }

      // Add new edge if metric assigned
      if (change.newMetricId) {
        const chartNodeId = metricToChartNode.get(change.newMetricId);
        if (chartNodeId) {
          // Check if edge already exists
          const edgeExists = newEdges.some(
            (e) =>
              (e.source === roleNodeId && e.target === chartNodeId) ||
              (e.source === chartNodeId && e.target === roleNodeId),
          );

          if (!edgeExists) {
            const edgeData: KpiEdgeData = {
              roleId: change.roleId,
              metricId: change.newMetricId,
            };

            newEdges.push({
              id: `kpi-edge-${roleNodeId}-${chartNodeId}`,
              source: roleNodeId,
              target: chartNodeId,
              type: "kpi-edge",
              animated: true,
              data: edgeData,
            });
            edgesChanged = true;
          }
        }
      }
    }

    if (edgesChanged) {
      storeApi.getState().setEdges(newEdges);
      storeApi.getState().markDirty();
    }

    prevRolesRef.current = roles.map((r) => ({
      id: r.id,
      metricId: r.metricId,
    }));
  }, [roles, isInitialized, storeApi]);

  return {
    assignMetricToRole,
    unassignMetricFromRole,
    isPending: updateRole.isPending,
  };
}
