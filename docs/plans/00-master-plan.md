# Metrics Pipeline Architecture Redesign - Master Plan

## Execution Order Summary

### PHASE 1: Foundation (Parallel - No Dependencies)

| #   | Plan             | File                         | Focus                                                                              |
| --- | ---------------- | ---------------------------- | ---------------------------------------------------------------------------------- |
| 1   | Pipeline Core    | `plan-1-pipeline-core.md`    | Pipeline abstraction, logging, **independent metrics**, delete old data on refresh |
| 2   | Goal System      | `plan-2-goal-system.md`      | Split goal-calculation.ts + goal line on charts                                    |
| 3   | Chart Animations | `plan-3-chart-animations.md` | Smooth entry animations on every load                                              |

### PHASE 2: Router Reorganization (After Plan 1)

| #   | Plan         | File                     | Focus                                                      |
| --- | ------------ | ------------------------ | ---------------------------------------------------------- |
| 5   | Router Split | `plan-5-router-split.md` | Split metric.ts, DELETE transformer.ts, create pipeline.ts |

### PHASE 3: Frontend Hooks (After Plan 5)

| #   | Plan           | File                       | Focus                           |
| --- | -------------- | -------------------------- | ------------------------------- |
| 4   | Frontend Hooks | `plan-4-frontend-hooks.md` | Reusable mutations, progress UI |

### PHASE 4: Cleanup (After Plan 4)

| #   | Plan           | File                       | Focus                               |
| --- | -------------- | -------------------------- | ----------------------------------- |
| 6   | Dialog Cleanup | `plan-6-dialog-cleanup.md` | Registry pattern, remove duplicates |

### PHASE 5: Enhancements (After Plan 5)

| #   | Plan              | File                       | Focus                                        |
| --- | ----------------- | -------------------------- | -------------------------------------------- |
| 7   | Transformer Regen | `plan-7-template-cache.md` | Granular regeneration (added to pipeline.ts) |

---

## Visual Execution Order

```
START
  │
  ├───────────┬───────────┐
  │           │           │
  ▼           ▼           ▼
┌─────┐   ┌─────┐   ┌─────┐
│ P1  │   │ P2  │   │ P3  │
│Pipe │   │Goal │   │Anim │
└──┬──┘   └─────┘   └─────┘
   │
   ▼
┌─────┐
│ P5  │  ← Creates api.pipeline.*, api.goal.*, api.manualMetric.*
│Route│    DELETES transformer.ts permanently
└──┬──┘
   │
   ├──────────┐
   │          │
   ▼          ▼
┌─────┐   ┌─────┐
│ P4  │   │ P7  │  ← P7 ADDS procedures to pipeline.ts
│Hooks│   │Regen│
└──┬──┘   └─────┘
   │
   ▼
┌─────┐
│ P6  │
│Dialg│
└─────┘

Legend:
- P1: Pipeline Core (metricId keying, logging, delete on refresh, fire-and-forget)
- P2: Goal System (split files, goal line on chart, DELETE old file)
- P3: Chart Animations
- P4: Frontend Hooks (useMetricMutations, usePipelineProgress)
- P5: Router Split (goal.ts, pipeline.ts, manual-metric.ts, FIRE-AND-FORGET)
- P6: Dialog Cleanup (registry pattern, manual metrics separate)
- P7: Transformer Regen (adds regenerateIngestionOnly, regenerateChartOnly to pipeline.ts)
```

---

## IMPORTANT: Fire-and-Forget Pipeline Architecture

The pipeline runs **without awaiting** so users get immediate response. Navigation doesn't cancel the pipeline.

```
metric.create / pipeline.refresh / pipeline.regenerate
    │
    ├─► 1. Create/validate records (awaited)
    ├─► 2. Set refreshStatus = "fetching-api-data"
    ├─► 3. Return to frontend immediately  ← User sees card with spinner
    │
    └─► void runPipeline()  ← Fire-and-forget (NOT awaited)
            │
            ├─► Fetch API data
            ├─► Generate transformers (AI)
            ├─► Save data points
            ├─► Update refreshStatus at each step
            └─► Clear refreshStatus when done (or set lastError on failure)
```

### Key Pattern

```typescript
// In metric.create mutation:
void runPipelineInBackground(metricId, config);  // Fire-and-forget
return { metric, dashboardChart };  // Return immediately
```

### Error Handling

- Errors stored in `metric.lastError`
- Frontend polls `pipeline.getProgress` and shows error toast
- User retries with "Refresh" or "Hard Refresh" button

---

## IMPORTANT: Merge Note for dashboard-metric-chart.tsx

Plans 1 and 2 both modify `dashboard-metric-chart.tsx`:

| Plan   | Changes                                               |
| ------ | ----------------------------------------------------- |
| Plan 1 | Uses unified metadata (chartConfig.title, valueLabel) |
| Plan 2 | Adds goal reference line (ReferenceLine component)    |

