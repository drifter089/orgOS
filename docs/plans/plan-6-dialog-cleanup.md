# Plan 6: Dialog Factory & Cleanup

## Overview

- **Can Start**: After Plan 4 (uses useMetricMutations)
- **Depends On**: Plan 4
- **Enables**: Nothing (independent)

## Goals

1. Create dialog registry for integration configs
2. Create unified MetricDialog component
3. Remove 5 duplicate dialog wrapper files
4. Keep Content components (they're unique per integration)

---

## Task 1: Create Dialog Registry

**File**: `src/app/metric/_components/dialog-registry.ts`

```typescript
import type { ComponentType } from "react";

import dynamic from "next/dynamic";

// Types
export interface ContentProps {
  integrations: Integration[];
  selectedConnectionId: string | null;
  onConnectionSelect: (id: string) => void;
  onSubmit: (data: MetricCreateInput) => Promise<void>;
  isSubmitting: boolean;
}

export interface DialogConfig {
  integrationId: string;
  title: string;
  description: string;
  Content: ComponentType<ContentProps>;
}

// Lazy load content components
const GitHubMetricContent = dynamic(() =>
  import("./github/GitHubMetricContent").then((m) => ({
    default: m.GitHubMetricContent,
  })),
);

const LinearMetricContent = dynamic(() =>
  import("./linear/LinearMetricContent").then((m) => ({
    default: m.LinearMetricContent,
  })),
);

const PostHogMetricContent = dynamic(() =>
  import("./posthog/PostHogMetricContent").then((m) => ({
    default: m.PostHogMetricContent,
  })),
);

const YouTubeMetricContent = dynamic(() =>
  import("./youtube/YouTubeMetricContent").then((m) => ({
    default: m.YouTubeMetricContent,
  })),
);

const GoogleSheetsMetricContent = dynamic(() =>
  import("./google-sheets/GoogleSheetsMetricContent").then((m) => ({
    default: m.GoogleSheetsMetricContent,
  })),
);

// Registry
// NOTE: Manual metrics are INTENTIONALLY excluded from this registry.
// They have a separate flow via ManualMetricContent and don't go through
// the integration dialog system. This is by design - manual metrics have
// different UX requirements (no integration connection, different form fields).
export const DIALOG_REGISTRY: Record<string, DialogConfig> = {
  github: {
    integrationId: "github",
    title: "Create GitHub Metric",
    description: "Track commits, pull requests, and code activity",
    Content: GitHubMetricContent,
  },
  linear: {
    integrationId: "linear",
    title: "Create Linear Metric",
    description: "Track issues, cycles, and team velocity",
    Content: LinearMetricContent,
  },
  posthog: {
    integrationId: "posthog",
    title: "Create PostHog Metric",
    description: "Track events, users, and product analytics",
    Content: PostHogMetricContent,
  },
  youtube: {
    integrationId: "youtube",
    title: "Create YouTube Metric",
    description: "Track video views, engagement, and channel stats",
    Content: YouTubeMetricContent,
  },
  "google-sheets": {
    integrationId: "google-sheets",
    title: "Create Google Sheets Metric",
    description: "Import custom metrics from spreadsheets",
    Content: GoogleSheetsMetricContent,
  },
  // Manual metrics NOT included - separate flow via ManualMetricContent
};

// Helper functions
export function getDialogConfig(integrationId: string): DialogConfig | null {
  return DIALOG_REGISTRY[integrationId] ?? null;
}

export function getAvailableIntegrations(): string[] {
  return Object.keys(DIALOG_REGISTRY);
}

export function hasDialog(integrationId: string): boolean {
  return integrationId in DIALOG_REGISTRY;
}
```

---

## Task 2: Create Unified MetricDialog Component

**File**: `src/app/metric/_components/metric-dialog.tsx`

```typescript
"use client";

import { MetricDialogBase, type MetricDialogBaseProps } from "./base/MetricDialogBase";
import { getDialogConfig } from "./dialog-registry";

interface MetricDialogProps extends Omit<MetricDialogBaseProps, "integrationId" | "children"> {
  integrationId: string;
}

/**
 * Unified metric dialog component.
 * Automatically loads the correct content based on integrationId.
 */
export function MetricDialog({ integrationId, ...props }: MetricDialogProps) {
  const config = getDialogConfig(integrationId);

  if (!config) {
    console.error(`No dialog config for integration: ${integrationId}`);
    return null;
  }

  const { Content } = config;

  return (
    <MetricDialogBase
      integrationId={integrationId}
      {...props}
    >
      {(contentProps) => <Content {...contentProps} />}
    </MetricDialogBase>
  );
}

// Re-export utilities
export { getDialogConfig, getAvailableIntegrations, hasDialog } from "./dialog-registry";
```

---

## Task 3: Update Index Exports

**File**: `src/app/metric/_components/index.ts`

```typescript
// New unified dialog
export {
  MetricDialog,
  getDialogConfig,
  getAvailableIntegrations,
  hasDialog,
} from "./metric-dialog";

// Keep content exports for direct use
export { GitHubMetricContent } from "./github/GitHubMetricContent";
export { LinearMetricContent } from "./linear/LinearMetricContent";
export { PostHogMetricContent } from "./posthog/PostHogMetricContent";
export { YouTubeMetricContent } from "./youtube/YouTubeMetricContent";
export { GoogleSheetsMetricContent } from "./google-sheets/GoogleSheetsMetricContent";
export { ManualMetricContent } from "./manual/ManualMetricContent";

// Base components
export { MetricDialogBase } from "./base/MetricDialogBase";
export { GoalSetupStep } from "./base/GoalSetupStep";

// DEPRECATED: Old dialog exports (remove after migration)
// export { GitHubMetricDialog } from "./github/GitHubMetricDialog";
// etc.
```

---

## Task 4: Update Consumers

**All consumers using dialog wrappers (2 files):**

| File                                                           | Current Usage                                                              |
| -------------------------------------------------------------- | -------------------------------------------------------------------------- |
| `src/app/integration/page.tsx`                                 | Imports 5 dialogs, passes to `MetricDialogs` prop                          |
| `src/app/dashboard/[teamId]/_components/dashboard-sidebar.tsx` | Imports 6 dialogs (5 + ManualMetricDialog), passes to `MetricDialogs` prop |

---

### Consumer 1: `src/app/integration/page.tsx`

**Before**:

```tsx
import {
  GitHubMetricDialog,
  GoogleSheetsMetricDialog,
  LinearMetricDialog,
  PostHogMetricDialog,
  YouTubeMetricDialog,
} from "@/app/metric/_components";

// Usage with MetricDialogs prop pattern:
<SomeComponent
  showMetricDialogs={true}
  MetricDialogs={{
    github: GitHubMetricDialog,
    posthog: PostHogMetricDialog,
    youtube: YouTubeMetricDialog,
    "google-sheet": GoogleSheetsMetricDialog,
    linear: LinearMetricDialog,
  }}
/>;
```

**After**:

```tsx
import { MetricDialog } from "@/app/metric/_components";

// Usage - MetricDialog handles routing by integrationId:
<SomeComponent
  showMetricDialogs={true}
  MetricDialog={MetricDialog}
  // Or render directly:
  // <MetricDialog integrationId={selectedIntegration} {...props} />
/>;
```

---

### Consumer 2: `src/app/dashboard/[teamId]/_components/dashboard-sidebar.tsx`

**Before**:

```tsx
import {
  GitHubMetricDialog,
  GoogleSheetsMetricDialog,
  LinearMetricDialog,
  ManualMetricDialog,
  PostHogMetricDialog,
  YouTubeMetricDialog,
} from "@/app/metric/_components";

// MetricDialogs object pattern:
MetricDialogs={{
  github: GitHubMetricDialog,
  posthog: PostHogMetricDialog,
  youtube: YouTubeMetricDialog,
  "google-sheet": GoogleSheetsMetricDialog,
  linear: LinearMetricDialog,
}}

// ManualMetricDialog used separately (kept as-is)
<ManualMetricDialog ... />
```

**After**:

```tsx
import { MetricDialog, ManualMetricDialog } from "@/app/metric/_components";

// Unified approach - MetricDialog handles all integration types:
<MetricDialog integrationId={selectedIntegration} {...props} />

// ManualMetricDialog unchanged (separate flow)
<ManualMetricDialog ... />
```

---

### Note: Component Pattern Change

The current pattern uses a `MetricDialogs` object mapping integration IDs to components.

After refactor, two approaches:

**Option A**: Keep object pattern, use unified component

```tsx
const MetricDialogs = {
  github: (props) => <MetricDialog integrationId="github" {...props} />,
  linear: (props) => <MetricDialog integrationId="linear" {...props} />,
  // etc
};
```

**Option B (Recommended)**: Simplify to single component

```tsx
// Just pass integrationId directly
<MetricDialog integrationId={integration} {...props} />
```

Choose based on how deeply the `MetricDialogs` object pattern is embedded in the component hierarchy.

---

## Task 5: Remove Old Dialog Wrappers

After all consumers are updated, delete these files:

```
src/app/metric/_components/github/GitHubMetricDialog.tsx
src/app/metric/_components/linear/LinearMetricDialog.tsx
src/app/metric/_components/posthog/PostHogMetricDialog.tsx
src/app/metric/_components/youtube/YouTubeMetricDialog.tsx
src/app/metric/_components/google-sheets/GoogleSheetsMetricDialog.tsx
```

**Keep** these files (they contain unique form logic):

```
src/app/metric/_components/github/GitHubMetricContent.tsx
src/app/metric/_components/linear/LinearMetricContent.tsx
src/app/metric/_components/posthog/PostHogMetricContent.tsx
src/app/metric/_components/youtube/YouTubeMetricContent.tsx
src/app/metric/_components/google-sheets/GoogleSheetsMetricContent.tsx
src/app/metric/_components/manual/ManualMetricContent.tsx
src/app/metric/_components/manual/ManualMetricDialog.tsx  ← ALSO KEEP
```

### Note on Manual Metrics

`ManualMetricDialog.tsx` is **intentionally kept** (not deleted) because manual metrics:

- Don't use integrations (no connectionId)
- Don't go through the standard pipeline
- Have different form fields (unitType, cadence instead of templateId)
- Are excluded from the DIALOG_REGISTRY by design

Manual metrics have their own separate creation flow and should NOT be unified with integration-based metrics.

---

## Task 6: Add New Integration Guide

Update the process for adding new integrations:

**Before (old way)**:

1. Create `NewIntegrationMetricContent.tsx`
2. Create `NewIntegrationMetricDialog.tsx` (copy-paste wrapper)
3. Export from `index.ts`
4. Add conditional rendering in every consumer

**After (new way)**:

1. Create `NewIntegrationMetricContent.tsx`
2. Add entry to `DIALOG_REGISTRY` in `dialog-registry.ts`
3. Done!

```typescript
// dialog-registry.ts - just add:
"new-integration": {
  integrationId: "new-integration",
  title: "Create New Integration Metric",
  description: "Description of what this tracks",
  Content: dynamic(() =>
    import("./new-integration/NewIntegrationMetricContent").then(m => ({
      default: m.NewIntegrationMetricContent
    }))
  ),
},
```

---

## Files Summary

| Action | File                                                                                |
| ------ | ----------------------------------------------------------------------------------- |
| CREATE | `src/app/metric/_components/dialog-registry.ts`                                     |
| CREATE | `src/app/metric/_components/metric-dialog.tsx`                                      |
| MODIFY | `src/app/metric/_components/index.ts`                                               |
| MODIFY | `src/app/integration/page.tsx` (update imports)                                     |
| MODIFY | `src/app/dashboard/[teamId]/_components/dashboard-sidebar.tsx` (update imports)     |
| DELETE | `src/app/metric/_components/github/GitHubMetricDialog.tsx` (~39 lines)              |
| DELETE | `src/app/metric/_components/linear/LinearMetricDialog.tsx` (~39 lines)              |
| DELETE | `src/app/metric/_components/posthog/PostHogMetricDialog.tsx` (~39 lines)            |
| DELETE | `src/app/metric/_components/youtube/YouTubeMetricDialog.tsx` (~39 lines)            |
| DELETE | `src/app/metric/_components/google-sheets/GoogleSheetsMetricDialog.tsx` (~39 lines) |

**Total deletions**: ~195 lines (5 wrapper files)

---

## Testing Checklist

- [ ] GitHub dialog works via MetricDialog
- [ ] Linear dialog works via MetricDialog
- [ ] PostHog dialog works via MetricDialog
- [ ] YouTube dialog works via MetricDialog
- [ ] Google Sheets dialog works via MetricDialog
- [ ] Manual metric dialog still works (separate flow)
- [ ] Goal setup step works after creation
- [ ] Optimistic updates work correctly
- [ ] No TypeScript errors
- [ ] Old dialog files deleted
