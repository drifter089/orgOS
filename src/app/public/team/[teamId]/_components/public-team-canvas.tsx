"use client";

import { useMemo } from "react";

import {
  Background,
  BackgroundVariant,
  MarkerType,
  type Node,
  type ProOptions,
  ReactFlow,
  ReactFlowProvider,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import { Eye } from "lucide-react";

import { ZoomSlider } from "@/components/react-flow";
import { Badge } from "@/components/ui/badge";
import type { StoredEdge, StoredNode } from "@/lib/canvas";
import { cn } from "@/lib/utils";
import type { RouterOutputs } from "@/trpc/react";

import {
  type PublicRoleNodeData,
  PublicRoleNodeMemo,
} from "./public-role-node";
import { PublicTeamEdge } from "./public-team-edge";
import {
  type PublicTextNodeData,
  PublicTextNodeMemo,
} from "./public-text-node";

type PublicTeamData = RouterOutputs["publicView"]["getTeamByShareToken"];

const nodeTypes = {
  "role-node": PublicRoleNodeMemo,
  "text-node": PublicTextNodeMemo,
};

const edgeTypes = {
  "team-edge": PublicTeamEdge,
};

const proOptions: ProOptions = { hideAttribution: true };

interface PublicTeamCanvasProps {
  team: PublicTeamData;
}

type PublicTeamNode = Node<PublicRoleNodeData | PublicTextNodeData>;

export function PublicTeamCanvas({ team }: PublicTeamCanvasProps) {
  const nodes = useMemo(() => {
    const storedNodes = (team.reactFlowNodes as StoredNode[]) ?? [];

    return storedNodes.map((node): PublicTeamNode => {
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

      const roleId = (node.data as { roleId?: string })?.roleId;
      const role = team.roles.find((r) => r.id === roleId);

      return {
        id: node.id,
        type: "role-node" as const,
        position: node.position,
        data: {
          roleId: role?.id ?? roleId ?? "",
          title: role?.title ?? "Untitled Role",
          purpose: role?.purpose ?? "",
          accountabilities: role?.accountabilities ?? undefined,
          metricId: role?.metric?.id,
          metricName: role?.metric?.name,
          assignedUserId: role?.assignedUserId ?? null,
          color: role?.color ?? "#3b82f6",
        },
      };
    });
  }, [team.reactFlowNodes, team.roles]);

  const edges = useMemo(() => {
    const storedEdges = (team.reactFlowEdges as StoredEdge[]) ?? [];

    return storedEdges.map((edge) => ({
      id: edge.id,
      source: edge.source,
      target: edge.target,
      sourceHandle: edge.sourceHandle,
      targetHandle: edge.targetHandle,
      type: "team-edge",
      animated: edge.animated ?? true,
      markerEnd: { type: MarkerType.ArrowClosed, width: 20, height: 20 },
    }));
  }, [team.reactFlowEdges]);

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
          fitView
          fitViewOptions={{
            maxZoom: 0.65,
            minZoom: 0.65,
          }}
          className={cn("bg-background")}
          nodesDraggable={false}
          nodesConnectable={false}
          elementsSelectable={false}
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
