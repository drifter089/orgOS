# React Flow Architecture Refactoring Plan

## Goal

Delete more code than we add while keeping all functionality.

**Target Net Reduction: ~779 lines**

---

## Summary of All Tasks

| Task                           | Lines Added | Lines Deleted | Net Change |
| ------------------------------ | ----------- | ------------- | ---------- |
| 1. Normalize Role Data         | +40         | -120          | **-80**    |
| 2. Adopt Shared Canvas Library | +120        | -410          | **-290**   |
| 3. Extract Shared Components   | +390        | -841          | **-451**   |
| 4. Add Schema Validation       | +75         | -25           | **+50**    |
| 5. Fix Initialization Timing   | +4          | -12           | **-8**     |
| 6. Add Viewport Persistence    | +45         | -0            | **+45**    |

**Updated Target Net Reduction: ~734 lines**

---

## Task 1: Normalize Role Data

### Problem

`RoleNodeData` stores 13 fields duplicating data from Role model:

```typescript
// Current: 13 fields, duplicated from database
export type RoleNodeData = {
  roleId: string;
  title: string; // ❌ Duplicate
  purpose: string; // ❌ Duplicate
  accountabilities?: string;
  metricId?: string;
  metricName?: string;
  // ... 7 more fields
};
```

### Target

```typescript
// Target: Just store reference
export type RoleNodeData = {
  roleId: string;
  isPending?: boolean; // Only during optimistic create
};
```

### Implementation Steps

**Step 1.1: Create role data lookup hook**

- File: `src/app/teams/[teamId]/hooks/use-role-data.tsx` (NEW ~20 lines)

```typescript
export function useRoleData(roleId: string) {
  const teamId = useTeamStore((state) => state.teamId);
  const { data: roles } = api.role.getByTeam.useQuery({ teamId });
  return useMemo(() => roles?.find((r) => r.id === roleId), [roles, roleId]);
}
```

**Step 1.2: Update RoleNode component**

- File: `src/app/teams/[teamId]/_components/role-node.tsx`
- Change lines 77-86: Use `useRoleData(data.roleId)` instead of props
- Keep `isPending` from data for loading state

**Step 1.3: Simplify serializeNodes**

- File: `src/app/teams/[teamId]/utils/canvas-serialization.ts`
- Lines 72-82: Only store `{ roleId }`

```typescript
// Before: stores title, color, etc.
return { id, type, position, data: { roleId, title, color } };

// After: minimal
return { id, type, position, data: { roleId: node.data.roleId } };
```

**Step 1.4: Simplify enrichNodesWithRoleData**

- File: `src/app/teams/[teamId]/utils/canvas-serialization.ts`
- Lines 106-190: Remove role field population (node just needs roleId)
- Can reduce from ~85 lines to ~20 lines

**Step 1.5: Update optimistic hooks**

- Files:
  - `src/app/teams/[teamId]/hooks/use-create-role.tsx` (lines 156-174)
  - `src/app/teams/[teamId]/hooks/use-update-role.tsx` (lines 77-99)
- Remove node data updates - role cache invalidation is sufficient

### Files Summary

| File                            | Action       | Line Change |
| ------------------------------- | ------------ | ----------- |
| `hooks/use-role-data.tsx`       | Create       | +20         |
| `_components/role-node.tsx`     | Modify       | -15         |
| `utils/canvas-serialization.ts` | Simplify     | -65         |
| `hooks/use-create-role.tsx`     | Simplify     | -20         |
| `hooks/use-update-role.tsx`     | Simplify     | -20         |
| `store/team-store.tsx`          | Update types | +20         |

**Net: -80 lines**

---

## Task 2: Adopt Shared Canvas Library

### Problem

Both stores duplicate identical logic:

| Feature          | Team Store | Systems Store | Shared Library     |
| ---------------- | ---------- | ------------- | ------------------ |
| `onNodesChange`  | 22 lines   | 21 lines      | Already in factory |
| `onEdgesChange`  | 8 lines    | 8 lines       | Already in factory |
| `onConnect`      | 15 lines   | 14 lines      | Already in factory |
| Dirty state mgmt | 6 lines    | 6 lines       | Already in factory |
| Save state       | 6 lines    | 6 lines       | Already in factory |

The factory at `src/lib/canvas/store/create-canvas-store.tsx` is **unused**.

### Implementation Steps

**Step 2.1: Migrate team-store.tsx**

