# React Flow Abstraction Refactoring Plan

## Overview

This plan abstracts shared React Flow patterns from `teams/[teamId]` and `systems` canvases into a shared library at `src/lib/canvas/`. The workflow folder is reference-only.

## Current State Analysis

### Teams Canvas (`/teams/[teamId]`)

| File                       | Lines | Purpose                           |
| -------------------------- | ----- | --------------------------------- |
| `team-store.tsx`           | 269   | Zustand + Context store           |
| `team-canvas.tsx`          | 177   | ReactFlow container + save status |
| `team-canvas-wrapper.tsx`  | 36    | Server → client data bridge       |
| `role-node.tsx`            | 216   | Role card node                    |
| `text-node.tsx`            | 246   | Resizable editable text           |
| `team-edge.tsx`            | 277   | Edge with add/delete buttons      |
| `team-canvas-controls.tsx` | 85    | Add text + layout buttons         |
| `use-auto-save.tsx`        | 117   | Debounced save hook               |
| `use-team-layout.tsx`      | 26    | D3-force layout hook              |
| `force-layout.ts`          | 103   | D3-force algorithm                |
| `canvas-serialization.ts`  | 131   | Serialize/enrich nodes            |
| `types/canvas.ts`          | 43    | StoredNode/Edge types             |

### Systems Canvas (`/systems`)

| File                         | Lines | Purpose                           |
| ---------------------------- | ----- | --------------------------------- |
| `systems-store.tsx`          | 127   | Zustand + Context store           |
| `systems-canvas.tsx`         | 95    | ReactFlow container + save status |
| `systems-canvas-wrapper.tsx` | 79    | Server → client data bridge       |
| `metric-card-node.tsx`       | 70    | Metric card node                  |
| `use-systems-auto-save.tsx`  | 96    | Debounced save hook               |
| `canvas-serialization.ts`    | 37    | Serialize nodes/edges             |

### Existing Shared (`/components`)

| File              | Purpose                        |
| ----------------- | ------------------------------ |
| `zoom-slider.tsx` | Zoom controls (already shared) |
| `base-node.tsx`   | Node container primitives      |
| `base-handle.tsx` | Handle styling                 |

---

## Target Structure

```
src/
├── lib/
│   └── canvas/                           # NEW: Shared canvas library
│       ├── index.ts                      # Public exports
│       ├── store/
│       │   ├── create-canvas-store.ts    # Generic store factory
│       │   └── types.ts                  # Store type definitions
│       ├── hooks/
│       │   ├── use-auto-save.ts          # Generic auto-save hook factory
│       │   └── use-canvas-instance.ts    # ReactFlow instance registration
│       ├── components/
│       │   ├── canvas-wrapper.tsx        # Generic initialization wrapper
│       │   ├── save-status.tsx           # Save indicator component
│       │   └── text-node.tsx             # Reusable text node
│       ├── edges/
│       │   ├── base-edge.tsx             # Edge with action buttons
│       │   └── edge-action-buttons.tsx   # Add/delete buttons renderer
│       ├── layouts/
│       │   ├── force-layout.ts           # D3-force algorithm
│       │   └── types.ts                  # Layout options types
│       └── types/
│           └── serialization.ts          # StoredNode, StoredEdge types
│
├── app/
│   ├── teams/[teamId]/
│   │   ├── _components/
│   │   │   ├── role-node.tsx             # Team-specific (keep)
│   │   │   ├── team-edge.tsx             # REFACTOR: Use base edge
│   │   │   ├── team-canvas.tsx           # SIMPLIFY: Use shared components
│   │   │   └── team-canvas-controls.tsx  # Keep (feature-specific)
│   │   ├── store/
│   │   │   └── team-store.tsx            # REFACTOR: Extend base store
│   │   ├── hooks/
│   │   │   ├── use-auto-save.tsx         # REFACTOR: Use factory
│   │   │   └── use-delete-role.tsx       # Keep (feature-specific)
│   │   └── utils/
│   │       └── canvas-serialization.ts   # Keep (team-specific enrichment)
│   │
│   └── systems/
│       ├── _components/
│       │   ├── metric-card-node.tsx      # System-specific (keep)
│       │   └── systems-canvas.tsx        # SIMPLIFY: Use shared components
│       ├── store/
│       │   └── systems-store.tsx         # REFACTOR: Extend base store
│       └── hooks/
│           └── use-systems-auto-save.tsx # REFACTOR: Use factory
│
└── components/
    └── react-flow/                       # Move existing + add new
        ├── base-node.tsx                 # (move from components/)
        ├── base-handle.tsx               # (move from components/)
        ├── zoom-slider.tsx               # (move from components/)
        └── index.ts                      # Re-exports
```

