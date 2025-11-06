# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is a T3 Stack application built with Next.js 15, tRPC, Prisma, and WorkOS AuthKit for authentication. The project uses pnpm as the package manager and includes a comprehensive documentation system with MDX support.

## Core Technologies

- **Next.js 15.2.3** - React framework with App Router
- **tRPC** - End-to-end typesafe APIs
- **Prisma** - Database ORM with PostgreSQL
- **WorkOS AuthKit** - Authentication provider
- **TanStack Query** - Data fetching and caching
- **Tailwind CSS** - Styling with shadcn/ui components
- **TypeScript** - Type safety throughout

## Development Commands

```bash
# Development
pnpm dev              # Start dev server with Turbo
pnpm build            # Build for production
pnpm start            # Start production server
pnpm preview          # Build and start production server

# Code Quality
pnpm check            # Run linting and type checking together
pnpm lint             # Run ESLint
pnpm lint:fix         # Auto-fix ESLint issues
pnpm typecheck        # Run TypeScript compiler check
pnpm format:check     # Check formatting with Prettier
pnpm format:write     # Format code with Prettier

# Database
pnpm db:generate      # Generate Prisma client and run migrations
pnpm db:migrate       # Deploy migrations to database
pnpm db:push          # Push schema changes without migrations
pnpm db:studio        # Open Prisma Studio GUI

# Testing
pnpm exec playwright test                 # Run all Playwright tests
pnpm exec playwright test --project=chromium  # Run tests in Chromium only
pnpm exec playwright test tests/auth-authenticated.spec.ts  # Run specific test file
pnpm exec playwright test --ui            # Run tests in UI mode
pnpm exec playwright test --debug         # Run tests in debug mode
pnpm exec playwright show-report         # Show test report
pnpm exec playwright codegen             # Generate test code

# Documentation Sync
pnpm sync:docs        # Validate docs (pattern-based, fast)
pnpm sync:docs:fix    # Auto-fix version numbers and dates
pnpm ai-sync:docs     # AI-powered full sync (requires OPENROUTER_API_KEY)
```

## Documentation Sync System

This project has an intelligent documentation system that keeps docs synchronized with code:

**Pattern-Based Sync (Fast):**

- Validates version numbers in CLAUDE.md match package.json
- Updates date stamps in ROADMAP.md and CHANGELOG.md
- Runs on pre-commit hooks (non-blocking validation)
- Use: `pnpm sync:docs:fix` for quick updates

**AI-Powered Sync (Intelligent):**

- Analyzes git commits and code changes with Claude AI via OpenRouter
- Generates CHANGELOG entries from commits
- Moves completed ROADMAP items automatically
- **Updates documentation pages** based on code changes
- Adds Mermaid diagrams and code examples
- Works like the `docs-writer` agent
- Runs daily via GitHub Actions, creates PRs for review
- Use: `pnpm ai-sync:docs` (requires OPENROUTER_API_KEY)

**Setup AI Sync:**

```bash
export OPENROUTER_API_KEY="sk-or-your-key-here"
pnpm ai-sync:docs
```

**See:** `scripts/README.md` for complete documentation sync guide

## Architecture

**Comprehensive documentation available in:**

- **Fundamental Concepts:** `src/app/docs/architecture/concepts/page.md`
  - React Server Components vs Client Components
  - TanStack Query hydration & cache strategies
  - tRPC dual API pattern (server caller vs client hooks)
  - Complete data flow diagrams

- **Integration Patterns:** `src/app/docs/architecture/patterns/page.md`
  - Server prefetching for instant UI
  - Cache update patterns (invalidation, direct updates, optimistic)
  - Authentication architecture (no manual checks needed)
  - Custom tRPC procedures (admin, role-based)

### Quick Reference

**Authentication:**

- WorkOS middleware (src/middleware.ts) runs on all routes, allowing unauthenticated access only to `/` and `/docs`
- For tRPC API routes (`/api/trpc/*`), the route handler calls `withAuth()` and passes user through tRPC context
- tRPC `protectedProcedure` validates that `ctx.user` exists and provides type-safe access
- **No manual auth checks needed** - the route handler + protected procedures handle authentication
- NavBar includes try-catch for graceful auth handling on public routes
- See patterns/page.md "Authentication Architecture" section for complete flow details

**tRPC Dual API Pattern:**

- **Server Components:** Use `api` from `src/trpc/server.ts` - direct function calls, 10x faster
- **Client Components:** Use `api` from `src/trpc/react.tsx` - React hooks with TanStack Query
- **Data Flow:** Server prefetch → Dehydrate → Client hydrate → Background refetch
- See concepts/page.md "tRPC: Type-Safe API Layer" section for complete flow

**Adding New tRPC Routes:**