- File: `src/app/teams/[teamId]/store/team-store.tsx`
- Rewrite using factory pattern:

```typescript
import { createCanvasStore } from "@/lib/canvas";

type TeamExtraState = {
  teamId: string;
  teamName: string;
  reactFlowInstance: ReactFlowInstance | null;
  editingNodeId: string | null;
  editingTextNodeId: string | null;
  isDrawing: boolean;
  isForceLayoutEnabled: boolean;
};

type TeamExtraActions = {
  setTeamId: (id: string) => void;
  setTeamName: (name: string) => void;
  setReactFlowInstance: (instance: ReactFlowInstance | null) => void;
  setEditingNodeId: (id: string | null) => void;
  setEditingTextNodeId: (id: string | null) => void;
  addTextNode: (
    position: { x: number; y: number },
    text?: string,
    autoEdit?: boolean,
  ) => string;
  updateTextNodeContent: (id: string, text: string) => void;
  updateTextNodeFontSize: (id: string, fontSize: TextNodeFontSize) => void;
  deleteNode: (id: string) => void;
  setIsDrawing: (isDrawing: boolean) => void;
  setIsForceLayoutEnabled: (enabled: boolean) => void;
};

const { Provider, useCanvasStore, useCanvasStoreApi, StoreContext } =
  createCanvasStore<TeamNode, TeamEdge, TeamExtraState & TeamExtraActions>({
    defaultEdgeOptions: {
      type: "team-edge",
      animated: true,
      markerEnd: { type: MarkerType.ArrowClosed, width: 20, height: 20 },
    },
    createExtraSlice: (set, get) => ({
      teamId: "",
      teamName: "",
      reactFlowInstance: null,
      editingNodeId: null,
      editingTextNodeId: null,
      isDrawing: false,
      isForceLayoutEnabled: false,

      setTeamId: (id) => set({ teamId: id }),
      setTeamName: (name) => {
        set({ teamName: name });
        get().markDirty();
      },
      // ... remaining actions
    }),
  });

// Export with familiar names
export const TeamStoreProvider = Provider;
export const useTeamStore = useCanvasStore;
export const useTeamStoreApi = useCanvasStoreApi;
```

**Step 2.2: Override onNodesChange for freehand filtering**

- Wrap base handler to skip freehand-only changes from marking dirty

**Step 2.3: Migrate systems-store.tsx**

- File: `src/app/systems/store/systems-store.tsx`
- Same pattern, simpler (fewer extra fields)

**Step 2.4: Migrate auto-save hooks**

- File: `src/app/teams/[teamId]/hooks/use-auto-save.tsx`
- Use `useCanvasAutoSave()` from `src/lib/canvas/hooks/use-auto-save.ts`
- Keep team-specific `beforeunload` + `sendBeacon` logic as wrapper

```typescript
import { useCanvasAutoSave } from "@/lib/canvas";

export function useAutoSave() {
  const storeApi = useTeamStoreApi();
  const teamId = useTeamStore((s) => s.teamId);
  const utils = api.useUtils();

  const updateTeam = api.team.update.useMutation({
    onSuccess: () => void utils.team.getById.invalidate({ id: teamId }),
    // ... error handling
  });

  // Use shared hook for core logic
  const result = useCanvasAutoSave({
    nodes: useTeamStore((s) => s.nodes),
    edges: useTeamStore((s) => s.edges),
    isDirty: useTeamStore((s) => s.isDirty),
    markClean: useTeamStore((s) => s.markClean),
    setSaving: useTeamStore((s) => s.setSaving),
    setLastSaved: useTeamStore((s) => s.setLastSaved),
    serializeNodes,
    serializeEdges,
    mutation: {
      mutate: (data) => updateTeam.mutate({ id: teamId, ...data }),
      isPending: updateTeam.isPending,
    },
  });

  // Team-specific: beforeunload flush
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      const { isDirty, isSaving } = storeApi.getState();
      if (isDirty || isSaving) {
        flushSave();
        e.preventDefault();
        return "";
      }
    };
    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => window.removeEventListener("beforeunload", handleBeforeUnload);
  }, [storeApi]);

  return result;
}
```

**Step 2.5: Migrate systems auto-save**

- File: `src/app/systems/hooks/use-systems-auto-save.tsx`
- Simpler - no beforeunload needed (or add it for consistency)

### Files Summary