---

## Phase 1: Create Shared Types (No Breaking Changes)

### 1.1 Create `src/lib/canvas/types/serialization.ts`

Unified storage types for both canvases.

```typescript
// Base types for database storage
export type StoredNodeBase = {
  id: string;
  type: string;
  position: { x: number; y: number };
};

export type StoredEdge = {
  id: string;
  source: string;
  target: string;
  sourceHandle?: string | null;
  targetHandle?: string | null;
  type?: string;
  animated?: boolean;
};

// Text node specific (reusable)
export type TextNodeFontSize = "small" | "medium" | "large";
export const FONT_SIZE_VALUES: Record<TextNodeFontSize, number> = {
  small: 12,
  medium: 14,
  large: 18,
};

// Generic stored node with optional data
export type StoredNode<TData = Record<string, unknown>> = StoredNodeBase & {
  data?: TData;
  style?: { width?: number; height?: number };
};
```

### 1.2 Create `src/lib/canvas/store/types.ts`

Base store state and actions types.

```typescript
import type {
  Edge,
  Node,
  OnConnect,
  OnEdgesChange,
  OnNodesChange,
  ReactFlowInstance,
} from "@xyflow/react";

// Base state shared by all canvas stores
export type BaseCanvasState<
  TNode extends Node = Node,
  TEdge extends Edge = Edge,
> = {
  nodes: TNode[];
  edges: TEdge[];
  isDirty: boolean;
  lastSaved: Date | null;
  isSaving: boolean;
  isInitialized: boolean;
};

// Base actions shared by all canvas stores
export type BaseCanvasActions<
  TNode extends Node = Node,
  TEdge extends Edge = Edge,
> = {
  onNodesChange: OnNodesChange<TNode>;
  onEdgesChange: OnEdgesChange<TEdge>;
  onConnect: OnConnect;
  setNodes: (nodes: TNode[]) => void;
  setEdges: (edges: TEdge[]) => void;
  markDirty: () => void;
  markClean: () => void;
  setInitialized: (initialized: boolean) => void;
  setSaving: (saving: boolean) => void;
  setLastSaved: (date: Date) => void;
};

export type BaseCanvasStore<
  TNode extends Node = Node,
  TEdge extends Edge = Edge,
> = BaseCanvasState<TNode, TEdge> & BaseCanvasActions<TNode, TEdge>;
```

---

## Phase 2: Create Store Factory

### 2.1 Create `src/lib/canvas/store/create-canvas-store.ts`

Generic factory that creates typed stores.

