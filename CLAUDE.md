# CLAUDE.md

This file provides guidance to Claude Code when working with this codebase.

## Documentation Policy

**DO NOT create random .md documentation files when implementing features.**

- Provide explanations in chat messages
- Add comments in code where necessary
- Update existing documentation (CLAUDE.md, README.md) only if required
- Only create documentation files if explicitly requested

## Project Overview

A T3 Stack application for team management with visual organization canvases, role & metric tracking, and multi-tenant architecture.

**Core Stack:**

- Next.js 15 (App Router)
- tRPC 11 with TanStack Query
- Prisma 6 with PostgreSQL (Accelerate caching)
- WorkOS AuthKit authentication
- React Flow for canvas visualizations
- Zustand for local state
- Tailwind CSS with shadcn/ui

## Development Commands

```bash
# Development
pnpm dev              # Start dev server with Turbo
pnpm build            # Build for production
pnpm preview          # Build and start production server

# Code Quality
pnpm check            # Run linting and type checking
pnpm lint:fix         # Auto-fix ESLint issues
pnpm format:write     # Format code with Prettier

# Database
pnpm db:generate      # Generate Prisma client
pnpm db:push          # Push schema changes
pnpm db:studio        # Open Prisma Studio

# Testing
pnpm exec playwright test                          # Run all tests
pnpm exec playwright test --project=chromium       # Chromium only
pnpm exec playwright test tests/auth-authenticated.spec.ts  # Specific file
```

## Directory Structure

```
src/
├── app/                           # Next.js pages
│   ├── _components/               # Root-level page components (landing)
│   ├── api/                       # API routes (cron, callbacks)
│   ├── dashboard/[teamId]/        # Metrics dashboard
│   ├── docs/                      # MDX documentation
│   ├── integration/               # Integration management
│   ├── metric/_components/        # Metric dialogs (per provider)
│   ├── org/                       # Organization settings
│   ├── public/                    # Public-facing views
│   └── teams/[teamId]/            # Team canvas (React Flow)
│
├── components/                    # Shared UI
│   ├── ui/                        # shadcn/ui components (54 files)
│   ├── charts/                    # Recharts wrappers
│   ├── navbar/                    # Navigation
│   └── react-flow/                # BaseNode, BaseHandle, ZoomSlider
│
├── lib/                           # Utilities
│   ├── canvas/                    # Reusable React Flow library
│   ├── integrations/              # Provider configurations
│   ├── metrics/                   # Transformer types
│   └── helpers/                   # Helper functions
│
├── server/                        # Server-only code
│   ├── api/
│   │   ├── routers/               # tRPC routers (12 total)
│   │   ├── services/              # Business logic
│   │   └── utils/                 # Authorization, caching
│   └── db.ts                      # Prisma singleton
│
├── trpc/                          # tRPC client setup
├── providers/                     # React context providers
├── hooks/                         # Shared hooks
└── middleware.ts                  # Auth middleware
```

## Architecture Patterns

### Authentication Flow

WorkOS middleware runs on all routes. Public routes: `/`, `/docs`, `/public/*`.

```tsx
// tRPC: protectedProcedure validates ctx.user
// No manual auth checks needed in components
// NavBar uses try-catch for graceful auth handling
```

### tRPC Dual API Pattern

```tsx
// Server Components: Direct calls (10x faster)
import { api } from "@/trpc/server";
const data = await api.team.getById({ id });

// Client Components: React hooks with TanStack Query
import { api } from "@/trpc/react";
const { data } = api.team.getById.useQuery({ id });
```

### Adding New tRPC Routes

1. Create router in `src/server/api/routers/[name].ts`
2. Use `protectedProcedure` or `workspaceProcedure`
3. Add to `appRouter` in `src/server/api/root.ts`
4. Add authorization checks using utils from `authorization.ts`

### Authorization Helpers

```tsx
import {
  getMetricAndVerifyAccess,
  getRoleAndVerifyAccess,
  getTeamAndVerifyAccess,
} from "@/server/api/utils/authorization";

// Always verify resource belongs to user's organization
const team = await getTeamAndVerifyAccess(db, teamId, userId, workspace);
```

