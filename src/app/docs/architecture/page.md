# Architecture Overview

This section provides comprehensive documentation of the application's architecture, including technical decisions, patterns, and best practices.

## Documentation Structure

- **[Overview](#tech-stack)** - Tech stack, request flows, and folder structure (this page)
- **[Decisions](/docs/architecture/decisions)** - Architectural decisions with rationale and trade-offs
- **[Patterns](/docs/architecture/patterns)** - Common integration patterns with code examples
- **[Workflow](/docs/architecture/workflow)** - Development workflow and best practices
- **[Performance](/docs/architecture/performance)** - Optimizations and environment setup

---

## Tech Stack

**Core Framework:**
- Next.js 15.2.3 (App Router, React 19)
- TypeScript 5.8.2
- Node.js with pnpm

**Data & API Layer:**
- PostgreSQL database
- Prisma 6.5.0 (ORM)
- tRPC 11.0.0 (type-safe APIs)
- TanStack Query 5.69.0 (client state)
- Zod 3.24.2 (validation)
- SuperJSON 2.2.1 (serialization)

**Authentication:**
- WorkOS AuthKit 2.10.0

**UI & Styling:**
- Tailwind CSS 4.0.15
- Shadcn UI (50+ components)
- Radix UI primitives
- Lucide React (icons)
- next-themes (dark mode)

**Animations:**
- GSAP 3.13.0
- next-transition-router

**Additional:**
- MDX 3.1.1 (documentation)
- react-hook-form + Zod (forms)
- date-fns, recharts, sonner

---

## High-Level Architecture

### Request Flow

**Server Component Flow:**
```
User Request
  ↓
Next.js App Router
  ↓
Server Component (async)
  ↓
tRPC Server Caller (direct, no HTTP)
  ↓
tRPC Router + Middleware
  ↓
Prisma Query
  ↓
PostgreSQL
  ↓
Response rendered server-side
```

**Client Component Flow:**
```
User Interaction
  ↓
Client Component
  ↓
TanStack Query + tRPC React
  ↓
HTTP Request to /api/trpc
  ↓
tRPC Router + Middleware
  ↓
Prisma Query
  ↓
PostgreSQL
  ↓
JSON Response (SuperJSON serialized)
  ↓
Client cache updated
```

**Authentication Flow:**
```
Request
  ↓
Next.js Middleware (WorkOS authkitMiddleware)
  ├─ Public routes (/, /api/trpc/*) → Allow
  └─ Protected routes → Check session
       ├─ No session → Redirect to login
       └─ Has session → Continue
  ↓
Route Handler / Component
  ↓
(Optional) tRPC protectedProcedure
  ├─ withAuth() → Get user
  └─ No user → UNAUTHORIZED error
```

---

## Folder Structure

```
src/
├── app/                    # Next.js App Router
│   ├── api/
│   │   ├── callback/       # WorkOS auth callback
│   │   ├── login/          # Login redirect
│   │   └── trpc/[trpc]/    # tRPC HTTP endpoint
│   ├── docs/               # Documentation site (MDX)
│   ├── shadcn/             # Component showcase
│   ├── _components/        # Page-specific components
│   ├── layout.tsx          # Root layout (providers)
│   └── page.tsx            # Home page (Server Component)
│
├── components/             # Shared components
│   ├── navbar/
│   │   ├── NavBar.server.tsx    # Server Component
│   │   └── ThemeSwitch.client.tsx # Client Component
│   └── ui/                 # Shadcn UI components (50+)
│
├── server/                 # Backend code (server-only)
│   ├── api/
│   │   ├── routers/        # tRPC routers (feature-based)
│   │   │   └── post.ts     # Example: Post router
│   │   ├── root.ts         # Root router (combines all)
│   │   └── trpc.ts         # tRPC config + middleware
│   └── db.ts               # Prisma client singleton
│
├── trpc/                   # tRPC client setup
│   ├── react.tsx           # Client-side provider
│   ├── server.ts           # Server-side caller (RSC)
│   └── query-client.ts     # TanStack Query config
│
├── providers/              # React context providers
│   ├── ThemeProvider.tsx   # Dark mode
│   └── TransitionProvider.tsx # GSAP transitions
│
├── hooks/                  # Custom React hooks
│   └── use-mobile.ts
│
├── lib/                    # Utilities
│   └── utils.ts            # cn() helper
│
├── styles/
│   └── globals.css         # Tailwind + CSS variables
│
├── env.js                  # Environment validation
└── middleware.ts           # WorkOS authentication
```

---

## Quick Links

For detailed information, see:
- **[Architectural Decisions](/docs/architecture/decisions)** - Why we chose tRPC, Server Components, Prisma, and more
- **[Integration Patterns](/docs/architecture/patterns)** - Common code patterns with examples
- **[Development Workflow](/docs/architecture/workflow)** - How to add features and follow best practices
- **[Performance & Environment](/docs/architecture/performance)** - Optimizations and env setup

---

**Living Document:** This architecture documentation will evolve as the codebase grows.