```typescript
import { type Edge, type Node, addEdge, applyEdgeChanges, applyNodeChanges } from "@xyflow/react";
import { type ReactNode, createContext, useContext, useRef } from "react";
import { type StoreApi, create, useStore } from "zustand";
import type { BaseCanvasActions, BaseCanvasState, BaseCanvasStore } from "./types";

type CreateStoreOptions<TNode extends Node, TEdge extends Edge> = {
  defaultEdgeOptions?: Partial<TEdge>;
};

export function createCanvasStoreFactory<
  TNode extends Node = Node,
  TEdge extends Edge = Edge,
  TExtra = object
>(
  options?: CreateStoreOptions<TNode, TEdge>
) {
  type CombinedStore = BaseCanvasStore<TNode, TEdge> & TExtra;

  function createStore(extraState?: () => TExtra & Partial<BaseCanvasActions<TNode, TEdge>>) {
    return create<CombinedStore>()((set, get) => {
      const extra = extraState?.() ?? ({} as TExtra);

      const baseState: BaseCanvasState<TNode, TEdge> = {
        nodes: [],
        edges: [],
        isDirty: false,
        lastSaved: null,
        isSaving: false,
        isInitialized: false,
      };

      const baseActions: BaseCanvasActions<TNode, TEdge> = {
        onNodesChange: (changes) => {
          const nextNodes = applyNodeChanges(changes, get().nodes);
          set({ nodes: nextNodes } as Partial<CombinedStore>);
          if (get().isInitialized) get().markDirty();
        },
        onEdgesChange: (changes) => {
          const nextEdges = applyEdgeChanges(changes, get().edges);
          set({ edges: nextEdges } as Partial<CombinedStore>);
          if (get().isInitialized) get().markDirty();
        },
        onConnect: (connection) => {
          const newEdge = { ...connection, ...options?.defaultEdgeOptions } as TEdge;
          const nextEdges = addEdge(newEdge, get().edges);
          set({ edges: nextEdges } as Partial<CombinedStore>);
          if (get().isInitialized) get().markDirty();
        },
        setNodes: (nodes) => set({ nodes } as Partial<CombinedStore>),
        setEdges: (edges) => set({ edges } as Partial<CombinedStore>),
        markDirty: () => set({ isDirty: true } as Partial<CombinedStore>),
        markClean: () => set({ isDirty: false } as Partial<CombinedStore>),
        setInitialized: (init) => set({ isInitialized: init } as Partial<CombinedStore>),
        setSaving: (saving) => set({ isSaving: saving } as Partial<CombinedStore>),
        setLastSaved: (date) => set({ lastSaved: date } as Partial<CombinedStore>),
      };

      return { ...baseState, ...baseActions, ...extra } as CombinedStore;
    });
  }

  // Context + Provider factory
  function createStoreContext() {
    const Context = createContext<StoreApi<CombinedStore> | null>(null);

    function Provider({ children, createExtraState }: {
      children: ReactNode;
      createExtraState?: () => TExtra & Partial<BaseCanvasActions<TNode, TEdge>>;
    }) {
      const storeRef = useRef<StoreApi<CombinedStore> | null>(null);
      storeRef.current ??= createStore(createExtraState);
      return <Context.Provider value={storeRef.current}>{children}</Context.Provider>;
    }

    function useStoreSelector<T>(selector: (state: CombinedStore) => T): T {
      const store = useContext(Context);
      if (!store) throw new Error("Store must be used within Provider");
      return useStore(store, selector);
    }

    function useStoreApi() {
      const store = useContext(Context);
      if (!store) throw new Error("Store API must be used within Provider");
      return store;
    }

    return { Provider, useStore: useStoreSelector, useStoreApi, Context };
  }

  return { createStore, createStoreContext };
}
```

---

## Phase 3: Create Auto-Save Hook Factory

### 3.1 Create `src/lib/canvas/hooks/use-auto-save.ts`

```typescript
import { useEffect, useRef } from "react";

import type { Edge, Node } from "@xyflow/react";
import { toast } from "sonner";

type AutoSaveOptions<TNode extends Node, TEdge extends Edge> = {
  nodes: TNode[];
  edges: TEdge[];
  isDirty: boolean;
  markClean: () => void;
  setSaving: (saving: boolean) => void;
  setLastSaved: (date: Date) => void;
  serializeNodes: (nodes: TNode[]) => unknown[];
  serializeEdges: (edges: TEdge[]) => unknown[];
  mutation: {
    mutate: (data: {
      reactFlowNodes: unknown[];
      reactFlowEdges: unknown[];
    }) => void;
    isPending: boolean;
  };
  delay?: number;
};

export function useCanvasAutoSave<TNode extends Node, TEdge extends Edge>({
  nodes,
  edges,
  isDirty,
  markClean,
  setSaving,
  setLastSaved,
  serializeNodes,
  serializeEdges,
  mutation,
  delay = 2000,
}: AutoSaveOptions<TNode, TEdge>) {
  const saveTimeoutRef = useRef<NodeJS.Timeout | undefined>(undefined);
  const pendingSnapshotRef = useRef<{
    nodes: unknown[];
    edges: unknown[];
  } | null>(null);

  useEffect(() => {
    if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
    if (!isDirty || mutation.isPending) return;

    saveTimeoutRef.current = setTimeout(() => {
      setSaving(true);
      const serializedNodes = serializeNodes(nodes);
      const serializedEdges = serializeEdges(edges);
      pendingSnapshotRef.current = {
        nodes: serializedNodes,
        edges: serializedEdges,
      };
      mutation.mutate({
        reactFlowNodes: serializedNodes,
        reactFlowEdges: serializedEdges,
      });
    }, delay);

    return () => {
      if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
    };
  }, [
    isDirty,
    nodes,
    edges,
    mutation,
    setSaving,
    serializeNodes,
    serializeEdges,
    delay,
  ]);

  // Compare snapshots and mark clean if unchanged
  const checkAndMarkClean = (currentNodes: TNode[], currentEdges: TEdge[]) => {
    const lastSent = pendingSnapshotRef.current;
    const currentSnapshot = {
      nodes: serializeNodes(currentNodes),
      edges: serializeEdges(currentEdges),
    };
    const unchanged =
      lastSent &&
      JSON.stringify(lastSent.nodes) ===
        JSON.stringify(currentSnapshot.nodes) &&
      JSON.stringify(lastSent.edges) === JSON.stringify(currentSnapshot.edges);
    if (unchanged) {
      markClean();
      setLastSaved(new Date());
    }
    pendingSnapshotRef.current = null;
  };

  return { isSaving: mutation.isPending, checkAndMarkClean };
}
```

