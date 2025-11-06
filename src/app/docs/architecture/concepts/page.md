# Fundamental Concepts

Core mental models for building hybrid server/client applications with Next.js, tRPC, and TanStack Query.

---

## Overview

This section covers the fundamental architectural concepts that power our T3 Stack application. Understanding these concepts is essential for building scalable, performant, and type-safe applications.

## Core Concepts

### [1. React & Next.js: Server vs Client Components](/docs/architecture/concepts/server-and-client-components)

Learn how to ship less JavaScript to the browser while maintaining rich interactivity. Understand Server Components, Client Components, hydration, and the three composition patterns that enable optimal performance.

**Key Topics:**

- Component tree patterns and composition rules
- Rendering & hydration flow
- RSC (React Server Components) explained
- When to use Server vs Client Components
- Navigation and data flow

**[Read More →](/docs/architecture/concepts/server-and-client-components)**

---

### [2. TanStack Query: Client-Side Cache & Server Hydration](/docs/architecture/concepts/tanstack-query)

Master asynchronous state management in Client Components with automatic caching, synchronization, and seamless server-to-client data flow. Learn how to eliminate loading states and enable instant UX through server prefetching.

**Key Topics:**

- Server prefetch → Client hydration pattern
- useQuery vs useSuspenseQuery
- Mutation strategies and lifecycles
- Cache update patterns (invalidation, direct updates, optimistic)
- Complete data flow from server to client

**[Read More →](/docs/architecture/concepts/tanstack-query)**

---

### [3. tRPC: Type-Safe API Layer](/docs/architecture/concepts/trpc-api-layer)

Build end-to-end type-safe APIs without code generation or REST conventions. Understand how tRPC creates a seamless bridge between frontend and backend with compile-time type guarantees.

**Key Topics:**

- Core terminology (routers, procedures, context)
- API route organization patterns
- Dual API pattern (server caller vs client hooks)
- Integration with TanStack Query
- Cache invalidation best practices
- Common anti-patterns to avoid

**[Read More →](/docs/architecture/concepts/trpc-api-layer)**

---

## Learning Path

We recommend reading these concepts in order:

1. **Start with Server & Client Components** to understand the foundation of Next.js App Router
2. **Move to TanStack Query** to learn client-side state management and caching
3. **Finish with tRPC** to tie everything together with type-safe APIs

Each concept builds on the previous one, creating a complete picture of how data flows through the application.

---

## Best Practices Summary

After understanding these concepts, remember these key principles:

1. **Default to Server Components** → Only use `'use client'` when needed
2. **Server for data fetching** → Use tRPC server caller for initial loads
3. **Client for interactivity** → Use tRPC React hooks + TanStack Query
4. **Prefetch on server** → Eliminate loading states with server prefetching
5. **Invalidate after mutations** → Keep cache synchronized with proper invalidation

### Server Components for Dynamic Data

You CAN use Server Components throughout your app for displaying data, but for data that changes with mutations, Client Components reading from TanStack Query cache is actually the better pattern (which is why T3 Stack uses it).

**Alternative approaches to update Server Components after mutations:**

- `router.refresh()` - Re-runs all Server Components on the current route
- `revalidatePath()` - Re-validates specific paths (used in Server Actions)

**Why T3 Stack prefers the Client Component pattern:**

The Server prefetch → Client Component reads cache → mutations update cache pattern provides better UX with:

- Instant UI updates without full page re-renders
- Optimistic updates for immediate feedback
- Granular cache invalidation control
- Seamless integration with TanStack Query's synchronization

**When to use each approach:**

- **Server Components alone:** Static content, rarely-changing data, or simple pages without user mutations
- **Server prefetch + Client Components (T3 pattern):** Interactive features with frequent mutations, forms, dashboards, or any UI requiring instant feedback

---

## Additional Resources

- [Next.js App Router](https://nextjs.org/docs/app)
- [React Server Components RFC](https://github.com/reactjs/rfcs/blob/main/text/0188-server-components.md)
- [tRPC Documentation](https://trpc.io/docs)
- [TanStack Query Guides](https://tanstack.com/query/latest/docs/framework/react/guides)
- [Prisma Documentation](https://www.prisma.io/docs)