1. Create router in `src/server/api/routers/[name].ts`
2. Use `publicProcedure`, `protectedProcedure`, or create custom procedures (e.g., `adminProcedure`)
3. Add router to `appRouter` in `src/server/api/root.ts`
4. See patterns/page.md "tRPC Procedure Types & Custom Middleware" for examples

### Directory Structure

```
src/
├── app/                    # Next.js App Router pages
│   ├── api/               # API routes (WorkOS callbacks, tRPC)
│   ├── docs/              # MDX documentation with custom components
│   ├── workflow/          # React Flow workflow builder with custom nodes/edges
│   │   ├── components/   # Workflow UI components (nodes, edges, controls)
│   │   ├── store/        # Zustand state management for workflow
│   │   └── hooks/        # Workflow-specific hooks (layout, runner)
│   ├── design-strategy/  # Component showcase/design system demo
│   ├── render-strategy/  # tRPC data fetching patterns demo
│   └── _components/       # Page-specific components
├── components/            # Shared UI components
│   ├── ui/               # shadcn/ui components
│   └── navbar/           # Navigation components
├── hooks/                 # Shared custom hooks
├── providers/            # React context providers (Theme, Transition)
├── server/               # Server-only code
│   ├── api/             # tRPC routers and procedures
│   └── db.ts            # Prisma client singleton
├── trpc/                 # tRPC client setup
├── styles/               # Global CSS
├── lib/                  # Utility functions
├── env.js                # Environment variable validation with Zod
└── middleware.ts         # WorkOS authentication middleware
```

### MDX Documentation System

The docs system (src/app/docs/) supports:

- Custom MDX components defined in mdx-components.tsx
- Client-side syntax highlighting via CodeBlock component
- Mermaid diagram rendering via MermaidDiagram component
- shadcn/ui components (Button, Card, Alert, Badge) directly in MDX

## Environment Variables

Required environment variables (see .env.example):

- `DATABASE_URL` - PostgreSQL connection string
- `DIRECT_URL` - Direct database URL (for Prisma migrations)
- WorkOS credentials (check .env for actual keys)

Environment variables are validated using @t3-oss/env-nextjs in src/env.js. When adding new variables:

1. Add validation schema in src/env.js
2. Add to runtimeEnv object
3. Update .env.example

## Code Quality

Pre-commit hooks (via Husky and lint-staged):

- Auto-format with Prettier
- Auto-fix ESLint issues
- Run on staged files only

Import sorting: Uses @trivago/prettier-plugin-sort-imports with inline type imports enforced by ESLint rule `@typescript-eslint/consistent-type-imports`.

## Database

- PostgreSQL database configured in prisma/schema.prisma
- Use `pnpm db:generate` after schema changes to update client
- The db client is a singleton exported from src/server/db.ts
- In development, Prisma logs all queries, errors, and warnings

## Working with Components

UI components are from shadcn/ui and located in src/components/ui/. They use:

- Radix UI primitives
- Tailwind CSS with class-variance-authority
- cn() utility from src/lib/utils.ts for class merging

When adding new shadcn components, use the CLI (configured in components.json) rather than manual copying.

## State Management

The project uses multiple state management approaches:

- **Zustand:** Local state management (see src/app/workflow/store/)
  - Context-based store pattern with Provider component
  - Used for workflow builder state management
  - Example: `useAppStore` hook in workflow feature
- **TanStack Query:** Server state (via tRPC hooks)
  - Handles data fetching, caching, and synchronization
  - Automatic cache invalidation and refetching
- **React Context:** Theme, transitions, and feature-specific state

## Testing

The project uses Playwright for end-to-end testing:

- **Test Directory:** `tests/`
- **Configuration:** `playwright.config.ts`
- **Test Setup:** Global setup in `tests/global-setup.ts` handles authentication
- **Fixtures:** Custom fixtures in `tests/fixtures/auth.fixture.ts` provide authenticated browser contexts
- **CI Integration:** GitHub Actions workflow in `.github/workflows/playwright.yml`

**Writing Tests:**

1. Use the `authenticatedPage` fixture for tests requiring auth
2. Tests run against `http://localhost:3000` (dev server auto-starts)
3. Test environment variables configured in `.env` (see TEST*USER*\* vars)
4. See `tests/auth-authenticated.spec.ts` for examples

## React Flow Workflow Builder

The `/workflow` route features a visual workflow builder powered by React Flow:

- **Custom Nodes:** Initial, Transform, Branch, Join, Output nodes (src/app/workflow/components/nodes/)
- **Custom Edges:** Workflow edges with interactive buttons (src/app/workflow/components/edges/)
- **Auto Layout:** ELK.js-based automatic graph layout (src/app/workflow/hooks/use-layout.tsx)
- **State Management:** Zustand store with Context pattern (src/app/workflow/store/)
- **Features:** Context menus, drag-and-drop, node execution visualization

When working with workflow components, note that the store must be accessed via `useAppStore` hook within `AppStoreProvider`.