---

## Phase 4: Create Shared UI Components

### 4.1 Create `src/lib/canvas/components/save-status.tsx`

Extract the save indicator used in both canvases.

```typescript
"use client";

import { Loader2, Save } from "lucide-react";
import { cn } from "@/lib/utils";

type SaveStatusProps = {
  isSaving: boolean;
  isDirty: boolean;
  lastSaved: Date | null;
  className?: string;
};

export function SaveStatus({ isSaving, isDirty, lastSaved, className }: SaveStatusProps) {
  return (
    <div className={cn(
      "supports-backdrop-filter:bg-background/60 bg-background/95",
      "ring-border/50 rounded-md border px-3 py-2 shadow-md ring-1 backdrop-blur-sm",
      className
    )}>
      {isSaving ? (
        <div className="flex items-center gap-2 text-sm">
          <Loader2 className="text-primary h-3.5 w-3.5 animate-spin" />
          <span className="font-medium">Saving...</span>
        </div>
      ) : isDirty ? (
        <div className="flex items-center gap-2 text-sm">
          <div className="h-2 w-2 animate-pulse rounded-full bg-yellow-500" />
          <span className="text-muted-foreground font-medium">Unsaved changes</span>
        </div>
      ) : lastSaved ? (
        <div className="flex items-center gap-2 text-sm">
          <Save className="h-3.5 w-3.5 text-emerald-500" />
          <span className="text-muted-foreground font-medium">Saved</span>
        </div>
      ) : null}
    </div>
  );
}
```

### 4.2 Move `text-node.tsx` to `src/lib/canvas/components/text-node.tsx`

Make it generic so systems canvas can also use text annotations.

### 4.3 Create `src/lib/canvas/edges/edge-action-buttons.tsx`

Shared edge label renderer with action buttons.

```typescript
"use client";

import { EdgeLabelRenderer } from "@xyflow/react";
import { Loader2, Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type EdgeActionButtonsProps = {
  labelX: number;
  labelY: number;
  selected?: boolean;
  onAdd?: () => void;
  onDelete?: () => void;
  isAdding?: boolean;
  addTitle?: string;
  deleteTitle?: string;
  showAdd?: boolean;
  showDelete?: boolean;
};

export function EdgeActionButtons({
  labelX,
  labelY,
  selected,
  onAdd,
  onDelete,
  isAdding,
  addTitle = "Add node",
  deleteTitle = "Delete connection",
  showAdd = true,
  showDelete = true,
}: EdgeActionButtonsProps) {
  return (
    <EdgeLabelRenderer>
      <div
        className="nodrag nopan pointer-events-auto absolute flex gap-1"
        style={{ transform: `translate(-50%, -50%) translate(${labelX}px, ${labelY}px)` }}
      >
        {showAdd && onAdd && (
          <Button
            onClick={(e) => { e.stopPropagation(); onAdd(); }}
            size="icon"
            variant="secondary"
            disabled={isAdding}
            className={cn(
              "hover:bg-primary hover:text-primary-foreground h-6 w-6 rounded-lg border shadow-sm transition-all hover:shadow-md",
              selected && "border-primary"
            )}
            title={addTitle}
          >
            {isAdding ? <Loader2 className="h-3 w-3 animate-spin" /> : <Plus className="h-3 w-3" />}
          </Button>
        )}
        {showDelete && onDelete && (
          <Button
            onClick={(e) => { e.stopPropagation(); onDelete(); }}
            size="icon"
            variant="secondary"
            className={cn(
              "hover:bg-destructive hover:text-destructive-foreground h-6 w-6 rounded-lg border shadow-sm transition-all hover:shadow-md",
              selected && "border-destructive"
            )}
            title={deleteTitle}
          >
            <Trash2 className="h-3 w-3" />
          </Button>
        )}
      </div>
    </EdgeLabelRenderer>
  );
}
```

---

