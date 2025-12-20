# Codebase Cleanup Plan

Updated after PR #191 cleanup (removed ~6,500 lines of demo pages).

---

## Phase 1: Security Fixes (CRITICAL)

### 1.1 Fix metric.getById Authorization

**File:** `src/server/api/routers/metric.ts` (lines 49-55)

```tsx
// BEFORE (insecure - can access any metric by ID)
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

- [ ] `src/app/_components/benefits-section.tsx` (198 lines)
- [ ] `src/app/_components/cta-section.tsx` (114 lines)
- [ ] `src/app/_components/hero-section.tsx` (105 lines)
- [ ] `src/app/_components/demo-charts.tsx` (~50 lines)
- [ ] `src/app/_components/features-carousel.tsx` (306 lines)
- [ ] `src/app/_components/features-carousel-v2.tsx` (298 lines)
- [ ] `src/app/_components/features-product-carousel.tsx` (223 lines)

**Update index.ts:**

- [ ] Remove exports from `src/app/_components/index.ts`

### 2.2 Remove Unused Feature Demos

**Directory to delete:**

- [ ] `src/app/_components/feature-demos/` (entire folder)
  - collaboration-demo.tsx
  - metrics-tracking-demo.tsx
  - mini-chart-demo.tsx
  - mini-role-canvas.tsx
  - visual-org-structure.tsx
  - index.ts

### 2.3 Remove Unused Hooks

**Files to delete:**

- [ ] `src/hooks/use-dropdown.tsx` (29 lines) - 0 imports found

**KEEP:**

- `src/hooks/use-mobile.ts` - Used in `src/components/ui/sidebar.tsx`

### 2.4 Remove Unused Skiper UI Components

**Files to delete:**

- [ ] `src/components/ui/skiper-ui/skiper4.tsx` - Not imported anywhere
- [ ] `src/components/ui/skiper-ui/skiper40.tsx` - Not imported anywhere

**KEEP:**

- `skiper26.tsx` - Used in `src/components/navbar/FancyNav.client.tsx`

---

## Phase 3: Fix Duplications

### 3.1 Extract getBaseUrl Utility

**Problem:** `getBaseUrl()` defined in two places with different implementations

**Location 1:** `src/trpc/react.tsx` (lines 80-84)

- Comprehensive: checks browser, VERCEL_URL, localhost fallback

**Location 2:** `src/server/api/routers/admin-portal.ts` (lines 17-19)

- Simple: only checks NEXT_PUBLIC_APP_URL

**Fix:**

- [ ] Create `src/lib/get-base-url.ts` with unified implementation
- [ ] Update both files to import from shared utility

### 3.2 Consolidate Team Edge Utilities

**Problem:** `public-team-edge.tsx` duplicates `getFloatingEdgeParams` locally

**Fix:**

- [ ] Update `src/app/public/team/[teamId]/_components/public-team-edge.tsx`
- [ ] Import from `@/lib/canvas/edges/floating-edge-utils`
- [ ] Remove local duplicate function

### 3.3 Merge Share Token Procedures (Follow-up PR)

**File:** `src/server/api/routers/team.ts`

**Current (3 procedures):**

- `generateShareToken` (lines 135-157)
- `disableSharing` (lines 159-178)
- `enableSharing` (lines 180-207)

**Target (2 procedures):**

- [ ] `setPublicSharing(teamId, enabled: boolean)`
- [ ] `regenerateShareToken(teamId)`

### 3.4 Merge Role Assignment Procedures (Follow-up PR)

**File:** `src/server/api/routers/role.ts`

**Current:** `assign` + `unassign`
**Target:** `updateAssignment(id, userId: string | null)`

### 3.5 Standardize Procedure Naming

- [ ] `role.getByTeam` → `role.getByTeamId`

---

## Phase 4: Naming Convention Fixes

### 4.1 Client/Server File Naming (Low Priority)

**Current inconsistent patterns:**

- `.client.tsx` suffix: `FancyNav.client.tsx`, `ThemeSwitch.client.tsx`
- `-client.tsx` suffix: `dashboard-client.tsx`
- `Client.tsx` suffix: `MembersListClient.tsx`
- No suffix (just 'use client'): Most components

**Recommendation:** Standardize to 'use client' directive only (Next.js standard)

### 4.2 Component File Naming (Low Priority)

**Mixed patterns:**

- PascalCase: `UserRolesDialog.tsx`, `AllMembersSheet.tsx`
- kebab-case: `team-canvas.tsx`, `role-dialog.tsx`

**Recommendation:** Standardize to kebab-case

---

## Phase 5: Future Improvements

### 5.1 Extract Shared Components

- RoleNodeTemplate (combine role-node.tsx + public-role-node.tsx)
- Delete confirmation hook

### 5.2 Metric Dialog Factory

Create factory pattern for 5 nearly identical dialog wrappers

### 5.3 Performance

- Make MetricApiLog conditional on NODE_ENV
- Fix double data point fetch
- Simplify goal calculation (271 → ~50 lines)

---

## Execution Order

### This PR (Immediate)

1. Phase 1: Security fixes
2. Phase 2: Remove dead code
3. Phase 3.1: Extract getBaseUrl
4. Phase 3.2: Fix edge utility duplication
5. Phase 3.5: Standardize naming

### Follow-up PR

6. Phase 3.3: Merge share token procedures
7. Phase 3.4: Merge role assignment procedures

### Future

8. Phase 4: Naming conventions
9. Phase 5: Shared components & performance

---

## Summary Table

| Category                  | Files         | Lines            | Priority |
| ------------------------- | ------------- | ---------------- | -------- |
| Security fixes            | 1             | ~20              | CRITICAL |
| Unused landing components | 7             | ~1,300           | HIGH     |
| Unused feature demos      | 6             | ~400             | HIGH     |
| Unused hooks              | 1             | ~30              | MEDIUM   |
| Unused skiper UI          | 2             | ~500             | MEDIUM   |
| Duplicate utilities       | 2             | ~10              | MEDIUM   |
| Edge utility duplication  | 1             | ~20              | MEDIUM   |
| **Total removals**        | **~18 files** | **~2,300 lines** |          |

---

## Verification Steps

After cleanup:

- [ ] `pnpm check` (lint + typecheck)
- [ ] `pnpm build` (production build)
- [ ] `pnpm exec playwright test` (E2E tests)
- [ ] Manual: Team canvas CRUD
- [ ] Manual: Dashboard metrics
- [ ] Manual: Public sharing