## Team Canvas System

The team canvas (`/teams/[teamId]`) is a React Flow-based visualization with 30 files.

### Data Flow

```
page.tsx (Server)
  → Prefetch: role.getByTeamId, organization.getMembers
  → enrichNodesWithRoleData(storedNodes)
  → <HydrateClient>
    → <TeamStoreProvider> (Zustand)
      → <ChartDragProvider>
        → <TeamCanvas> (React Flow)
```

### Node Types

| Type       | Data Stored             | Display Source           |
| ---------- | ----------------------- | ------------------------ |
| role-node  | `{ roleId }`            | TanStack Query cache     |
| text-node  | `{ text, fontSize }`    | Direct node.data         |
| chart-node | `{ dashboardMetricId }` | Database via props       |
| freehand   | `{ points }`            | Session only (not saved) |

### Key Pattern: Cache-First Nodes

Role nodes store ONLY `roleId`. Display data fetched from TanStack Query cache:

```tsx
// use-role-data.tsx
export function useRoleData(roleId: string) {
  const { data: roles } = api.role.getByTeamId.useQuery({ teamId });
  return useMemo(() => roles?.find((r) => r.id === roleId), [roles, roleId]);
}
```

### Store Pattern

```tsx
// Zustand + Context pattern in team-store.tsx
const TeamStoreContext = createContext<StoreApi<TeamStore> | null>(null);

// Access in components
const nodes = useTeamStore((state) => state.nodes);
const storeApi = useTeamStoreApi(); // For callbacks (avoids stale closures)
```

### Auto-Save System

```
Canvas changes → markDirty() → Debounce 2s → serializeNodes/Edges → tRPC mutation
                                              ↓
                                    beforeunload: sendBeacon fallback
```

### Cache Pipeline: Role Mutations

Two cache layers: TanStack Query (client) and Prisma Accelerate (server).

```
User updates role
  → onMutate: Optimistic update (instant UI feedback)
  → Server mutation runs
  → onSuccess:
      1. setData(updatedRole)  ← Critical: use server response
      2. invalidate()          ← Background refresh
  → onError: Rollback to previousData
```

**Why `setData` before `invalidate`?** Prisma Accelerate cache may not propagate immediately. If we only call `invalidate()`, the refetch might return stale data. Setting cache with server response ensures correct data.

Key files:

- `src/hooks/use-optimistic-role-update.ts` - Shared hook for all role mutations
- `src/app/teams/[teamId]/hooks/use-update-role.tsx` - Canvas-specific wrapper (adds markDirty)

### Canvas Library (`src/lib/canvas/`)

Reusable patterns for React Flow canvases:

```
src/lib/canvas/
├── store/create-canvas-store.tsx   # Generic store factory
├── hooks/use-auto-save.ts          # Debounced save hook
├── components/save-status.tsx      # Save indicator UI
├── edges/edge-action-buttons.tsx   # Edge interaction buttons
├── edges/floating-edge-utils.ts    # Edge path calculations
└── freehand/                       # Drawing mode components
```

## Metrics Pipeline

### Three-Stage Transformation

```
Stage 1: API → DataPoints
  fetchData() → DataIngestionTransformer (AI-generated) → MetricDataPoint[]

Stage 2: DataPoints → ChartConfig
  MetricDataPoint[] → ChartTransformer (AI-generated) → ChartConfig

Stage 3: ChartConfig → UI
  ChartConfig → DashboardMetricChart (Recharts)
```

### Key Models

- **Metric**: Core metric with integrationId, templateId, pollFrequency
- **MetricDataPoint**: Time-series data (unique on metricId + timestamp)
- **DashboardChart**: Chart configuration linked to Metric
- **DataIngestionTransformer**: AI code for API → DataPoints
- **ChartTransformer**: AI code for DataPoints → ChartConfig

### Polling System

Cron (`/api/cron/poll-metrics`) runs every 15 minutes for metrics with `nextPollAt <= now()`.

Poll frequencies: `frequent` (15m), `hourly`, `daily`, `weekly`, `manual`

### Adding New Integrations

