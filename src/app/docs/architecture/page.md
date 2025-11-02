# Architecture Overview

Quick reference guide to understand the tech stack and codebase organization.

## Documentation Structure

- **Overview** (this page) - Tech stack and folder structure to understand the codebase
- **[Concepts](/docs/architecture/concepts)** - Architectural theory and principles
- **[Patterns](/docs/architecture/patterns)** - Real code examples showing do's and don'ts

---

## Tech Stack

Our application is built on a modern, type-safe stack optimized for developer experience and performance.

### Core Framework

- **Next.js 15.2.3** - React framework with App Router
- **React 19.0.0** - UI library
- **TypeScript 5.8.2** - Type-safe JavaScript
- **pnpm 10.17.1** - Fast, disk space efficient package manager

### Data & API Layer

- **PostgreSQL** - Primary database
- **Prisma 6.5.0** - Type-safe ORM with migration support
- **tRPC 11.0.0** - End-to-end type-safe APIs
- **TanStack Query 5.69.0** - Powerful data synchronization
- **Zod 3.24.2** - Schema validation
- **SuperJSON 2.2.1** - Transparent serialization

### Authentication

- **WorkOS AuthKit 2.10.0** - Enterprise-ready authentication

### UI & Styling

- **Tailwind CSS 4.0.15** - Utility-first CSS framework
- **shadcn/ui** - High-quality React components
- **Radix UI** - Unstyled, accessible component primitives
- **Lucide React** - Beautiful & consistent icons
- **next-themes 0.4.6** - Dark mode support

### Developer Experience

- **ESLint** - Code linting with Next.js config
- **Prettier** - Code formatting with import sorting
- **Husky & lint-staged** - Git hooks for code quality
- **Playwright** - E2E testing framework

### Additional Libraries

- **MDX 3.1.1** - Markdown for documentation with JSX
- **GSAP 3.13.0** - Professional-grade animations
- **react-hook-form 7.65.0** - Performant forms with Zod validation
- **Mermaid 11.12.1** - Diagram and flowchart generation
- **react-syntax-highlighter 16.1.0** - Code syntax highlighting

---

## Project Structure

```text
src/
├── app/                    # Next.js App Router pages
│   ├── api/               # API routes (WorkOS callbacks, tRPC)
│   ├── docs/              # MDX documentation
│   ├── shadcn/            # Component showcase
│   └── _components/       # Page-specific components
├── components/            # Shared UI components
│   ├── ui/               # shadcn/ui components
│   └── navbar/           # Navigation components
├── server/               # Backend logic (server-only)
│   ├── api/
│   │   ├── routers/     # tRPC routers by feature
│   │   ├── root.ts      # Root router
│   │   └── trpc.ts      # tRPC setup
│   └── db.ts            # Prisma client
├── trpc/                 # tRPC client configuration
│   ├── react.tsx        # React Query integration
│   └── server.ts        # Server-side caller
├── providers/            # React context providers
├── hooks/               # Custom React hooks
├── lib/                 # Utility functions
├── styles/              # Global CSS
├── env.js               # Environment validation
└── middleware.ts        # Auth middleware
```

### Directory Breakdown

#### `/app` - Routes and Pages

All application routes using Next.js App Router:

- **`/api`** - API routes for WorkOS callbacks and tRPC endpoint
- **`/docs`** - MDX documentation site
- **`/_components`** - Page-specific components (not reused elsewhere)
- **`layout.tsx`** - Root layout that wraps all pages with providers
- **`page.tsx`** - Homepage (Server Component by default)

#### `/server` - Backend Code

Server-only code for business logic and data:

- **`/api/routers/`** - tRPC routers organized by feature (e.g., `post.ts`, `user.ts`)
- **`/api/root.ts`** - Combines all routers into the main app router
- **`/api/trpc.ts`** - tRPC configuration, context, and middleware
- **`db.ts`** - Prisma client singleton

#### `/trpc` - Client Configuration

tRPC client setup for React components:

- **`react.tsx`** - React Query integration for client components
- **`server.ts`** - Server-side caller for React Server Components
- **`query-client.ts`** - TanStack Query configuration

#### `/components` - Shared UI

Reusable components across the app:

- **`/ui/`** - shadcn/ui components (50+ components)
- **`/navbar/`** - Navigation with `.server.tsx` and `.client.tsx` variants
- Root level for custom shared components

#### `/providers` - Context Providers

Global React contexts:

- **`ThemeProvider.tsx`** - Dark/light mode management
- **`TransitionProvider.tsx`** - Page transition animations

#### `/hooks` - Custom Hooks

Reusable React hooks for common functionality

---

## Naming Conventions

### File Naming

**Components:**

- UI Components: `kebab-case.tsx` (e.g., `button.tsx`, `dialog.tsx`)
- Server Components: `ComponentName.server.tsx`
- Client Components: `ComponentName.client.tsx`

**API & Utilities:**

- tRPC Routers: `camelCase.ts` matching the resource (e.g., `post.ts`, `user.ts`)
- Hooks: `use-hook-name.ts` (e.g., `use-mobile.ts`)
- Utilities: `kebab-case.ts`

### Import Conventions

- Use `~` alias for src directory imports (e.g., `~/lib/utils`)
- Group imports: React → Third-party → Local → Types
- Prefer named exports for components
