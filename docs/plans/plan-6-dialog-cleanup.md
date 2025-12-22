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

Find all places using individual dialogs and update:

**Before**:

```tsx
import {
  GitHubMetricDialog,
  LinearMetricDialog,
  PostHogMetricDialog,
} from "@/app/metric/_components";

// Usage:
{
  integration === "github" && <GitHubMetricDialog {...props} />;
}
{
  integration === "linear" && <LinearMetricDialog {...props} />;
}
{
  integration === "posthog" && <PostHogMetricDialog {...props} />;
}
```

**After**:

```tsx
import { MetricDialog } from "@/app/metric/_components";

// Usage:
<MetricDialog integrationId={integration} {...props} />;
```

### Files to update:

- `src/app/dashboard/[teamId]/_components/add-metric-button.tsx` (if exists)
- `src/app/teams/[teamId]/_components/add-metric-menu.tsx` (if exists)
- Any other components that render metric dialogs

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
```

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

| Action | File                                                                    |
| ------ | ----------------------------------------------------------------------- |
| CREATE | `src/app/metric/_components/dialog-registry.ts`                         |
| CREATE | `src/app/metric/_components/metric-dialog.tsx`                          |
| MODIFY | `src/app/metric/_components/index.ts`                                   |
| MODIFY | Consumer components (update imports)                                    |
| DELETE | `src/app/metric/_components/github/GitHubMetricDialog.tsx`              |
| DELETE | `src/app/metric/_components/linear/LinearMetricDialog.tsx`              |
| DELETE | `src/app/metric/_components/posthog/PostHogMetricDialog.tsx`            |
| DELETE | `src/app/metric/_components/youtube/YouTubeMetricDialog.tsx`            |
| DELETE | `src/app/metric/_components/google-sheets/GoogleSheetsMetricDialog.tsx` |

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
