import type { RouterOutputs } from "@/trpc/react";

import type {
  KpiEdgeData,
  StoredEdge,
  TeamStoredNodeData,
} from "../types/canvas";

type Role = RouterOutputs["role"]["getByTeamId"][number];
type DashboardChart = RouterOutputs["dashboard"]["getDashboardCharts"][number];

interface StoredNode {
  id: string;
  type?: string;
  data?: TeamStoredNodeData;
}

/**
 * Generates KPI edges for roles that have metrics assigned.
 * Called during canvas initialization to sync existing role-metric
 * assignments from the database to the canvas visualization.
 *
 * @param nodes - Current canvas nodes
 * @param existingEdges - Edges already stored in canvas
 * @param roles - Roles with their metric assignments
 * @param dashboardCharts - Dashboard charts to map metricId to chartNodeId
 * @returns Array of edges including newly generated KPI edges
 */
export function generateMetricEdges(
  nodes: StoredNode[],
  existingEdges: StoredEdge[],
  roles: Role[],
  dashboardCharts: DashboardChart[],
): StoredEdge[] {
  const newEdges: StoredEdge[] = [];

  // Build lookup: metricId -> chartNodeId
  // Chart nodes store dashboardMetricId, and DashboardChart has metricId
  const metricToChartNode = new Map<string, string>();

  for (const node of nodes) {
    if (node.type === "chart-node" && node.data?.dashboardMetricId) {
      const chart = dashboardCharts.find(
        (dc) => dc.id === node.data?.dashboardMetricId,
      );
      if (chart?.metricId) {
        metricToChartNode.set(chart.metricId, node.id);
      }
    }
  }

  // Build lookup: roleId -> nodeId
  const roleToNode = new Map<string, string>();
  for (const node of nodes) {
    if (node.type === "role-node" && node.data?.roleId) {
      roleToNode.set(node.data.roleId, node.id);
    }
  }

  // Generate edges for roles with metrics
  for (const role of roles) {
    if (!role.metricId) continue;

    const roleNodeId = roleToNode.get(role.id);
    const chartNodeId = metricToChartNode.get(role.metricId);

    // Skip if either node is not on canvas
    if (!roleNodeId || !chartNodeId) continue;

    // Check if edge already exists (in either direction)
    const edgeExists = existingEdges.some(
      (e) =>
        (e.source === roleNodeId && e.target === chartNodeId) ||
        (e.source === chartNodeId && e.target === roleNodeId),
    );

    if (edgeExists) continue;

    // Create new KPI edge
    const edgeData: KpiEdgeData = {
      roleId: role.id,
      metricId: role.metricId,
    };

    newEdges.push({
      id: `kpi-edge-${roleNodeId}-${chartNodeId}`,
      source: roleNodeId,
      target: chartNodeId,
      type: "kpi-edge",
      animated: true,
      data: edgeData,
    });
  }

  return [...existingEdges, ...newEdges];
}

/**
 * Check if an edge connects a role node to a chart node.
 * Used to determine if an edge should be a KPI edge.
 */
export function isRoleChartConnection(
  sourceNodeType: string | undefined,
  targetNodeType: string | undefined,
): boolean {
  return (
    (sourceNodeType === "role-node" && targetNodeType === "chart-node") ||
    (sourceNodeType === "chart-node" && targetNodeType === "role-node")
  );
}

/**
 * Determine the appropriate edge type based on connected node types.
 */
export function determineEdgeType(
  sourceNodeType: string | undefined,
  targetNodeType: string | undefined,
): "kpi-edge" | "team-edge" {
  return isRoleChartConnection(sourceNodeType, targetNodeType)
    ? "kpi-edge"
    : "team-edge";
}