| File                                    | Before | After | Change |
| --------------------------------------- | ------ | ----- | ------ |
| `teams/.../team-store.tsx`              | 306    | 140   | -166   |
| `systems/.../systems-store.tsx`         | 229    | 100   | -129   |
| `teams/.../use-auto-save.tsx`           | 172    | 50    | -122   |
| `systems/.../use-systems-auto-save.tsx` | 96     | 30    | -66    |
| New wrapper code                        | 0      | 120   | +120   |

**Net: -290 lines**

---

## Task 3: Extract Shared Components

### Problem

Nearly identical components:

| Component      | Team      | Systems   | Diff          |
| -------------- | --------- | --------- | ------------- |
| TextNode       | 249 lines | 244 lines | Store imports |
| CanvasControls | 214 lines | 214 lines | Store imports |

### Implementation Steps

**Step 3.1: Create store-agnostic TextNode**

- File: `src/lib/canvas/components/text-node.tsx` (NEW ~210 lines)

```typescript
export type TextNodeActions = {
  editingTextNodeId: string | null;
  setEditingTextNodeId: (id: string | null) => void;
  updateTextNodeContent: (id: string, text: string) => void;
  updateTextNodeFontSize: (id: string, fontSize: TextNodeFontSize) => void;
  deleteNode: (id: string) => void;
  markDirty: () => void;
};

export type TextNodeData = {
  text: string;
  fontSize?: TextNodeFontSize;
};

export function createTextNode<T extends TextNodeData>(
  useActions: () => TextNodeActions,
) {
  return memo(function TextNodeComponent({
    data,
    selected,
    id,
  }: NodeProps<Node<T>>) {
    const {
      editingTextNodeId,
      setEditingTextNodeId,
      updateTextNodeContent,
      updateTextNodeFontSize,
      deleteNode,
      markDirty,
    } = useActions();

    // ... rest of component (same as current implementation)
  });
}
```

**Step 3.2: Create thin wrapper for Team**

- File: `src/app/teams/[teamId]/_components/text-node.tsx` (reduced to ~15 lines)

```typescript
import { createTextNode } from "@/lib/canvas";

import { useTeamStore } from "../store/team-store";

export const TextNodeMemo = createTextNode(() => ({
  editingTextNodeId: useTeamStore((s) => s.editingTextNodeId),
  setEditingTextNodeId: useTeamStore((s) => s.setEditingTextNodeId),
  updateTextNodeContent: useTeamStore((s) => s.updateTextNodeContent),
  updateTextNodeFontSize: useTeamStore((s) => s.updateTextNodeFontSize),
  deleteNode: useTeamStore((s) => s.deleteNode),
  markDirty: useTeamStore((s) => s.markDirty),
}));
```

**Step 3.3: Create thin wrapper for Systems**

- File: `src/app/systems/_components/text-node.tsx` (reduced to ~15 lines)
- Same pattern with `useSystemsStore`

**Step 3.4: Create store-agnostic CanvasControls**

- File: `src/lib/canvas/components/canvas-controls.tsx` (NEW ~180 lines)

```typescript
export type CanvasControlsProps = {
  isDrawing: boolean;
  setIsDrawing: (isDrawing: boolean) => void;
  undo: () => void;
  redo: () => void;
  canUndo: boolean;
  canRedo: boolean;
  takeSnapshot: () => void;
  addTextNode: (position: { x: number; y: number }) => string;
  setEditingTextNodeId: (id: string) => void;
  isForceLayoutEnabled: boolean;
  setIsForceLayoutEnabled: (enabled: boolean) => void;
};

export function CanvasControls(props: CanvasControlsProps) {
  const reactFlowInstance = useReactFlow();

  const handleAddText = useCallback(() => {
    props.takeSnapshot();
    const { x, y, zoom } = reactFlowInstance.getViewport();
    const centerX = -x / zoom + window.innerWidth / 2 / zoom;
    const centerY = -y / zoom + window.innerHeight / 2 / zoom;
    const nodeId = props.addTextNode({ x: centerX, y: centerY });
    props.setEditingTextNodeId(nodeId);
  }, [reactFlowInstance, props]);

  // ... rest of UI (undo/redo, draw mode, force layout)
}
```

**Step 3.5: Create thin wrappers**

- `src/app/teams/[teamId]/_components/team-canvas-controls.tsx` (~25 lines)
- `src/app/systems/_components/systems-canvas-controls.tsx` (~25 lines)

