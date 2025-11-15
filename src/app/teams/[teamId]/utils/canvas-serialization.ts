import { type Edge } from "@xyflow/react";

import { type TeamNode } from "../store/team-store";
import { type StoredEdge, type StoredNode } from "../types/canvas";

/**
 * Role data shape from API (team.getById with roles included)
 * Note: currentValue is no longer stored in Metric model - it's now in MetricDataPoint time-series
 */
type RoleWithMetric = {
  id: string;
  title: string;
  purpose: string;
  color: string;
  assignedUserId: string | null;
  metric: {
    id: string;
    name: string;
    unit: string | null;
  } | null;
};

/**
 * Serialize TeamNodes to StoredNodes for database storage
 * Strips out UI-only data and keeps only essential fields
 */
export function serializeNodes(nodes: TeamNode[]): StoredNode[] {
  return nodes.map((node) => ({
    id: node.id,
    type: node.type,
    position: node.position,
    data: {
      roleId: node.data.roleId,
      title: node.data.title,
      color: node.data.color,
    },
  }));
}

/**
 * Serialize edges to StoredEdges for database storage
 */
export function serializeEdges(edges: Edge[]): StoredEdge[] {
  return edges.map((edge) => ({
    id: edge.id,
    source: edge.source,
    target: edge.target,
    sourceHandle: edge.sourceHandle,
    targetHandle: edge.targetHandle,
    type: edge.type,
    animated: edge.animated,
  }));
}

/**
 * Enrich stored nodes with full role data from API
 * Converts StoredNodes (minimal data) to TeamNodes (full UI data)
 */
export function enrichNodesWithRoleData(
  storedNodes: StoredNode[],
  roles: RoleWithMetric[],
): TeamNode[] {
  return storedNodes.map((node) => {
    const role = roles.find((r) => r.id === node.data?.roleId);

    return {
      id: node.id,
      type: "role-node" as const,
      position: node.position,
      data: {
        roleId: role?.id ?? node.data?.roleId ?? "",
        title: role?.title ?? node.data?.title ?? "Untitled Role",
        purpose: role?.purpose ?? "",
        metricId: role?.metric?.id,
        metricName: role?.metric?.name,
        // TODO: Fetch latest data point value from MetricDataPoint time-series
        metricValue: undefined,
        metricUnit: role?.metric?.unit ?? undefined,
        assignedUserId: role?.assignedUserId ?? null,
        assignedUserName: role?.assignedUserId
          ? `User ${role.assignedUserId.substring(0, 8)}`
          : undefined,
        color: role?.color ?? node.data?.color ?? "#3b82f6",
      },
    };
  });
}
