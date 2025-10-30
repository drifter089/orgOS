# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is a T3 Stack application built with Next.js 15, tRPC, Prisma, and WorkOS AuthKit for authentication. The project uses pnpm as the package manager and includes a comprehensive documentation system with MDX support.

## Core Technologies

- **Next.js 15** - React framework with App Router
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
```

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

- WorkOS middleware (src/middleware.ts) protects routes except `/` and `/api/trpc/*`
- tRPC `protectedProcedure` automatically validates auth and provides type-safe `ctx.user`
- **No manual auth checks needed** on protected routes - middleware + protected procedures handle it
- See patterns/page.md "Authentication Architecture" section for details

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
│   └── _components/       # Page-specific components
├── components/            # Shared UI components
│   ├── ui/               # shadcn/ui components
│   └── navbar/           # Navigation components
├── providers/            # React context providers (Theme, Transition)
├── server/               # Server-only code
│   ├── api/             # tRPC routers and procedures
│   └── db.ts            # Prisma client singleton
├── trpc/                 # tRPC client setup
├── styles/               # Global CSS
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
