# React Flow Integration

Complete guide for integrating React Flow (now @xyflow/react) into your Next.js 15 application with TypeScript support.

---

## Overview

React Flow is a powerful library for building node-based editors, workflow visualizations, and interactive diagrams. It provides a flexible API with built-in features like drag-and-drop, zoom/pan, custom nodes, and connections.

**Use Cases:**

- Workflow builders and automation tools
- Data flow visualizations
- Organizational charts and mind maps
- Decision trees and state machines
- Visual programming interfaces

---

## Installation

### 1. Install React Flow

```bash
pnpm add @xyflow/react
```

### 2. Install TypeScript Types (if needed)

Types are included in the package, but you may want additional type definitions:

```bash
pnpm add -D @types/react @types/react-dom
```

---

## Basic Setup

### 1. Create a Client Component

React Flow requires client-side JavaScript, so create a Client Component:

```tsx
// src/components/FlowDiagram.client.tsx
"use client";

import { useCallback } from "react";

import {
  Background,
  Controls,
  type Edge,
  MiniMap,
  type Node,
  type OnConnect,
  ReactFlow,
  addEdge,
  useEdgesState,
  useNodesState,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";

// src/components/FlowDiagram.client.tsx

const initialNodes: Node[] = [
  { id: "1", position: { x: 0, y: 0 }, data: { label: "Node 1" } },
  { id: "2", position: { x: 0, y: 100 }, data: { label: "Node 2" } },
];

const initialEdges: Edge[] = [{ id: "e1-2", source: "1", target: "2" }];

export function FlowDiagram() {
  const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges);

  const onConnect: OnConnect = useCallback(
    (connection) => setEdges((eds) => addEdge(connection, eds)),
    [setEdges],
  );

  return (
    <div style={{ width: "100%", height: "500px" }}>
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onConnect={onConnect}
      >
        <Controls />
        <MiniMap />
        <Background variant="dots" gap={12} size={1} />
      </ReactFlow>
    </div>
  );
}
```

### 2. Use in Server Component

```tsx
// src/app/workflow/page.tsx
import { FlowDiagram } from "@/components/FlowDiagram.client";

export default function WorkflowPage() {
  return (
    <div className="container mx-auto py-8">
      <h1 className="mb-6 text-3xl font-bold">Workflow Editor</h1>
      <FlowDiagram />
    </div>
  );
}
```

---

## Integration with T3 Stack

### Persist Flow State with tRPC

#### 1. Create tRPC Router

```typescript
// src/server/api/routers/flow.ts
import { z } from "zod";

import { createTRPCRouter, protectedProcedure } from "@/server/api/trpc";

const NodeSchema = z.object({
  id: z.string(),
  type: z.string().optional(),
  position: z.object({
    x: z.number(),
    y: z.number(),
  }),
  data: z.record(z.any()),
});

const EdgeSchema = z.object({
  id: z.string(),
  source: z.string(),
  target: z.string(),
  type: z.string().optional(),
});

export const flowRouter = createTRPCRouter({
  getFlow: protectedProcedure
    .input(z.object({ flowId: z.string() }))
    .query(async ({ ctx, input }) => {
      return await ctx.db.flow.findUnique({
        where: { id: input.flowId, userId: ctx.user.id },
      });
    }),

  saveFlow: protectedProcedure
    .input(
      z.object({
        flowId: z.string(),
        nodes: z.array(NodeSchema),
        edges: z.array(EdgeSchema),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      return await ctx.db.flow.upsert({
        where: { id: input.flowId },
        update: {
          nodes: input.nodes,
          edges: input.edges,
        },
        create: {
          id: input.flowId,
          userId: ctx.user.id,
          nodes: input.nodes,
          edges: input.edges,
        },
      });
    }),
});
```

#### 2. Add to Root Router

```typescript
// src/server/api/root.ts
import { flowRouter } from "./routers/flow";

export const appRouter = createCallerFactory(createTRPCRouter)({
  // ... other routers
  flow: flowRouter,
});
```

#### 3. Use in Component