**These changes are in different parts of the file** and can be merged cleanly.
Recommended order: Run Plan 1 first (metadata), then Plan 2 (goal line).

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
- **DELETE old goal-calculation.ts** (not just re-export)

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
- Uses `api.pipeline.*` paths (requires Plan 5)
- **DELETE deprecated use-optimistic-metric-update.ts**

### Plan 5: Router Split

- `goal.ts` - goal operations
- `manual-metric.ts` - manual metrics
- `pipeline.ts` - refresh/regenerate/progress
- `metric.ts` - CRUD only (200 lines vs 821)
- **DELETE transformer.ts permanently** (no recreation)

### Plan 6: Dialog Cleanup

- Registry pattern for dialogs
- Single `<MetricDialog>` component
- Remove 5 duplicate wrapper files
- Keep unique Content components
- **Manual metrics intentionally excluded** (separate flow)

### Plan 7: Transformer Regeneration (Added to pipeline.ts)

- **ADD to pipeline.ts**: `regenerateIngestionOnly` procedure
- **ADD to pipeline.ts**: `regenerateChartOnly` procedure
- **ADD to pipeline.ts**: `getTransformerInfo` procedure
- UI buttons for granular control
- Transformer info display
- **Metadata regeneration rules** (when to preserve user overrides)

---

## Router Structure After All Plans

```
src/server/api/routers/
├── metric.ts          # CRUD only (~200 lines)
├── goal.ts            # Goal operations (Plan 5)
├── manual-metric.ts   # Manual metric operations (Plan 5)
├── pipeline.ts        # ALL pipeline operations (Plan 5 + Plan 7)
│   ├── refresh                  # Soft refresh (Plan 5)
│   ├── regenerate               # Hard refresh (Plan 5)
│   ├── getProgress              # Progress polling (Plan 5)
│   ├── regenerateIngestionOnly  # Data transformer only (Plan 7)
│   ├── regenerateChartOnly      # Chart transformer only (Plan 7)
│   └── getTransformerInfo       # Transformer metadata (Plan 7)
├── dashboard.ts       # Dashboard queries (unchanged)
└── (NO transformer.ts - permanently deleted)
```

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
```

---

## Running the Plans

### To run Plan 1:

```
Read docs/plans/plan-1-pipeline-core.md and implement all tasks
```

### To run multiple plans in parallel:

Start new Claude Code sessions for each plan, or use worktrees.

**IMPORTANT**: Only Plans 1, 2, 3 can run in parallel. All others have dependencies:

- Plan 5 requires Plan 1
- Plan 4 requires Plan 5
- Plan 6 requires Plan 4
- Plan 7 requires Plan 5

---

## Summary of New Features

| Feature                              | Plan   | Status   |
| ------------------------------------ | ------ | -------- |
| Independent metrics (no caching)     | Plan 1 | Detailed |
| Delete old data on force refetch     | Plan 1 | Detailed |
| Unified metadata (title, valueLabel) | Plan 1 | Detailed |
| Fire-and-forget pipeline             | Plan 5 | Detailed |
| Goal line on chart                   | Plan 2 | Detailed |
| ChartTransformer as source of truth  | Plan 2 | Detailed |
| Chart animations                     | Plan 3 | Detailed |
| Granular transformer regeneration    | Plan 7 | Detailed |
| Metadata regeneration rules          | Plan 7 | Detailed |

---

## Backward Compatibility

Old metrics on production will continue to work. When you do a **hard refresh** on an old metric:

1. New code looks for transformer with `metricId` key → Not found
2. Creates new independent transformer for that metric
3. Old shared transformer becomes orphaned (can cleanup later)
4. **No migration needed**

---

## Key Architecture Decisions

These decisions apply across ALL plans:

| Decision               | Choice                             | Rationale                                |
| ---------------------- | ---------------------------------- | ---------------------------------------- |
| Transformer cache key  | `metricId` (not `templateId`)      | Each metric independent, no shared state |
| Error handling         | Show error + suggest action        | User controls retry, no auto-retry       |
| Soft refresh migration | Show error, suggest hard refresh   | Minimal disruption to existing users     |
| Logging                | Log everything to MetricApiLog     | Better debugging, existing table         |
| User override UX       | Auto-save as override (no warning) | Simpler UX, less friction                |
| Metadata source        | ChartTransformer output only       | Single source of truth, no fallbacks     |
| Manual metrics         | Separate dialog flow               | Different UX requirements                |
| transformer.ts         | DELETE permanently                 | All procedures move to pipeline.ts       |

---

## WHAT NOT TO DO (Global Rules)

1. **DO NOT use `templateId` as transformer cache key** - Always `metricId`
2. **DO NOT auto-retry on transformer failure** - Show error, let user decide
3. **DO NOT auto-migrate old metrics on soft refresh** - Require hard refresh
4. **DO NOT skip MetricApiLog logging** - Log all pipeline events
5. **DO NOT show warnings when user edits metadata** - Auto-save as override
6. **DO NOT create fallback chains** - Single source: `chartConfig.*`
7. **DO NOT use `db` directly in routers** - Always `ctx.db`
8. **DO NOT regenerate metadata on soft refresh** - Only on hard refresh
9. **DO NOT recreate transformer.ts** - Plan 7 adds to pipeline.ts instead

---

## Authorization Helper Reference

All router procedures should use `workspaceProcedure` and the following helper signature:

```typescript
// CORRECT signature for getMetricAndVerifyAccess:
await getMetricAndVerifyAccess(ctx.db, metricId, ctx.workspace.organizationId);

