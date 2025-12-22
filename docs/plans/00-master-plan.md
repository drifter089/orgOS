# Metrics Pipeline Architecture Redesign - Master Plan

## Execution Order Summary

### PARALLEL GROUP 1 (Start Immediately - No Dependencies)

| #   | Plan              | File                         | Focus                                                                              |
| --- | ----------------- | ---------------------------- | ---------------------------------------------------------------------------------- |
| 1   | Pipeline Core     | `plan-1-pipeline-core.md`    | Pipeline abstraction, logging, **independent metrics**, delete old data on refresh |
| 2   | Goal System       | `plan-2-goal-system.md`      | Split goal-calculation.ts + goal line on charts                                    |
| 3   | Chart Animations  | `plan-3-chart-animations.md` | Smooth entry animations on every load                                              |
| 7   | Transformer Regen | `plan-7-template-cache.md`   | Independent transformer regeneration (data vs chart)                               |

### SEQUENTIAL GROUP 2 (After Plan 1)

| #   | Plan           | File                       | Focus                                |
| --- | -------------- | -------------------------- | ------------------------------------ |
| 4   | Frontend Hooks | `plan-4-frontend-hooks.md` | Reusable mutations, progress UI      |
| 5   | Router Split   | `plan-5-router-split.md`   | Split metric.ts into focused routers |

### SEQUENTIAL GROUP 3 (After Plan 4)

| #   | Plan           | File                       | Focus                               |
| --- | -------------- | -------------------------- | ----------------------------------- |
| 6   | Dialog Cleanup | `plan-6-dialog-cleanup.md` | Registry pattern, remove duplicates |

### INDEPENDENT (Run Anytime)

| #   | Plan            | File                              | Focus                                |
| --- | --------------- | --------------------------------- | ------------------------------------ |
| 8   | Drawer Redesign | `plan-8-chart-drawer-redesign.md` | Settings drawer UI (awaiting design) |

---

## Visual Execution Order

```
START
  │
  ├───────────┬───────────┬───────────┬───────────┐
  │           │           │           │           │
  ▼           ▼           ▼           ▼           │
┌─────┐   ┌─────┐   ┌─────┐   ┌─────┐           │
│ P1  │   │ P2  │   │ P3  │   │ P7  │           │
│Pipe │   │Goal │   │Anim │   │Regen│           │
└──┬──┘   └─────┘   └─────┘   └─────┘           │
   │                                             │
   ├──────────────┐                              │
   │              │                              │
   ▼              ▼                              ▼
┌─────┐       ┌─────┐                        ┌─────┐
│ P4  │       │ P5  │                        │ P8  │
│Hooks│       │Route│                        │Drawr│
└──┬──┘       └─────┘                        └─────┘
   │
   ▼
┌─────┐
│ P6  │
│Dialg│
└─────┘
```

---

## IMPORTANT: Independent Metrics Architecture

**Key Change**: All metrics are now fully independent. No shared transformer caching.

### Before (Shared Transformers)

```
Metric A (github-commits) → transformer keyed by "github-commits" (SHARED)
Metric B (github-commits) → same transformer (SHARED)
```

### After (Independent Metrics)

```
Metric A (github-commits) → transformer keyed by "metricA" (INDEPENDENT)
Metric B (github-commits) → transformer keyed by "metricB" (INDEPENDENT)
```

### Benefits

- Simpler mental model
- Problems with one metric don't affect others
- Regenerating one metric can't break others
- No complex cache key logic
- **No DB migration needed** - just deploy and hard refresh old metrics

---

## IMPORTANT: Unified Metadata from ChartTransformer

All display metadata now comes from ChartTransformer output:

| Field         | Source (Before)            | Source (After)            |
| ------------- | -------------------------- | ------------------------- |
| `title`       | Fallback chain (4 sources) | `chartConfig.title`       |
| `description` | ChartTransformer           | `chartConfig.description` |
| `valueLabel`  | DataIngestionTransformer   | `chartConfig.valueLabel`  |

### Benefits

- **Single source of truth** for all display data
- **Consistent** - goal calculation uses same data as display
- **Context-aware titles** - can include user name, team, project
- **No fallback chains** - eliminates confusion and bugs

