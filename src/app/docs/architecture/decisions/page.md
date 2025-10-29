# Architectural Decisions

This document captures the key architectural decisions made for this project, including the reasoning, alternatives considered, and trade-offs.

---

## Decision: tRPC for API Layer
**Chosen Approach:** tRPC with end-to-end type safety (no REST/GraphQL)

**Why:**
- Full TypeScript type inference from server to client
- No code generation required
- Automatic input validation with Zod
- Seamless integration with Next.js App Router
- Built-in error handling and serialization (SuperJSON)

**Alternatives Considered:**
- REST API: More verbose, no type safety
- GraphQL: Overkill for internal APIs, requires code generation
- Next.js API Routes: No type safety between frontend/backend

**Trade-offs:**
- ✅ Pros: Developer experience, type safety, less boilerplate
- ❌ Cons: Not suitable for public APIs, tRPC-specific knowledge required

---

## Decision: Server Components First
**Chosen Approach:** Server Components by default, Client Components only when needed

**Why:**
- Smaller JavaScript bundles
- Better performance (render on server)
- Direct database access without API roundtrip
- Automatic code splitting

**When to Use Client Components:**
- User interactivity (onClick, onChange)
- React hooks (useState, useEffect)
- Browser APIs (localStorage, geolocation)
- TanStack Query for data fetching

**Example:**
- `NavBar.server.tsx` - Server Component (WorkOS session check)
- `ThemeSwitch.client.tsx` - Client Component (useState, onClick)

**Trade-offs:**
- ✅ Pros: Performance, SEO, reduced bundle size
- ❌ Cons: Learning curve, limitations (no hooks in Server Components)

---

## Decision: Dual Data Fetching Strategy
**Chosen Approach:** Server Components use tRPC server caller, Client Components use tRPC React hooks

**Pattern 1 - Server Components:**
```typescript
// src/app/page.tsx
import { api } from "@/trpc/server";

export default async function Page() {
  const data = await api.post.getLatest();  // Direct call
  return <div>{data.name}</div>;
}
```

**Pattern 2 - Client Components:**
```typescript
// src/app/_components/post.tsx
"use client";
import { api } from "@/trpc/react";

export function Post() {
  const { data } = api.post.getLatest.useQuery();  // HTTP request
  return <div>{data?.name}</div>;
}
```

**Why:**
- Server Components: Zero client JS, direct DB access, faster initial load
- Client Components: Real-time updates, mutations, loading states
- Best of both worlds

**Trade-offs:**
- ✅ Pros: Optimal performance, flexible data fetching
- ❌ Cons: Two different patterns to learn

---

## Decision: Middleware + tRPC Auth
**Chosen Approach:** WorkOS middleware for route protection + tRPC middleware for procedure-level auth

**Implementation:**
```typescript
// middleware.ts - Route-level
export default authkitMiddleware({
  middlewareAuth: {
    enabled: true,
    unauthenticatedPaths: ["/"],  // Public home
  },
});

// src/server/api/trpc.ts - Procedure-level
const enforceUserIsAuthed = t.middleware(async ({ next }) => {
  const { user } = await withAuth();
  if (!user) throw new TRPCError({ code: "UNAUTHORIZED" });
  return next({ ctx: { user } });  // Type-safe user in ctx
});

export const protectedProcedure = t.procedure
  .use(timingMiddleware)
  .use(enforceUserIsAuthed);
```

**Why:**
- Middleware: Blanket protection for pages (catch unauthorized access early)
- tRPC: Fine-grained control at API level (some procedures public, some protected)
- tRPC routes excluded from middleware to allow public procedures

**Trade-offs:**
- ✅ Pros: Defense in depth, flexible protection, type-safe user context
- ❌ Cons: Duplicate auth logic (middleware + tRPC)

---

## Decision: Prisma with PostgreSQL
**Chosen Approach:** Prisma ORM with PostgreSQL database

**Current Schema:**
```prisma
model Post {
  id        Int      @id @default(autoincrement())
  name      String
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  @@index([name])
}
```

**Why:**
- Type-safe database queries
- Automatic migrations
- Excellent TypeScript integration
- Built-in connection pooling
- Works seamlessly with tRPC

**Best Practices in Use:**
- Singleton pattern for Prisma client (prevents connection issues)
- Query logging in development
- Indexes on frequently queried fields

---

## Decision: Feature-Based Router Organization
**Chosen Approach:** One tRPC router per resource/feature

**Current Structure:**
```
src/server/api/
├── routers/
│   └── post.ts          # postRouter: hello, create, getLatest
├── root.ts              # Combines all routers
└── trpc.ts              # Config + middleware
```

**Pattern:**
```typescript
// Individual router
export const postRouter = createTRPCRouter({
  getById: publicProcedure.input(z.object({...})).query(...),
  create: protectedProcedure.input(z.object({...})).mutation(...),
  update: protectedProcedure.input(z.object({...})).mutation(...),
});

// Root router combines all
export const appRouter = createTRPCRouter({
  post: postRouter,
  user: userRouter,  // Future
  org: orgRouter,    // Future
});
```

**Why:**
- Clear separation of concerns
- Easy to navigate codebase
- Scales well as features grow
- Logical grouping of related procedures

**When to Create New Router:**
- New resource/entity (users, organizations, projects)
- Distinct feature area (billing, notifications, admin)
- Router grows beyond 10-15 procedures (consider splitting)

---

## Decision: CSS Variables + Tailwind v4
**Chosen Approach:** Design system built with CSS variables (OKLCH) + Tailwind utility classes

**Implementation:**
```css
/* globals.css */
:root {
  --background: oklch(100% 0 0);
  --foreground: oklch(11.11% 0.01 286.45);
  --primary: oklch(47.57% 0.166 262.12);
  /* ... */
}

.dark {
  --background: oklch(15.75% 0.012 285.88);
  --foreground: oklch(92.59% 0.004 286.32);
  /* ... */
}
```

**Why:**
- Single source of truth for colors
- Automatic dark mode (CSS class toggle)
- OKLCH color space (perceptually uniform)
- Shadcn UI integration
- Easy to customize themes

**Usage:**
```tsx
<div className="bg-background text-foreground border-border">
  <button className="bg-primary text-primary-foreground">Click</button>
</div>
```

---

## Decision: Component Composition (Shadcn UI)
**Chosen Approach:** Shadcn UI components (copy/paste, not npm package)

**Why:**
- Full control over component code
- Can customize without ejecting
- Built on Radix UI (accessible)
- Tailwind styling (consistent with app)
- 50+ components ready to use

**Components Available:**
Accordion, Alert, Avatar, Badge, Button, Calendar, Card, Checkbox, Collapsible, Combobox, Command, Context Menu, Data Table, Date Picker, Dialog, Drawer, Dropdown Menu, Form, Hover Card, Input, Label, Menubar, Navigation Menu, Pagination, Popover, Progress, Radio Group, Resizable, Scroll Area, Select, Separator, Sheet, Skeleton, Slider, Sonner, Switch, Table, Tabs, Textarea, Toast, Toggle, Tooltip

**Located:** `src/components/ui/`

---

**Living Document:** These decisions will evolve as the project grows. Update when architectural choices change or new patterns emerge.
