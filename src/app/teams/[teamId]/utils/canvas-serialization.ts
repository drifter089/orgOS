import { type Edge } from "@xyflow/react";

import { type TeamNode } from "../store/team-store";
import { type StoredEdge, type StoredNode } from "../types/canvas";

/**
 * Role data shape from API (team.getById with roles included)
 */
type RoleWithMetric = {
  id: string;
  title: string;
  purpose: string;
  accountabilities: string | null;
  effortPoints: number | null;
  color: string;
  assignedUserId: string | null;
  metric: {
    id: string;
    name: string;
  } | null;
};

/**
 * Serialize TeamNodes to StoredNodes for database storage
 * Strips out UI-only data and keeps only essential fields
 * Handles role-node and text-node types
 * NOTE: Freehand nodes are excluded - drawings are session-only and not persisted
 */
export function serializeNodes(nodes: TeamNode[]): StoredNode[] {
  return nodes
    .filter((node) => node.type !== "freehand") // Exclude freehand nodes from persistence
    .map((node) => {
      // Handle text-node type
      if (node.type === "text-node") {
        // Extract width/height from style for persistence
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

      // Handle role-node type
      return {
        id: node.id,
        type: node.type,
        position: node.position,
        data: {
          roleId: node.data.roleId,
          title: node.data.title,
          color: node.data.color,
        },
      };
    });
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
 * Text nodes are returned as-is (no enrichment needed)
 * NOTE: Freehand nodes are session-only and never loaded from DB
 */
export function enrichNodesWithRoleData(
  storedNodes: StoredNode[],
  roles: RoleWithMetric[],
  userNameMap?: Map<string, string>,
): TeamNode[] {
  return storedNodes.map((node) => {
    // Handle text-node type (no enrichment needed)
    if (node.type === "text-node") {
      return {
        id: node.id,
        type: "text-node" as const,
        position: node.position,
        data: {
          text: node.data?.text ?? "",
          fontSize: node.data?.fontSize,
        },
        // Restore dimensions for resizable node
        style: node.style ?? { width: 180, height: 60 },
      };
    }

    // Handle role-node type (enrich with API data)
    const role = roles.find((r) => r.id === node.data?.roleId);

    const assignedUserName = role?.assignedUserId
      ? (userNameMap?.get(role.assignedUserId) ??
        `User ${role.assignedUserId.substring(0, 8)}`)
      : undefined;

    return {
      id: node.id,
      type: "role-node" as const,
      position: node.position,
      data: {
        roleId: role?.id ?? node.data?.roleId ?? "",
        title: role?.title ?? node.data?.title ?? "Untitled Role",
        purpose: role?.purpose ?? "",
        accountabilities: role?.accountabilities ?? undefined,
        metricId: role?.metric?.id,
        metricName: role?.metric?.name,
        assignedUserId: role?.assignedUserId ?? null,
        assignedUserName,
        effortPoints: role?.effortPoints ?? null,
        color: role?.color ?? node.data?.color ?? "#3b82f6",
      },
    };
  });
}