1. Create provider config in `src/lib/integrations/`
2. Add metric dialog in `src/app/metric/_components/[provider]/`
3. Create `[Provider]MetricDialog.tsx` + `[Provider]MetricContent.tsx`
4. Register in `src/app/metric/_components/index.ts`

## Dashboard KPI Page

The dashboard (`/dashboard/[teamId]`) displays metric charts with role assignments.

### Cache Pipeline: Dashboard Charts

Uses `dashboard.getDashboardCharts` query which includes nested role data.

```
Role-metric assignment changes
  → onMutate: Update both role + dashboard caches optimistically
  → Server mutation
  → onSuccess:
      1. setData for role cache (server response)
      2. invalidate both role + dashboard caches
```

Role assignments appear in two places:

- **Role cache**: `role.getByTeamId` - role has `metricId` field
- **Dashboard cache**: `dashboard.getDashboardCharts` - chart.metric.roles array

When linking/unlinking roles to metrics, both caches must be updated for consistent UI.

Key files:

- `src/hooks/use-optimistic-role-update.ts` - Updates both caches
- `src/components/metric/role-assignment.tsx` - Role assignment UI in metric drawer

## Environment Variables

Required (see `.env.example`):

```
DATABASE_URL           # PostgreSQL connection
WORKOS_API_KEY         # WorkOS API key
WORKOS_CLIENT_ID       # WorkOS client ID
WORKOS_COOKIE_PASSWORD # 32-char session secret
NEXT_PUBLIC_WORKOS_REDIRECT_URI  # OAuth callback
TEST_USER_EMAIL        # Playwright test user
TEST_USER_PASSWORD     # Playwright test password
```

Validated via `@t3-oss/env-nextjs` in `src/env.js`.

## Code Quality

Pre-commit hooks (Husky + lint-staged):

- ESLint auto-fix
- Prettier formatting
- Runs on staged files only

Import sorting: `@trivago/prettier-plugin-sort-imports` with inline type imports.

## Component Patterns

### shadcn/ui Components

Located in `src/components/ui/`. Use CLI for new components:

```bash
npx shadcn@latest add [component-name]
```

### React Flow Primitives

Shared in `src/components/react-flow/`:

- `BaseNode` - Styled node container
- `BaseHandle` - Styled handles
- `ZoomSlider` - Zoom controls

### Metric Dialogs

Each integration in `src/app/metric/_components/`:

```
github/
  ├── GitHubMetricDialog.tsx    # Dialog wrapper
  └── GitHubMetricContent.tsx   # Form content
linear/
  ├── LinearMetricDialog.tsx
  └── LinearMetricContent.tsx
```

Uses shared `MetricDialogBase` from `base/`.

## Testing

Playwright E2E tests in `tests/`.

- Global setup handles authentication
- Use `authenticatedPage` fixture for auth-required tests
- Tests run against `http://localhost:3000`

## Common Tasks

### Adding Canvas Node Types

1. Create node component in `teams/[teamId]/_components/`
2. Add type to `TeamNode` union in `types/canvas.ts`
3. Register in `nodeTypes` in `team-canvas.tsx`
4. Update serialization in `canvas-serialization.ts`

### Adding tRPC Procedures

1. Add procedure to appropriate router
2. Use `workspaceProcedure` for org-scoped operations
3. Call authorization helpers for resource verification
4. Invalidate cache tags after mutations:
   ```tsx
   await invalidateCacheByTags(ctx.db, [`team_${teamId}`]);
   ```

## Known Issues & Cleanup Needed

### Duplications to Consolidate

**Metric Dialogs (5 nearly identical wrappers):**

- Consider factory pattern to reduce duplication

**Role Nodes:**

- `role-node.tsx` vs `public-role-node.tsx` - 75% identical
- Extract shared `RoleNodeTemplate` with `isEditable` prop

**Dashboard Cards:**

- `dashboard-metric-card.tsx` vs `public-dashboard-metric-card.tsx`
- Add `readOnly` mode instead of separate components

### Performance Issues

- `MetricApiLog` writes on every fetch (debugging overhead in production)
- Double data point fetching on metric refresh
- Goal calculation utility is 271 lines (could be 50)