// CORRECT signature for getTeamAndVerifyAccess:
await getTeamAndVerifyAccess(ctx.db, teamId, ctx.user.id, ctx.workspace);

// CORRECT signature for getIntegrationAndVerifyAccess:
await getIntegrationAndVerifyAccess(
  ctx.db,
  connectionId,
  ctx.user.id,
  ctx.workspace,
);
```

**NOTE**: `getMetricAndVerifyAccess` only takes 3 params (db, metricId, organizationId), NOT userId/workspace.

---

## Router Transition (Plan 5)

The existing `transformer.ts` router is **DELETED permanently** in Plan 5:

| Old Procedure (Deleted in P5)            | New Location                               |
| ---------------------------------------- | ------------------------------------------ |
| `transformer.refreshMetric`              | `pipeline.refresh` / `pipeline.regenerate` |
| `transformer.createChartTransformer`     | Internal only (called by pipeline)         |
| `transformer.regenerateChartTransformer` | `pipeline.regenerateChartOnly` (Plan 7)    |
| `transformer.updateManualChart`          | `manualMetric.updateChart`                 |

**Plan 7 does NOT recreate transformer.ts** - it adds procedures to `pipeline.ts`.

---

## metric.create = Full Pipeline Run

Creating a metric runs the **same pipeline steps** as a hard refresh:

1. Create Metric + DashboardChart records
2. Fetch data from API
3. Generate ingestion transformer (AI)
4. Execute ingestion transformer
5. Save data points
6. Generate chart transformer (AI)
7. Execute chart transformer
8. Save chart config

The PipelineRunner class can be reused for both `metric.create` and `pipeline.regenerate`.

---

## Line Count Summary

### Files DELETED (Permanent)

| File                                        | Lines    | Plan   |
| ------------------------------------------- | -------- | ------ |
| `src/server/api/routers/transformer.ts`     | 132      | Plan 5 |
| `src/server/api/utils/goal-calculation.ts`  | 494      | Plan 2 |
| `src/hooks/use-optimistic-metric-update.ts` | 85       | Plan 4 |
| 5 dialog wrappers (GitHub, Linear, etc.)    | ~195     | Plan 6 |
| **Total deleted**                           | **~906** |        |

### Files REDUCED

| File                               | Before | After | Reduction |
| ---------------------------------- | ------ | ----- | --------- |
| `src/server/api/routers/metric.ts` | 867    | ~200  | 667 lines |

### Net Impact

With new files created for better organization, the net is approximately:

- **Deletions**: ~1573 lines (906 deleted + 667 reduced)
- **Additions**: ~1500 lines (new organized modules)
- **Net change**: ~-73 lines (slight reduction)

The real gain is **organization and reusability**, not raw line count.

---

## Future Optimization Opportunities

These are NOT part of the current plans but noted for future work:

### 1. Reduce DB Calls in goal.get

Current `metric.getGoal` makes 4 separate DB calls:

1. `getMetricAndVerifyAccess()`
2. `metricGoal.findUnique()`
3. `dashboardChart.findFirst()`
4. `dataIngestionTransformer.findUnique()`

Could be optimized to 1 call with includes:

```typescript
const metric = await ctx.db.metric.findUnique({
  where: { id: metricId },
  include: {
    goal: true,
    dashboardCharts: {
      include: { chartTransformer: true },
    },
  },
});
```

### 2. Orphaned Transformer Cleanup

After deploying independent metrics (Plan 1), old shared transformers keyed by `templateId` become orphaned. Cleanup script (run once, manually):

```sql
-- Find orphaned DataIngestionTransformers
SELECT * FROM "DataIngestionTransformer"
WHERE "templateId" NOT LIKE 'metric_%'
  AND "templateId" NOT IN (SELECT id FROM "Metric");
```

### 3. MetricApiLog Pruning

MetricApiLog grows continuously. Consider:

- TTL index (auto-delete after 30 days)
- Archive to cold storage
- Aggregate old logs
