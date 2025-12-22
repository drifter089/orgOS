# Plan 8: Chart Settings Drawer Redesign

## Overview

- **Can Start**: Anytime (independent)
- **Parallel With**: Any other plan
- **Dependencies**: None

## Goals

1. Complete redesign of chart settings drawer UI
2. Based on provided design images (to be added)
3. Keep functionality, improve UX

---

## Status: AWAITING DESIGN INPUT

This plan requires design images and additional prompts from user.

**Placeholder tasks** (will be updated when designs are provided):

---

## Task 1: Review Current Drawer Implementation

**Current File**: `src/app/dashboard/[teamId]/_components/dashboard-metric-drawer.tsx`

Current drawer includes:

- Metric name and description editing
- Delete metric button
- Refresh/Regenerate buttons
- Goal settings (via GoalEditor)
- Role assignment (for team metrics)

---

## Task 2: [PENDING] New Drawer Layout

_To be defined based on design images_

Likely sections:

- Header with metric info
- Quick actions (refresh, regenerate)
- Settings tabs or sections
- Goal configuration
- Advanced options
- Danger zone (delete)

---

## Task 3: [PENDING] Component Implementation

_To be defined based on design images_

New components to create:

- TBD

---

## Task 4: [PENDING] Integration with Existing Features

Ensure new drawer works with:

- Pipeline progress display (Plan 4)
- Goal editing (Plan 2)
- Transformer regeneration (Plan 7)

---

## Files Summary

| Action | File                                                                 |
| ------ | -------------------------------------------------------------------- |
| MODIFY | `src/app/dashboard/[teamId]/_components/dashboard-metric-drawer.tsx` |
| CREATE | TBD based on design                                                  |

---

## Notes for Implementation

When design is provided:

1. Update this plan with detailed tasks
2. Include component structure
3. Include styling approach (Tailwind classes, shadcn components)
4. Include responsive behavior
5. Include accessibility considerations

---

## Design Requirements Checklist

When providing designs, please include:

- [ ] Desktop layout (full drawer)
- [ ] Mobile layout (if different)
- [ ] States: default, loading, error
- [ ] Interaction patterns (hover, focus, etc.)
- [ ] Any animations or transitions
