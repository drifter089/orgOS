# Metrics Pipeline Architecture Redesign - Master Plan

## Execution Order Summary

### PARALLEL GROUP 1 (Start Immediately - No Dependencies)

| #   | Plan             | File                         | Focus                                                           |
| --- | ---------------- | ---------------------------- | --------------------------------------------------------------- |
| 1   | Pipeline Core    | `plan-1-pipeline-core.md`    | Pipeline abstraction, logging, delete old data on force refetch |
| 2   | Goal System      | `plan-2-goal-system.md`      | Split goal-calculation.ts + goal line on charts                 |
| 3   | Chart Animations | `plan-3-chart-animations.md` | Smooth entry animations on every load                           |
| 7   | Template Cache   | `plan-7-template-cache.md`   | Independent transformer regeneration                            |

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
│Pipe │   │Goal │   │Anim │   │Cache│           │
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

## Key Features by Plan

### Plan 1: Pipeline Core

- Step-by-step pipeline execution
- Logs to MetricApiLog (no new tables)
- **DELETE old datapoints on force refetch**
- Real-time status via metric.refreshStatus

### Plan 2: Goal System

- Split 467-line file into 5 modules (~60 lines each)
- **Goal reference line on charts** (line/area/bar)
- Cleaner progress calculation

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

### Plan 7: Template Cache

- Regenerate ingestion transformer independently
- Regenerate chart transformer independently
- Shared vs per-metric cache strategy
- Fix bad transformers without data loss

### Plan 8: Drawer Redesign

- Complete UI overhaul
- Awaiting design images
- Placeholder plan

---

## Files Created

All plan files are in `/home/akshat/.claude/plans/`:

```
graceful-launching-torvalds.md  (this file - master)
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
Read /home/akshat/.claude/plans/plan-1-pipeline-core.md and implement all tasks
```

### To run multiple plans in parallel:

Start new Claude Code sessions for each plan, or use worktrees.

---

## Summary of New Features

| Feature                          | Plan   | Status          |
| -------------------------------- | ------ | --------------- |
| Delete old data on force refetch | Plan 1 | Detailed        |
| Goal line on chart               | Plan 2 | Detailed        |
| Chart animations                 | Plan 3 | Detailed        |
| Template-level cache             | Plan 7 | Detailed        |
| Drawer redesign                  | Plan 8 | Awaiting design |