**Step 3.6: Update lib/canvas/index.ts exports**

```typescript
export * from "./components/text-node";
export * from "./components/canvas-controls";
```

### Files Summary

| File                                        | Before | After | Change |
| ------------------------------------------- | ------ | ----- | ------ |
| `lib/canvas/components/text-node.tsx`       | 0      | 210   | +210   |
| `lib/canvas/components/canvas-controls.tsx` | 0      | 180   | +180   |
| `teams/.../text-node.tsx`                   | 249    | 15    | -234   |
| `systems/.../text-node.tsx`                 | 244    | 15    | -229   |
| `teams/.../team-canvas-controls.tsx`        | 214    | 25    | -189   |
| `systems/.../systems-canvas-controls.tsx`   | 214    | 25    | -189   |

**Net: -451 lines**

---

## Task 4: Add Schema Validation

### Problem

Team router uses `z.any()`:

```typescript
// team.ts lines 65-67
reactFlowNodes: z.any().optional(),  // ❌ No validation
reactFlowEdges: z.any().optional(),  // ❌ No validation
```

Systems router has proper validation:

```typescript
// systems-canvas.ts lines 9-25
const storedNodeSchema = z.object({
  id: z.string(),
  position: z.object({ x: z.number(), y: z.number() }),
});
```

### Implementation Steps

**Step 4.1: Create shared schema definitions**

- File: `src/lib/canvas/schemas/stored-data.ts` (NEW ~40 lines)

```typescript
import { z } from "zod";

export const storedPositionSchema = z.object({
  x: z.number(),
  y: z.number(),
});

export const storedEdgeSchema = z.object({
  id: z.string(),
  source: z.string(),
  target: z.string(),
  sourceHandle: z.string().nullish(),
  targetHandle: z.string().nullish(),
  type: z.string().optional(),
  animated: z.boolean().optional(),
});

export const storedNodeBaseSchema = z.object({
  id: z.string(),
  type: z.string().optional(),
  position: storedPositionSchema,
  style: z
    .object({
      width: z.number().optional(),
      height: z.number().optional(),
    })
    .optional(),
  data: z.record(z.unknown()).optional(),
});

export const viewportSchema = z.object({
  x: z.number(),
  y: z.number(),
  zoom: z.number(),
});
```

**Step 4.2: Create team-specific schema**

- File: `src/app/teams/[teamId]/schemas/canvas.ts` (NEW ~25 lines)

```typescript
import { z } from "zod";

import { storedNodeBaseSchema } from "@/lib/canvas/schemas/stored-data";

const textNodeFontSizeSchema = z.enum(["small", "medium", "large"]);

export const teamStoredNodeSchema = storedNodeBaseSchema.extend({
  data: z
    .object({
      roleId: z.string().optional(),
      title: z.string().optional(),
      color: z.string().optional(),
      text: z.string().optional(),
      fontSize: textNodeFontSizeSchema.optional(),
      dashboardMetricId: z.string().optional(),
    })
    .optional(),
});
```

**Step 4.3: Update team router**

- File: `src/server/api/routers/team.ts` lines 59-68

```typescript
import { teamStoredNodeSchema } from "@/app/teams/[teamId]/schemas/canvas";
import {
  storedEdgeSchema,
  viewportSchema,
} from "@/lib/canvas/schemas/stored-data";

update: workspaceProcedure.input(
  z.object({
    id: z.string(),
    name: z.string().min(1).max(100).optional(),
    description: z.string().optional(),
    reactFlowNodes: z.array(teamStoredNodeSchema).optional(),
    reactFlowEdges: z.array(storedEdgeSchema).optional(),
    viewport: viewportSchema.optional(),
  }),
);
```

**Step 4.4: Update systems router to use shared schema**

- File: `src/server/api/routers/systems-canvas.ts`
- Remove inline schemas (lines 9-31), import from shared

**Step 4.5: Update lib/canvas/index.ts**

```typescript
export * from "./schemas/stored-data";
```

### Files Summary

| File                                | Before    | After    | Change |
| ----------------------------------- | --------- | -------- | ------ |
| `lib/canvas/schemas/stored-data.ts` | 0         | 40       | +40    |
| `teams/.../schemas/canvas.ts`       | 0         | 25       | +25    |
| `routers/team.ts`                   | (z.any)   | (proper) | +10    |
| `routers/systems-canvas.ts`         | 25 inline | imports  | -25    |