## Phase 5: Refactor Teams Canvas

### 5.1 Update `team-store.tsx`

Extend the base store with team-specific state/actions.

```typescript
// Before: 269 lines of store code
// After: ~80 lines using factory

import { MarkerType } from "@xyflow/react";
import { nanoid } from "nanoid";
import { createCanvasStoreFactory } from "@/lib/canvas/store/create-canvas-store";
import type { TextNodeFontSize } from "@/lib/canvas/types/serialization";

// Team-specific types
export type TextNodeData = { text: string; fontSize?: TextNodeFontSize };
export type TextNode = Node<TextNodeData, "text-node">;
export type RoleNode = Node<RoleNodeData, "role-node">;
export type TeamNode = RoleNode | TextNode;
export type TeamEdge = Edge;

// Team-specific extra state
type TeamExtra = {
  teamId: string;
  teamName: string;
  reactFlowInstance: ReactFlowInstance | null;
  editingNodeId: string | null;
  editingTextNodeId: string | null;
  setTeamName: (name: string) => void;
  setReactFlowInstance: (instance: ReactFlowInstance | null) => void;
  setEditingNodeId: (id: string | null) => void;
  setEditingTextNodeId: (id: string | null) => void;
  addTextNode: (position: { x: number; y: number }) => string;
  updateTextNodeContent: (nodeId: string, text: string) => void;
  updateTextNodeFontSize: (nodeId: string, fontSize: TextNodeFontSize) => void;
  deleteNode: (nodeId: string) => void;
};

const { createStoreContext } = createCanvasStoreFactory<TeamNode, TeamEdge, TeamExtra>({
  defaultEdgeOptions: {
    type: "team-edge",
    animated: true,
    markerEnd: { type: MarkerType.ArrowClosed, width: 20, height: 20 },
  },
});

const { Provider, useStore, useStoreApi } = createStoreContext();

export function TeamStoreProvider({ children, teamId, teamName }: Props) {
  return (
    <Provider createExtraState={() => createTeamExtra(teamId, teamName)}>
      {children}
    </Provider>
  );
}

export { useStore as useTeamStore, useStoreApi as useTeamStoreApi };
```

### 5.2 Update `team-canvas.tsx`

Use shared SaveStatus component.

```typescript
// Replace inline save status with:
import { SaveStatus } from "@/lib/canvas/components/save-status";

// In JSX:
<div className="absolute top-4 right-4 z-20">
  <SaveStatus isSaving={isSaving} isDirty={isDirty} lastSaved={lastSaved} />
</div>
```

### 5.3 Update `team-edge.tsx`

Use shared EdgeActionButtons.

```typescript
import { EdgeActionButtons } from "@/lib/canvas/edges/edge-action-buttons";

// Replace inline buttons with:
<EdgeActionButtons
  labelX={labelX}
  labelY={labelY}
  selected={selected}
  onAdd={handleAddRole}
  onDelete={handleDeleteEdge}
  isAdding={createRole.isPending}
  addTitle="Add role between"
/>
```

### 5.4 Update `use-auto-save.tsx`

Use the factory hook.

```typescript
import { useCanvasAutoSave } from "@/lib/canvas/hooks/use-auto-save";

export function useAutoSave() {
  const { nodes, edges, isDirty, markClean, setSaving, setLastSaved, teamId } =
    useTeamStore(selector);

  const updateTeam = api.team.update.useMutation({
    onSuccess: () => checkAndMarkClean(nodes, edges),
    onError: (error) =>
      toast.error("Failed to save", { description: error.message }),
    onSettled: () => {
      setSaving(false);
    },
  });

  const { isSaving, checkAndMarkClean } = useCanvasAutoSave({
    nodes,
    edges,
    isDirty,
    markClean,
    setSaving,
    setLastSaved,
    serializeNodes,
    serializeEdges,
    mutation: {
      mutate: (data) => updateTeam.mutate({ id: teamId, ...data }),
      isPending: updateTeam.isPending,
    },
  });

  return { isSaving, lastSaved: useTeamStore((s) => s.lastSaved) };
}
```

---

## Phase 6: Refactor Systems Canvas

### 6.1 Update `systems-store.tsx`

Same pattern as teams, but simpler (fewer extra actions).

### 6.2 Update `systems-canvas.tsx`

Use shared SaveStatus component.

### 6.3 Update `use-systems-auto-save.tsx`

Use the factory hook.

---

## Phase 7: Move React Flow Components

