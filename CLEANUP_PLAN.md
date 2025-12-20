# Codebase Cleanup Plan

This plan outlines all cleanup tasks identified during the comprehensive codebase analysis.

## Phase 1: Security Fixes (CRITICAL)

### 1.1 Fix metric.getById Authorization

**File:** `src/server/api/routers/metric.ts` (lines 49-55)

```tsx
// BEFORE (insecure)
getById: workspaceProcedure
  .input(z.object({ id: z.string() }))
  .query(async ({ ctx, input }) => {
    return ctx.db.metric.findUnique({ where: { id: input.id } });
  }),

// AFTER (secure)
getById: workspaceProcedure
  .input(z.object({ id: z.string() }))
  .query(async ({ ctx, input }) => {
    return getMetricAndVerifyAccess(ctx.db, input.id, ctx.workspace.organizationId);
  }),
```

### 1.2 Fix metric.getByTeamId Authorization

**File:** `src/server/api/routers/metric.ts` (lines 34-47)

Add team ownership verification before querying metrics.

---

## Phase 2: Remove Dead Code

### 2.1 Remove Unused Landing Components

**Files to delete:**

- [ ] `src/app/_components/benefits-section.tsx`
- [ ] `src/app/_components/cta-section.tsx`
- [ ] `src/app/_components/demo-charts.tsx`
- [ ] `src/app/_components/features-carousel.tsx`
- [ ] `src/app/_components/features-carousel-v2.tsx`
- [ ] `src/app/_components/features-product-carousel.tsx`

**Update index.ts:**

- [ ] Remove exports from `src/app/_components/index.ts`

### 2.2 Remove Unused Feature Demos

**Directory to delete:**

- [ ] `src/app/_components/feature-demos/` (entire folder)
  - CollaborationDemo.tsx
  - MetricsTrackingDemo.tsx
  - MiniChartDemo.tsx
  - MiniRoleCanvas.tsx
  - VisualOrgStructure.tsx
  - index.ts

### 2.3 Remove Unused Hooks

**Files to delete:**

- [ ] `src/hooks/use-dropdown.tsx`
- [ ] `src/hooks/use-mobile.ts`

### 2.4 Remove Unused Skiper UI Components

**Files to delete:**

- [ ] `src/components/ui/skiper-ui/skiper26.tsx` (1,192 lines)
- [ ] `src/components/ui/skiper-ui/skiper40.tsx`
- [ ] `src/components/ui/skiper-ui/skiper4.tsx`

**Check if folder can be removed:**

- [ ] If `skiper-ui/` is empty after deletion, remove the folder

---

## Phase 3: Fix Duplications

### 3.1 Consolidate Team Edge Utilities

**Problem:** `public-team-edge.tsx` duplicates `getFloatingEdgeParams` locally

**Fix:**

- [ ] Update `src/app/public/team/[teamId]/_components/public-team-edge.tsx`
- [ ] Import from `@/lib/canvas/edges/floating-edge-utils`
- [ ] Remove local duplicate function

### 3.2 Merge Share Token Procedures

**File:** `src/server/api/routers/team.ts`

**Current (3 procedures):**

- `generateShareToken` (lines 135-157)
- `disableSharing` (lines 159-178)
- `enableSharing` (lines 180-207)

**Target (2 procedures):**

- [ ] `setPublicSharing(teamId, enabled: boolean)` - handles enable/disable
- [ ] `regenerateShareToken(teamId)` - refreshes token only

**Update frontend:**

- [ ] `src/app/teams/[teamId]/_components/share-team-dialog.tsx`

### 3.3 Merge Role Assignment Procedures

**File:** `src/server/api/routers/role.ts`

**Current (2 procedures):**

- `assign` (lines 185-207)
- `unassign` (lines 209-229)

**Target (1 procedure):**

- [ ] `updateAssignment(id, userId: string | null)`

**Update frontend usages**

### 3.4 Standardize Procedure Naming

**Rename:**

- [ ] `role.getByTeam` → `role.getByTeamId` in `src/server/api/routers/role.ts`

**Update all usages:**

- Search for `role.getByTeam` and update to `role.getByTeamId`

---

## Phase 4: Create Shared Components (Optional - Future)

### 4.1 Extract RoleNodeTemplate

**Combine:**

- `src/app/teams/[teamId]/_components/role-node.tsx`
- `src/app/public/team/[teamId]/_components/public-role-node.tsx`

**Create:**

- `src/components/canvas/role-node-template.tsx` with `isEditable` prop

### 4.2 Extract Delete Confirmation Hook

**Create:** `src/app/teams/[teamId]/hooks/use-confirm-delete-role.tsx`

**Consolidate from:**

- `role-node.tsx` (lines 154-161)
- `team-sheet-sidebar.tsx` (lines 217-232)

### 4.3 Metric Dialog Factory (Future)

**Create factory pattern for:**

- GitHubMetricDialog
- LinearMetricDialog
- YouTubeMetricDialog
- PostHogMetricDialog
- GoogleSheetsMetricDialog

---

## Phase 5: Performance Improvements (Optional - Future)

### 5.1 Remove MetricApiLog in Production

**File:** `src/server/api/services/transformation/data-pipeline.ts`

Make MetricApiLog writes conditional on `NODE_ENV === 'development'`

### 5.2 Fix Double Data Point Fetch

**File:** `src/server/api/services/transformation/data-pipeline.ts`

Share data points between `refreshMetricDataPoints` and `executeChartTransformer`

### 5.3 Simplify Goal Calculation

**File:** `src/server/api/utils/goal-calculation.ts`

Reduce from 271 lines to ~50 lines

---

## Execution Order

### Immediate (This PR)

1. ✅ Phase 1: Security fixes
2. ✅ Phase 2: Remove dead code
3. ✅ Phase 3.1: Fix edge utility duplication
4. ✅ Phase 3.4: Standardize naming

### Follow-up PR

5. Phase 3.2: Merge share token procedures
6. Phase 3.3: Merge role assignment procedures

### Future PRs

7. Phase 4: Shared components
8. Phase 5: Performance improvements

---

## Verification Steps

After cleanup:

- [ ] Run `pnpm check` (lint + typecheck)
- [ ] Run `pnpm build` (production build)
- [ ] Run `pnpm exec playwright test` (E2E tests)
- [ ] Manual test: Team canvas CRUD
- [ ] Manual test: Dashboard metrics
- [ ] Manual test: Public sharing

---

## Files Changed Summary

### Deleted (~3,300 lines)

- 6 landing components
- 5 feature demo components
- 2 unused hooks
- 3 skiper UI components

### Modified

- `src/server/api/routers/metric.ts` (security fix)
- `src/server/api/routers/role.ts` (rename procedure)
- `src/app/public/team/[teamId]/_components/public-team-edge.tsx` (use shared util)
- `src/app/_components/index.ts` (remove dead exports)

### Created

- `CLAUDE.md` (rewritten)