```tsx
"use client";

import { useCallback, useEffect } from "react";

import { ReactFlow, useEdgesState, useNodesState } from "@xyflow/react";

import { api } from "@/trpc/react";

export function PersistedFlow({ flowId }: { flowId: string }) {
  const { data: flowData } = api.flow.getFlow.useQuery({ flowId });
  const saveFlowMutation = api.flow.saveFlow.useMutation();

  const [nodes, setNodes, onNodesChange] = useNodesState(flowData?.nodes ?? []);
  const [edges, setEdges, onEdgesChange] = useEdgesState(flowData?.edges ?? []);

  // Auto-save every 5 seconds
  useEffect(() => {
    const interval = setInterval(() => {
      if (nodes.length > 0 || edges.length > 0) {
        saveFlowMutation.mutate({ flowId, nodes, edges });
      }
    }, 5000);

    return () => clearInterval(interval);
  }, [flowId, nodes, edges]);

  return (
    <ReactFlow
      nodes={nodes}
      edges={edges}
      onNodesChange={onNodesChange}
      onEdgesChange={onEdgesChange}
    />
  );
}
```

---

## Custom Nodes

### 1. Define Custom Node Component

```tsx
// src/components/flow/CustomNode.tsx
"use client";

import { Handle, type NodeProps, Position } from "@xyflow/react";

// src/components/flow/CustomNode.tsx

export function CustomNode({
  data,
}: NodeProps<{ label: string; description?: string }>) {
  return (
    <div className="border-primary bg-background rounded-lg border-2 p-4 shadow-lg">
      <Handle type="target" position={Position.Top} />
      <div>
        <div className="font-bold">{data.label}</div>
        {data.description && (
          <div className="text-muted-foreground text-sm">
            {data.description}
          </div>
        )}
      </div>
      <Handle type="source" position={Position.Bottom} />
    </div>
  );
}
```

### 2. Register Node Types

```tsx
// src/components/FlowDiagram.client.tsx
"use client";

import { type NodeTypes, ReactFlow } from "@xyflow/react";

import { CustomNode } from "./flow/CustomNode";

// src/components/FlowDiagram.client.tsx

const nodeTypes: NodeTypes = {
  custom: CustomNode,
};

export function FlowDiagram() {
  const initialNodes = [
    {
      id: "1",
      type: "custom",
      position: { x: 0, y: 0 },
      data: { label: "Custom Node", description: "This is a custom node" },
    },
  ];

  return (
    <ReactFlow nodes={initialNodes} nodeTypes={nodeTypes}>
      {/* ... */}
    </ReactFlow>
  );
}
```

---

## Styling with Tailwind

### Override Default Styles

```tsx
// globals.css or component CSS
.react-flow__node {
  @apply rounded-lg border-2 border-border bg-background shadow-md;
}

.react-flow__node.selected {
  @apply border-primary ring-2 ring-primary ring-offset-2;
}

.react-flow__edge-path {
  @apply stroke-primary;
}

.react-flow__handle {
  @apply bg-primary;
}
```

### Dark Mode Support

```tsx
"use client";

import { Background, ReactFlow } from "@xyflow/react";
import { useTheme } from "next-themes";

export function FlowDiagram() {
  const { theme } = useTheme();

  return (
    <ReactFlow>
      <Background
        variant="dots"
        gap={12}
        size={1}
        color={theme === "dark" ? "#333" : "#ddd"}
      />
    </ReactFlow>
  );
}
```

---

## Advanced Features

### 1. Sub-flows and Grouping

```tsx
const nodes = [
  {
    id: "group-1",
    type: "group",
    position: { x: 0, y: 0 },
    style: { width: 400, height: 300 },
    data: { label: "Group A" },
  },
  {
    id: "1",
    type: "default",
    position: { x: 50, y: 50 },
    data: { label: "Node 1" },
    parentNode: "group-1",
    extent: "parent",
  },
];
```

### 2. Undo/Redo

