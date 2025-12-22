"use client";

import { useMemo } from "react";

import {
  Background,
  BackgroundVariant,
  ConnectionMode,
  type Edge,
  MarkerType,
  type Node,
  type ProOptions,
  ReactFlow,
  ReactFlowProvider,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import { Eye } from "lucide-react";

import {
  type RoleNodeData,
  RoleNodeMemo,
} from "@/app/teams/[teamId]/_components/role-node";
import { ZoomSlider } from "@/components/react-flow";
import { Badge } from "@/components/ui/badge";
import type { StoredEdge, StoredNode } from "@/lib/canvas";
import { cn } from "@/lib/utils";

import { usePublicView } from "../../../_context/public-view-context";
import {
  type PublicChartNodeData,
  PublicChartNodeMemo,
} from "./public-chart-node-unified";
import { PublicTeamEdge } from "./public-team-edge-unified";
import {
  type PublicTextNodeData,
  PublicTextNodeMemo,
} from "./public-text-node-unified";

const nodeTypes = {
  "role-node": RoleNodeMemo,
  "text-node": PublicTextNodeMemo,
  "chart-node": PublicChartNodeMemo,
};

const edgeTypes = {
  "team-edge": PublicTeamEdge,
};

const proOptions: ProOptions = { hideAttribution: true };

type PublicTeamNode =
  | Node<RoleNodeData, "role-node">
  | Node<PublicTextNodeData, "text-node">
  | Node<PublicChartNodeData, "chart-node">;

export function PublicTeamCanvasUnified() {
  const { team } = usePublicView();

  const nodes = useMemo<PublicTeamNode[]>(() => {
    if (!team) return [];
    const storedNodes = (team.reactFlowNodes as StoredNode[] | null) ?? [];

    return storedNodes.map((node) => {
      if (node.type === "text-node") {
        return {
          id: node.id,
          type: "text-node" as const,
          position: node.position,
          data: {
            text: (node.data as { text?: string })?.text ?? "",
            fontSize: (node.data as { fontSize?: "small" | "medium" | "large" })
              ?.fontSize,
          },
          style: node.style ?? { width: 180, height: 60 },
        };
      }

      if (node.type === "chart-node") {
        const dashboardMetricId = (node.data as { dashboardMetricId?: string })
          ?.dashboardMetricId;

        return {
          id: node.id,
          type: "chart-node" as const,
          position: node.position,
          data: {
            dashboardMetricId: dashboardMetricId ?? "",
          },
        };
      }

      const roleId = (node.data as { roleId?: string })?.roleId ?? "";
      // Find the role data to pass as override for public view
      const role = team?.roles.find((r) => r.id === roleId);

      return {
        id: node.id,
        type: "role-node" as const,
        position: node.position,
        data: {
          roleId,
          readOnly: true,
          // Pass pre-fetched role data to avoid hook calls in public view
          roleDataOverride: role
            ? {
                id: role.id,
                title: role.title,
                purpose: role.purpose,
                color: role.color,
                effortPoints: role.effortPoints,
                assignedUserId: role.assignedUserId,
                assignedUserName: role.assignedUserName,
                metric: role.metric
                  ? {
                      name: role.metric.name,
                      dashboardCharts: role.metric.dashboardCharts,
                    }
                  : null,
              }
            : undefined,
          // Pass pre-resolved user name for public view
          userNameOverride: role?.assignedUserName,
        },
      };
    });
  }, [team]);

  const edges = useMemo<Edge[]>(() => {
    if (!team) return [];
    const storedEdges = (team.reactFlowEdges as StoredEdge[] | null) ?? [];

    return storedEdges.map((edge, index) => ({
      id: `edge-${index}-${edge.source}-${edge.target}`,
      source: edge.source,
      target: edge.target,
      type: "team-edge",
      animated: edge.animated ?? true,
      markerEnd: { type: MarkerType.ArrowClosed, width: 20, height: 20 },
    }));
  }, [team]);

  const viewport = (team?.viewport ?? undefined) as
    | { x: number; y: number; zoom: number }
    | undefined;

  return (
    <ReactFlowProvider>
      <div className="relative h-full w-full">
        <div className="absolute top-4 left-4 z-20">
          <Badge variant="secondary" className="gap-1.5 px-3 py-1.5">
            <Eye className="h-3.5 w-3.5" />
            Preview
          </Badge>
        </div>

        <ReactFlow
          nodes={nodes}
          edges={edges}
          nodeTypes={nodeTypes}
          edgeTypes={edgeTypes}
          proOptions={proOptions}
          connectionMode={ConnectionMode.Loose}
          defaultViewport={viewport}
          fitView={!viewport}
          fitViewOptions={{ maxZoom: 0.65, minZoom: 0.65 }}
          className={cn("bg-background")}
          nodesDraggable={false}
          nodesConnectable={false}
          elementsSelectable={true}
          panOnScroll
          defaultEdgeOptions={{
            type: "team-edge",
            animated: true,
            markerEnd: { type: MarkerType.ArrowClosed, width: 20, height: 20 },
          }}
        >
          <Background variant={BackgroundVariant.Dots} gap={16} size={1} />
          <ZoomSlider position="bottom-left" />
        </ReactFlow>
      </div>
    </ReactFlowProvider>
  );
}