### Regeneration Rules

| Trigger       | Regenerates Metadata? | Notes                        |
| ------------- | --------------------- | ---------------------------- |
| Hard refresh  | Yes                   | All metadata regenerated     |
| Soft refresh  | No                    | Metadata preserved           |
| User override | No                    | Override stored separately   |
| Data change   | Only on structure     | New dimensions trigger regen |

---

## Key Features by Plan

### Plan 1: Pipeline Core

- Step-by-step pipeline execution
- Logs to MetricApiLog (no new tables)
- **All metrics independent (metricId as transformer key)**
- **DELETE old datapoints + transformer on force refetch**
- Real-time status via metric.refreshStatus
- Backward compatible - old metrics regenerate on hard refresh
- **ChartTransformer generates unified metadata (title, description, valueLabel)**

### Plan 2: Goal System

- Split 467-line file into 5 modules (~60 lines each)
- **Goal reference line on charts** (line/area/bar)
- Cleaner progress calculation
- **Uses ChartTransformer data as single source of truth**

### Plan 3: Chart Animations

- **Smooth entry animations on every load**
- Area/Line: sweep from left
- Bar: grow upward
- Pie: rotate in
- Animation replays on data change

### Plan 4: Frontend Hooks

- `useOptimisticMutation` - generic pattern
- `useMetricMutations` - metric-specific
- `usePipelineProgress` - real-time polling
- `<PipelineProgress>` - step-by-step UI

### Plan 5: Router Split

- `goal.ts` - goal operations
- `manual-metric.ts` - manual metrics
- `pipeline.ts` - refresh/regenerate/progress
- `metric.ts` - CRUD only (200 lines vs 821)

### Plan 6: Dialog Cleanup

- Registry pattern for dialogs
- Single `<MetricDialog>` component
- Remove 5 duplicate wrapper files
- Keep unique Content components

### Plan 7: Independent Transformer Regeneration

- **Regenerate data transformer only** (keep chart + data points)
- **Regenerate chart transformer only** (keep data transformer + data points)
- UI buttons for granular control
- Transformer info display
- **Metadata regeneration rules** (when to preserve user overrides)

### Plan 8: Drawer Redesign

- Complete UI overhaul
- Awaiting design images
- Placeholder plan

---

## Files Created

All plan files are in `docs/plans/`:

```
00-master-plan.md               (this file)
plan-1-pipeline-core.md         (detailed)
plan-2-goal-system.md           (detailed)
plan-3-chart-animations.md      (detailed)
plan-4-frontend-hooks.md        (detailed)
plan-5-router-split.md          (detailed)
plan-6-dialog-cleanup.md        (detailed)
plan-7-template-cache.md        (detailed)
plan-8-chart-drawer-redesign.md (placeholder)
```

---

## Running the Plans

### To run Plan 1:

```
Read docs/plans/plan-1-pipeline-core.md and implement all tasks
```

### To run multiple plans in parallel:

Start new Claude Code sessions for each plan, or use worktrees.

---

## Summary of New Features

| Feature                              | Plan   | Status          |
| ------------------------------------ | ------ | --------------- |
| Independent metrics (no caching)     | Plan 1 | Detailed        |
| Delete old data on force refetch     | Plan 1 | Detailed        |
| Unified metadata (title, valueLabel) | Plan 1 | Detailed        |
| Goal line on chart                   | Plan 2 | Detailed        |
| ChartTransformer as source of truth  | Plan 2 | Detailed        |
| Chart animations                     | Plan 3 | Detailed        |
| Granular transformer regeneration    | Plan 7 | Detailed        |
| Metadata regeneration rules          | Plan 7 | Detailed        |
| Drawer redesign                      | Plan 8 | Awaiting design |

---

## Backward Compatibility

Old metrics on production will continue to work. When you do a **hard refresh** on an old metric:

1. New code looks for transformer with `metricId` key → Not found
2. Creates new independent transformer for that metric
3. Old shared transformer becomes orphaned (can cleanup later)
4. **No migration needed**