```tsx
'use client';

import { useReactFlow } from '@xyflow/react';
import { useState } from 'react';

export function useFlowHistory() {
  const { getNodes, getEdges, setNodes, setEdges } = useReactFlow();
  const [history, setHistory] = useState<Array<{ nodes: Node[]; edges: Edge[] }>>([]);
  const [currentIndex, setCurrentIndex] = useState(-1);

  const save State = () => {
    const newHistory = history.slice(0, currentIndex + 1);
    newHistory.push({ nodes: getNodes(), edges: getEdges() });
    setHistory(newHistory);
    setCurrentIndex(newHistory.length - 1);
  };

  const undo = () => {
    if (currentIndex > 0) {
      const prevState = history[currentIndex - 1];
      setNodes(prevState.nodes);
      setEdges(prevState.edges);
      setCurrentIndex(currentIndex - 1);
    }
  };

  const redo = () => {
    if (currentIndex < history.length - 1) {
      const nextState = history[currentIndex + 1];
      setNodes(nextState.nodes);
      setEdges(nextState.edges);
      setCurrentIndex(currentIndex + 1);
    }
  };

  return { saveState, undo, redo, canUndo: currentIndex > 0, canRedo: currentIndex < history.length - 1 };
}
```

### 3. Export to Image

```tsx
"use client";

import { useReactFlow } from "@xyflow/react";
import { toPng } from "html-to-image";

export function useFlowExport() {
  const { getNodes } = useReactFlow();

  const exportToPng = async () => {
    const flowElement = document.querySelector(".react-flow") as HTMLElement;
    if (!flowElement) return;

    const dataUrl = await toPng(flowElement, {
      backgroundColor: "#ffffff",
      width: flowElement.offsetWidth,
      height: flowElement.offsetHeight,
    });

    const link = document.createElement("a");
    link.download = "flow-diagram.png";
    link.href = dataUrl;
    link.click();
  };

  return { exportToPng };
}
```

---

## Best Practices

### 1. Server Prefetch Flow Data

```tsx
// src/app/workflow/[id]/page.tsx
import { HydrationBoundary, dehydrate } from "@tanstack/react-query";

import { FlowEditor } from "@/components/FlowEditor.client";
import { createQueryClient } from "@/trpc/query-client";
import { api } from "@/trpc/server";

export default async function WorkflowPage({
  params,
}: {
  params: { id: string };
}) {
  const queryClient = createQueryClient();

  // Prefetch flow data on server
  await queryClient.prefetchQuery({
    queryKey: ["flow", "getFlow", { flowId: params.id }],
    queryFn: () => api.flow.getFlow({ flowId: params.id }),
  });

  return (
    <HydrationBoundary state={dehydrate(queryClient)}>
      <FlowEditor flowId={params.id} />
    </HydrationBoundary>
  );
}
```

### 2. Optimize Performance

```tsx
import { memo } from "react";

import type { NodeProps } from "@xyflow/react";

// Memoize custom nodes to prevent unnecessary re-renders
export const CustomNode = memo(({ data }: NodeProps) => {
  return <div>{data.label}</div>;
});

CustomNode.displayName = "CustomNode";
```

### 3. Type-Safe Node Data

```typescript
// src/types/flow.ts
import type { Edge, Node } from "@xyflow/react";

export type CustomNodeData = {
  label: string;
  description?: string;
  icon?: string;
};

export type CustomNode = Node<CustomNodeData, "custom">;

export type FlowState = {
  nodes: CustomNode[];
  edges: Edge[];
};
```

---

## Troubleshooting

### Issue: "Window is not defined"

React Flow requires browser APIs. Ensure you're using it in a Client Component:

```tsx
"use client";

import dynamic from "next/dynamic";

// Dynamic import with no SSR
const FlowDiagram = dynamic(() => import("@/components/FlowDiagram.client"), {
  ssr: false,
  loading: () => <div>Loading diagram...</div>,
});
```

### Issue: Layout/Positioning Issues

Ensure parent container has explicit dimensions:

```tsx
<div style={{ width: "100%", height: "600px" }}>
  <ReactFlow />
</div>
```

### Issue: Handles Not Connecting

Ensure node types are properly registered:

```tsx
const nodeTypes = {
  custom: CustomNode,
};

<ReactFlow nodeTypes={nodeTypes} />;
```

---

## Resources

- [React Flow Documentation](https://reactflow.dev)
- [React Flow Examples](https://reactflow.dev/examples)
- [React Flow TypeScript Guide](https://reactflow.dev/learn/advanced-use/typescript)
- [@xyflow/react on npm](https://www.npmjs.com/package/@xyflow/react)
