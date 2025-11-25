"use client";

import { useEffect, useState } from "react";

import {
  Background,
  BackgroundVariant,
  type Edge,
  Handle,
  type Node,
  Position,
  ReactFlow,
  useEdgesState,
  useNodesState,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import {
  Activity,
  Code,
  Palette,
  Target,
  User,
  Users,
  Zap,
} from "lucide-react";

// Custom node component
function RoleNode({
  data,
}: {
  data: { label: string; purpose: string; color: string; icon: string };
}) {
  const Icon =
    {
      User,
      Target,
      Code,
      Palette,
      Zap,
      Users,
      Activity,
    }[data.icon] ?? User;

  return (
    <div
      className="bg-card group relative rounded-lg border-2 shadow-lg transition-all duration-200"
      style={{
        borderColor: data.color,
        minWidth: "200px",
        maxWidth: "200px",
      }}
    >
      {/* Top Handle */}
      <Handle
        type="target"
        position={Position.Top}
        className="!h-3 !w-3 !border-2"
        style={{
          background: data.color,
          borderColor: "white",
        }}
      />

      {/* Header */}
      <div
        className="flex items-center gap-2 rounded-t-md px-3 py-2"
        style={{
          backgroundColor: `${data.color}20`,
        }}
      >
        <Icon className="h-4 w-4" style={{ color: data.color }} />
        <h3 className="truncate text-xs font-semibold">{data.label}</h3>
      </div>

      {/* Body */}
      <div className="px-3 py-1.5">
        <p className="text-muted-foreground line-clamp-2 text-[10px]">
          {data.purpose}
        </p>
      </div>

      {/* Bottom Handle */}
      <Handle
        type="source"
        position={Position.Bottom}
        className="!h-3 !w-3 !border-2"
        style={{
          background: data.color,
          borderColor: "white",
        }}
      />
    </div>
  );
}

const nodeTypes = {
  roleNode: RoleNode,
};

// Graph-style layout with better spacing
const initialNodes: Node[] = [
  // Center CEO node
  {
    id: "1",
    type: "roleNode",
    data: {
      label: "CEO",
      purpose: "Strategic vision and leadership",
      color: "#8b5cf6",
      icon: "Target",
    },
    position: { x: 300, y: 0 },
    draggable: false,
  },
  // Second level - spread wider
  {
    id: "2",
    type: "roleNode",
    data: {
      label: "Product Lead",
      purpose: "Product strategy",
      color: "#3b82f6",
      icon: "Zap",
    },
    position: { x: 50, y: 120 },
    draggable: false,
  },
  {
    id: "3",
    type: "roleNode",
    data: {
      label: "Engineering",
      purpose: "Technical delivery",
      color: "#10b981",
      icon: "Code",
    },
    position: { x: 300, y: 120 },
    draggable: false,
  },
  {
    id: "4",
    type: "roleNode",
    data: {
      label: "Operations",
      purpose: "Business ops",
      color: "#f59e0b",
      icon: "Activity",
    },
    position: { x: 550, y: 120 },
    draggable: false,
  },
  // Third level - team members
  {
    id: "5",
    type: "roleNode",
    data: {
      label: "UX Designer",
      purpose: "User experience",
      color: "#ec4899",
      icon: "Palette",
    },
    position: { x: 0, y: 240 },
    draggable: false,
  },
  {
    id: "6",
    type: "roleNode",
    data: {
      label: "Product Manager",
      purpose: "Product execution",
      color: "#06b6d4",
      icon: "Users",
    },
    position: { x: 220, y: 240 },
    draggable: false,
  },
  {
    id: "7",
    type: "roleNode",
    data: {
      label: "Backend Dev",
      purpose: "Server infrastructure",
      color: "#14b8a6",
      icon: "Code",
    },
    position: { x: 440, y: 240 },
    draggable: false,
  },
  {
    id: "8",
    type: "roleNode",
    data: {
      label: "DevOps",
      purpose: "Infrastructure",
      color: "#f97316",
      icon: "Activity",
    },
    position: { x: 660, y: 240 },
    draggable: false,
  },
];

const initialEdges: Edge[] = [
  // CEO connections - purple animated
  {
    id: "e1-2",
    source: "1",
    target: "2",
    animated: true,
    style: {
      stroke: "#8b5cf6",
      strokeWidth: 2.5,
    },
  },
  {
    id: "e1-3",
    source: "1",
    target: "3",
    animated: true,
    style: {
      stroke: "#8b5cf6",
      strokeWidth: 2.5,
    },
  },
  {
    id: "e1-4",
    source: "1",
    target: "4",
    animated: true,
    style: {
      stroke: "#8b5cf6",
      strokeWidth: 2.5,
    },
  },
  // Product Lead connections - blue animated
  {
    id: "e2-5",
    source: "2",
    target: "5",
    animated: true,
    style: {
      stroke: "#3b82f6",
      strokeWidth: 2,
    },
  },
  {
    id: "e2-6",
    source: "2",
    target: "6",
    animated: true,
    style: {
      stroke: "#3b82f6",
      strokeWidth: 2,
    },
  },
  // Engineering connections - green animated
  {
    id: "e3-7",
    source: "3",
    target: "7",
    animated: true,
    style: {
      stroke: "#10b981",
      strokeWidth: 2,
    },
  },
  // Operations connections - orange animated
  {
    id: "e4-8",
    source: "4",
    target: "8",
    animated: true,
    style: {
      stroke: "#f59e0b",
      strokeWidth: 2,
    },
  },
  // Cross-team collaboration - dashed lines
  {
    id: "e6-7",
    source: "6",
    target: "7",
    animated: false,
    style: {
      stroke: "rgba(255, 255, 255, 0.3)",
      strokeWidth: 1.5,
      strokeDasharray: "5,5",
    },
  },
  {
    id: "e5-6",
    source: "5",
    target: "6",
    animated: false,
    style: {
      stroke: "rgba(255, 255, 255, 0.3)",
      strokeWidth: 1.5,
      strokeDasharray: "5,5",
    },
  },
  {
    id: "e7-8",
    source: "7",
    target: "8",
    animated: false,
    style: {
      stroke: "rgba(255, 255, 255, 0.3)",
      strokeWidth: 1.5,
      strokeDasharray: "5,5",
    },
  },
];

export function MiniRoleCanvas() {
  const [nodes] = useNodesState(initialNodes);
  const [edges] = useEdgesState(initialEdges);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return (
      <div className="flex h-full w-full items-center justify-center">
        <div className="text-white">Loading canvas...</div>
      </div>
    );
  }

  return (
    <div className="h-full w-full">
      <ReactFlow
        nodes={nodes}
        edges={edges}
        nodeTypes={nodeTypes}
        fitView
        fitViewOptions={{
          padding: 0.05,
          maxZoom: 1.5,
          minZoom: 1.5,
        }}
        attributionPosition="bottom-right"
        proOptions={{ hideAttribution: true }}
        className="bg-transparent"
        nodesDraggable={false}
        nodesConnectable={false}
        elementsSelectable={false}
        zoomOnScroll={false}
        panOnScroll={false}
        panOnDrag={false}
        zoomOnDoubleClick={false}
        preventScrolling={false}
      >
        <Background
          variant={BackgroundVariant.Dots}
          gap={16}
          size={1}
          color="rgba(255, 255, 255, 0.15)"
        />
      </ReactFlow>
    </div>
  );
}