**Net: +50 lines** (acceptable for safety)

---

## Task 5: Fix Initialization Timing

### Problem

Race condition with arbitrary timeout:

```typescript
// Both wrappers have this pattern
const timer = setTimeout(() => {
  setInitialized(true);
}, 100); // ❌ Arbitrary, can race
```

### Solution

Use React Flow's `onInit` callback for proper timing.

### Implementation Steps

**Step 5.1: Add onInit to TeamCanvas**

- File: `src/app/teams/[teamId]/_components/team-canvas.tsx`
- Add around line 511:

```typescript
const storeApi = useTeamStoreApi();

<ReactFlow
  // ... existing props
  onInit={() => {
    storeApi.getState().setInitialized(true);
  }}
>
```

**Step 5.2: Remove setTimeout from TeamCanvasWrapper**

- File: `src/app/teams/[teamId]/_components/team-canvas-wrapper.tsx`
- Lines 38-43: Remove timeout

```typescript
// Before
useEffect(() => {
  setNodes(initialNodes);
  setEdges(initialEdges);
  const timer = setTimeout(() => {
    setInitialized(true);
  }, 100);
  return () => clearTimeout(timer);
}, [...]);

// After
useEffect(() => {
  setNodes(initialNodes);
  setEdges(initialEdges);
  // setInitialized is called by onInit in TeamCanvas
}, [initialNodes, initialEdges, setNodes, setEdges]);
```

**Step 5.3: Add onInit to SystemsCanvas**

- File: `src/app/systems/_components/systems-canvas.tsx`
- Add around line 131

**Step 5.4: Remove setTimeout from SystemsCanvasWrapper**

- File: `src/app/systems/_components/systems-canvas-wrapper.tsx`
- Lines 121-127: Remove timeout

### Files Summary

| File                                     | Change   |
| ---------------------------------------- | -------- |
| `teams/.../team-canvas.tsx`              | +2 lines |
| `teams/.../team-canvas-wrapper.tsx`      | -6 lines |
| `systems/.../systems-canvas.tsx`         | +2 lines |
| `systems/.../systems-canvas-wrapper.tsx` | -6 lines |

**Net: -8 lines**

---

## Task 6: Add Viewport Persistence

### Problem

Both canvases have `viewport` field in DB schema but don't use it:

- User loses zoom/pan position on page refresh
- `Team.viewport` and `SystemsCanvas.viewport` columns exist but are always null

### Implementation Steps

**Step 6.1: Add viewport state to stores**

For Team store (after Task 2 migration):

```typescript
// In createExtraSlice
type TeamExtraState = {
  // ... existing
  savedViewport: { x: number; y: number; zoom: number } | null;
};

// Actions
setSavedViewport: (viewport) => set({ savedViewport: viewport }),
```

For Systems store (same pattern).

**Step 6.2: Update canvas wrappers to accept initial viewport**

Team wrapper:

- File: `src/app/teams/[teamId]/_components/team-canvas-wrapper.tsx`

```typescript
interface TeamCanvasWrapperProps {
  // ... existing
  initialViewport?: { x: number; y: number; zoom: number } | null;
}

export function TeamCanvasWrapper({
  initialViewport,
  // ...
}: TeamCanvasWrapperProps) {
  const setSavedViewport = useTeamStore((s) => s.setSavedViewport);

  useEffect(() => {
    setNodes(initialNodes);
    setEdges(initialEdges);
    if (initialViewport) {
      setSavedViewport(initialViewport);
    }
  }, [
    initialNodes,
    initialEdges,
    initialViewport,
    setNodes,
    setEdges,
    setSavedViewport,
  ]);
  // ...
}
```

Systems wrapper: Same pattern.

**Step 6.3: Use viewport in ReactFlow component**

Team canvas:

- File: `src/app/teams/[teamId]/_components/team-canvas.tsx`

```typescript
const savedViewport = useTeamStore(s => s.savedViewport);
const setSavedViewport = useTeamStore(s => s.setSavedViewport);
const markDirty = useTeamStore(s => s.markDirty);

<ReactFlow
  defaultViewport={savedViewport ?? { x: 0, y: 0, zoom: 1 }}
  onMoveEnd={(_, viewport) => {
    setSavedViewport(viewport);
    markDirty();
  }}
  onInit={() => {
    storeApi.getState().setInitialized(true);
  }}
  // ... rest
>
```

Systems canvas: Same pattern.

