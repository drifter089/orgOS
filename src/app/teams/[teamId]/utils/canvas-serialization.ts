import { type Edge } from "@xyflow/react";

import type { RouterOutputs } from "@/trpc/react";

import { type TeamNode } from "../store/team-store";
import { type StoredEdge, type StoredNode } from "../types/canvas";

type DashboardMetrics = RouterOutputs["dashboard"]["getDashboardCharts"];
type DashboardMetricWithRelations = DashboardMetrics[number];

/**
 * Serialize TeamNodes to StoredNodes for database storage.
 * Strips out UI-only data and keeps only essential fields.
 * NOTE: Freehand nodes are excluded - drawings are session-only and not persisted.
 *
 * Role nodes only store { roleId } - all display data comes from TanStack Query cache.
 */
export function serializeNodes(nodes: TeamNode[]): StoredNode[] {
  return nodes
    .filter((node) => node.type !== "freehand")
    .map((node) => {
      if (node.type === "text-node") {
        const style = node.style as
          | { width?: number; height?: number }
          | undefined;
        return {
          id: node.id,
          type: node.type,
          position: node.position,
          data: {
            text: node.data.text,
            fontSize: node.data.fontSize,
          },
          style:
            style?.width || style?.height
              ? { width: style.width, height: style.height }
              : undefined,
        };
      }

      if (node.type === "chart-node") {
        return {
          id: node.id,
          type: node.type,
          position: node.position,
          data: {
            dashboardMetricId: node.data.dashboardMetricId,
          },
        };
      }

      // Role nodes: only store roleId (display data from query cache)
      return {
        id: node.id,
        type: node.type,
        position: node.position,
        data: {
          roleId: node.data.roleId,
        },
      };
    });
}

/**
 * Serialize edges to StoredEdges for database storage.
 * KPI edges include their data for backend sync restoration.
 */
export function serializeEdges(edges: Edge[]): StoredEdge[] {
  return edges.map((edge) => {
    const baseEdge: StoredEdge = {
      id: edge.id,
      source: edge.source,
      target: edge.target,
      sourceHandle: edge.sourceHandle,
      targetHandle: edge.targetHandle,
      type: edge.type,
      animated: edge.animated,
    };

    // Preserve data for KPI edges (contains roleId, metricId for sync)
    if (edge.type === "kpi-edge" && edge.data) {
      baseEdge.data = edge.data as StoredEdge["data"];
    }

    return baseEdge;
  });
}

/**
 * Convert stored nodes to TeamNodes for use in React Flow.
 * Role nodes only need roleId - component fetches display data from cache.
 * Chart nodes are enriched with dashboard metric data.
 * Text nodes are restored with their dimensions.
 */
export function enrichNodesWithRoleData(
  storedNodes: StoredNode[],
  _roles: unknown[], // No longer needed, kept for backward compatibility
  _userNameMap?: Map<string, string>, // No longer needed
  dashboardCharts?: DashboardMetricWithRelations[],
): TeamNode[] {
  const dashboardChartMap = new Map<string, DashboardMetricWithRelations>();
  if (dashboardCharts) {
    for (const dc of dashboardCharts) {
      dashboardChartMap.set(dc.id, dc);
    }
  }

  return storedNodes
    .map((node): TeamNode | null => {
      if (node.type === "text-node") {
        return {
          id: node.id,
          type: "text-node" as const,
          position: node.position,
          data: {
            text: node.data?.text ?? "",
            fontSize: node.data?.fontSize,
          },
          style: node.style ?? { width: 180, height: 60 },
        };
      }

      if (node.type === "chart-node") {
        const dashboardMetricId = node.data?.dashboardMetricId;
        const dashboardMetric = dashboardMetricId
          ? dashboardChartMap.get(dashboardMetricId)
          : undefined;

        if (!dashboardMetric) {
          console.info(
            `Chart node ${node.id} references missing dashboard chart: ${dashboardMetricId}`,
          );
          return null;
        }

        return {
          id: node.id,
          type: "chart-node" as const,
          position: node.position,
          data: {
            dashboardMetricId: dashboardMetric.id,
            dashboardMetric,
          },
        };
      }

      // Role nodes: just pass through roleId, component fetches display data
      // Skip nodes with missing roleId - they are malformed
      if (!node.data?.roleId) {
        console.info(
          `[canvas-serialization] Skipping role node with missing roleId: node.id=${node.id}`,
        );
        return null;
      }

      return {
        id: node.id,
        type: "role-node" as const,
        position: node.position,
        data: {
          roleId: node.data.roleId,
        },
      };
    })
    .filter((node): node is TeamNode => node !== null);
}

/**
 * Clean up orphaned role nodes whose roleId no longer exists in the database.
 * This is a background cleanup utility that can be triggered manually.
 *
 * @param storedNodes - The raw nodes from database
 * @param validRoleIds - Set of role IDs that actually exist in the database
 * @returns Object with cleaned nodes, removed count, and list of removed node IDs
 */
export function cleanupOrphanedRoleNodes(
  storedNodes: StoredNode[],
  validRoleIds: Set<string>,
): {
  cleanedNodes: StoredNode[];
  removedCount: number;
  removedNodeIds: string[];
} {
  const removedNodeIds: string[] = [];

  const cleanedNodes = storedNodes.filter((node) => {
    // Keep non-role nodes
    if (node.type !== "role-node") return true;

    const roleId = node.data?.roleId;
    // Remove if roleId is missing or doesn't exist in the valid set
    if (!roleId || !validRoleIds.has(roleId)) {
      removedNodeIds.push(node.id);
      return false;
    }
    return true;
  });

  return {
    cleanedNodes,
    removedCount: removedNodeIds.length,
    removedNodeIds,
  };
}

/**
 * Clean up edges connected to removed nodes.
 *
 * @param storedEdges - The raw edges from database
 * @param removedNodeIds - List of node IDs that were removed
 * @returns Object with cleaned edges and removed count
 */
export function cleanupOrphanedEdges(
  storedEdges: StoredEdge[],
  removedNodeIds: string[],
): {
  cleanedEdges: StoredEdge[];
  removedCount: number;
} {
  const removedNodeIdSet = new Set(removedNodeIds);

  const cleanedEdges = storedEdges.filter(
    (edge) =>
      !removedNodeIdSet.has(edge.source) && !removedNodeIdSet.has(edge.target),
  );

  return {
    cleanedEdges,
    removedCount: storedEdges.length - cleanedEdges.length,
  };
}