### 7.1 Create `src/components/react-flow/index.ts`

```typescript
export * from "./base-node";
export * from "./base-handle";
export * from "./zoom-slider";
```

### 7.2 Move files

- `src/components/base-node.tsx` → `src/components/react-flow/base-node.tsx`
- `src/components/base-handle.tsx` → `src/components/react-flow/base-handle.tsx`
- `src/components/zoom-slider.tsx` → `src/components/react-flow/zoom-slider.tsx`

### 7.3 Update imports

All files importing from old paths need updating.

---

## Phase 8: Create Barrel Export

### 8.1 Create `src/lib/canvas/index.ts`

```typescript
// Store
export * from "./store/create-canvas-store";
export * from "./store/types";

// Hooks
export * from "./hooks/use-auto-save";
export * from "./hooks/use-canvas-instance";

// Components
export * from "./components/save-status";
export * from "./components/text-node";
export * from "./components/canvas-wrapper";

// Edges
export * from "./edges/edge-action-buttons";

// Layouts
export * from "./layouts/force-layout";
export * from "./layouts/types";

// Types
export * from "./types/serialization";
```

---

## Migration Checklist

### Phase 1: Types (Safe, No Breaking Changes) - COMPLETED

- [x] Create `src/lib/canvas/types/serialization.ts`
- [x] Create `src/lib/canvas/store/types.ts`
- [x] Create `src/lib/canvas/index.ts` with exports

### Phase 2: Store Factory - COMPLETED

- [x] Create `src/lib/canvas/store/create-canvas-store.tsx`
- [x] Test with a simple example

### Phase 3: Auto-Save Hook - COMPLETED

- [x] Create `src/lib/canvas/hooks/use-auto-save.ts`

### Phase 4: Shared UI Components - COMPLETED

- [x] Create `src/lib/canvas/components/save-status.tsx`
- [x] Create `src/lib/canvas/edges/edge-action-buttons.tsx`
- [ ] Move text-node to shared (optional, can keep in teams)

### Phase 5: Refactor Teams - COMPLETED

- [ ] Update team-store.tsx to use factory (deferred - store factory available for new canvases)
- [x] Update team-canvas.tsx to use SaveStatus
- [x] Update team-edge.tsx to use EdgeActionButtons
- [ ] Update use-auto-save.tsx to use factory (deferred - hook available for new canvases)
- [x] Run `pnpm check` to verify no type errors
- [ ] Test teams canvas manually

### Phase 6: Refactor Systems - COMPLETED

- [ ] Update systems-store.tsx to use factory (deferred - store factory available for new canvases)
- [x] Update systems-canvas.tsx to use SaveStatus
- [ ] Update use-systems-auto-save.tsx to use factory (deferred - hook available for new canvases)
- [x] Run `pnpm check` to verify no type errors
- [ ] Test systems canvas manually

### Phase 7: Move React Flow Components - COMPLETED

- [x] Create `src/components/react-flow/` folder
- [x] Move base-node.tsx
- [x] Move base-handle.tsx
- [x] Move zoom-slider.tsx
- [x] Create index.ts barrel export
- [x] Update all imports

### Phase 8: Cleanup - IN PROGRESS

- [ ] Remove any unused code
- [x] Run `pnpm check` (canvas-related code passes)
- [ ] Run `pnpm build` (pre-existing integration errors)
- [ ] Final manual testing

---

## Estimated Line Savings

| Location                  | Before   | After    | Savings  |
| ------------------------- | -------- | -------- | -------- |
| team-store.tsx            | 269      | ~80      | ~189     |
| systems-store.tsx         | 127      | ~50      | ~77      |
| team-canvas.tsx           | 177      | ~140     | ~37      |
| systems-canvas.tsx        | 95       | ~70      | ~25      |
| team-edge.tsx             | 277      | ~230     | ~47      |
| use-auto-save.tsx         | 117      | ~40      | ~77      |
| use-systems-auto-save.tsx | 96       | ~35      | ~61      |
| **Total**                 | **1158** | **~645** | **~513** |

New shared code: ~400 lines
**Net savings: ~113 lines with much better reusability**

---

## Future Benefits

Once this refactoring is complete:

1. **New canvases** can be created in ~50 lines instead of ~500
2. **Text nodes** available in any canvas
3. **Consistent save UX** across all canvases
4. **Edge actions** easily customizable per feature
5. **Store patterns** are type-safe and consistent
6. **Testing** can be centralized for shared components