**Step 6.4: Include viewport in auto-save**

Team auto-save:

- File: `src/app/teams/[teamId]/hooks/use-auto-save.tsx`

```typescript
// In the save mutation call
updateTeam.mutate({
  id: teamId,
  reactFlowNodes: serializedNodes,
  reactFlowEdges: serializedEdges,
  viewport: storeApi.getState().savedViewport, // ADD
});
```

Systems auto-save: Same pattern.

**Step 6.5: Pass viewport from page to wrapper**

Team page:

- File: `src/app/teams/[teamId]/page.tsx`

```typescript
const viewport = team.viewport as { x: number; y: number; zoom: number } | null;

<TeamCanvasWrapper
  initialNodes={nodes}
  initialEdges={edges}
  initialViewport={viewport}  // ADD
  teamId={team.id}
  // ...
/>
```

Systems page: Same pattern.

### Files Summary

| File                                     | Change                    |
| ---------------------------------------- | ------------------------- |
| `teams/.../store/team-store.tsx`         | +5 lines (state + action) |
| `systems/.../store/systems-store.tsx`    | +5 lines                  |
| `teams/.../team-canvas-wrapper.tsx`      | +5 lines                  |
| `systems/.../systems-canvas-wrapper.tsx` | +5 lines                  |
| `teams/.../team-canvas.tsx`              | +8 lines                  |
| `systems/.../systems-canvas.tsx`         | +8 lines                  |
| `teams/.../use-auto-save.tsx`            | +2 lines                  |
| `systems/.../use-systems-auto-save.tsx`  | +2 lines                  |
| `teams/.../page.tsx`                     | +3 lines                  |
| `systems/page.tsx`                       | +2 lines                  |

**Net: +45 lines** (new feature)

---

## Implementation Order

### Phase 1: Foundation (Tasks 4, 5)

1. **Task 4**: Add schema validation first - prevents bad data during refactoring
2. **Task 5**: Fix initialization timing - isolated change, low risk

### Phase 2: Shared Library (Task 2)

3. **Task 2**: Migrate stores and auto-save to shared library
   - Do Systems first (simpler)
   - Then Team (more complex)

### Phase 3: Component Extraction (Task 3)

4. **Task 3**: Extract TextNode and CanvasControls
   - Depends on Task 2 for store interface consistency

### Phase 4: Data Normalization (Task 1)

5. **Task 1**: Normalize role data
   - Do last - most impactful change
   - Requires all other pieces in place

### Phase 5: New Feature (Task 6)

6. **Task 6**: Add viewport persistence
   - Can be done anytime after Task 2 (needs store changes)
   - Nice UX improvement, low risk

---

## Testing Strategy

After each task:

1. Run `pnpm check` (lint + typecheck)
2. Manual test Team canvas CRUD operations
3. Manual test Systems canvas positioning
4. Verify auto-save works (check Network tab)
5. Verify undo/redo works
6. Verify draw mode works

---

## Rollback Plan

Each task can be reverted independently:

- Tasks use feature branches
- No database migrations required
- Only client-side code changes

---

## Issues Coverage Checklist

### Critical

| Issue                                       | Task   | Status     |
| ------------------------------------------- | ------ | ---------- |
| Dual sources of truth for role data         | Task 1 | ✅ Covered |
| No schema validation on Team canvas storage | Task 4 | ✅ Covered |

### High

| Issue                                        | Task        | Status                       |
| -------------------------------------------- | ----------- | ---------------------------- |
| ~400 lines of duplicate code across canvases | Tasks 2 + 3 | ✅ Covered                   |
| Missing beforeunload save in Systems canvas  | Task 2      | ✅ Covered (add in step 2.5) |
| 100ms initialization timer race condition    | Task 5      | ✅ Covered                   |

### Medium

| Issue                                  | Task        | Status     |
| -------------------------------------- | ----------- | ---------- |
| Shared canvas library not utilized     | Task 2      | ✅ Covered |
| Inconsistent patterns between canvases | Tasks 2 + 3 | ✅ Covered |
| No viewport persistence                | Task 6      | ✅ Covered |

### Low

| Issue                                       | Task   | Status                                |
| ------------------------------------------- | ------ | ------------------------------------- |
| Workflow canvas architectural divergence    | -      | ➖ Skipped (reference only)           |
| TextNodeFontSize defined in multiple places | Task 3 | ✅ Covered (single def in lib/canvas) |
