# Key Integration Patterns

This document showcases common patterns for integrating Next.js, tRPC, Prisma, and WorkOS together.

Patterns are organized to mirror the conceptual flow: Server/Client Architecture → Data Fetching & Hydration → Mutations & Cache Updates → Advanced Patterns.

---

## Server Prefetching for Instant UI

```typescript
// src/app/dashboard/page.tsx (Server Component)
import { api, HydrateClient } from "@/trpc/server";

export default async function DashboardPage() {
  // Prefetch critical data on the server
  await api.user.getProfile.prefetch();
  await api.posts.getLatest.prefetch();

  return (
    <HydrateClient>
      {/* Client components read from hydrated cache - no loading spinner! */}
      <UserProfile />
      <LatestPosts />
    </HydrateClient>
  );
}
```

```typescript
// src/components/UserProfile.tsx (Client Component)
"use client";
import { api } from "@/trpc/react";

export function UserProfile() {
  // Data available instantly from hydrated cache
  const { data } = api.user.getProfile.useQuery();

  // No isLoading check needed - data is pre-populated
  return <div>Welcome, {data.name}</div>;
}
```

**Benefits:**

- Zero loading spinners on initial page load
- Data embedded in HTML (instant First Paint)
- Background refetch ensures freshness
- Improved perceived performance

---

## useSuspenseQuery for Declarative Loading

```typescript
"use client";
import { Suspense } from "react";
import { api } from "@/trpc/react";

function PostList() {
  // No isLoading check needed - Suspense handles it
  const { data } = api.posts.list.useSuspenseQuery();

  return (
    <ul>
      {data.map(post => (
        <li key={post.id}>{post.title}</li>
      ))}
    </ul>
  );
}

export function PostsSection() {
  return (
    <Suspense fallback={<div>Loading posts...</div>}>
      <PostList />
    </Suspense>
  );
}
```

**When to use useSuspenseQuery over useQuery:**

- You have React Suspense boundaries
- Want centralized loading UI
- Prefer TypeScript guarantee that data is defined
- Don't need conditional data fetching

**When to use useQuery:**

- Need fine-grained loading state control
- Showing partial UI while loading
- Conditional data fetching based on props/state

---

## Query Invalidation (Recommended Default)

```typescript
"use client";
import { api } from "@/trpc/react";

export function CreatePostForm() {
  const utils = api.useUtils();

  const createPost = api.posts.create.useMutation({
    onSuccess: async () => {
      // Invalidate all post-related queries
      await utils.posts.invalidate();

      // Or be more specific:
      // await utils.posts.list.invalidate();
      // await utils.posts.getLatest.invalidate();
    },
  });

  return (
    <form onSubmit={(e) => {
      e.preventDefault();
      const formData = new FormData(e.currentTarget);
      createPost.mutate({
        title: formData.get("title") as string,
      });
    }}>
      <input name="title" required />
      <button disabled={createPost.isPending}>
        Create Post
      </button>
    </form>
  );
}
```

**Invalidation Strategies:**

```typescript
// Invalidate all queries with 'posts' prefix
utils.posts.invalidate(); // ['posts'], ['posts', { id: 1 }], etc.

// Invalidate specific query only
utils.posts.getById.invalidate({ id: "123" });

// Invalidate with predicate (advanced)
await queryClient.invalidateQueries({
  predicate: (query) =>
    query.queryKey[0] === "posts" && query.queryKey[1]?.status === "draft",
});
```

**Benefits:**

- Safest approach (guarantees consistency)
- Automatic refetch of affected queries
- Works for complex relationships
- Minimal code required

---

## Direct Cache Updates (Efficient Alternative)

```typescript
"use client";
import { api } from "@/trpc/react";

export function TodoList() {
  const utils = api.useUtils();
  const { data: todos } = api.todos.list.useQuery();

  const toggleTodo = api.todos.toggle.useMutation({
    onSuccess: (updatedTodo) => {
      // Update cache directly without refetch
      utils.todos.list.setData(undefined, (old) =>
        old?.map(todo =>
          todo.id === updatedTodo.id ? updatedTodo : todo
        )
      );
    },
  });

  return (
    <ul>
      {todos?.map(todo => (
        <li key={todo.id}>
          <input
            type="checkbox"
            checked={todo.completed}
            onChange={() => toggleTodo.mutate({ id: todo.id })}
          />
          {todo.title}
        </li>
      ))}
    </ul>
  );
}
```

**When to use Direct Cache Updates:**

- Mutation response contains complete updated data
- Want to avoid refetch network request
- Update is predictable and deterministic
- Single query affected (no complex relationships)

**When to prefer Invalidation:**

- Update affects multiple related queries
- Server calculates derived values
- Unsure if response contains all needed data

---

## Optimistic Updates for Instant Feedback

```typescript
"use client";
import { api } from "@/trpc/react";

export function LikeButton({ postId }: { postId: string }) {
  const utils = api.useUtils();

  const likeMutation = api.posts.like.useMutation({
    // Update UI immediately before server responds
    onMutate: async ({ postId }) => {
      // Cancel ongoing refetches
      await utils.posts.getById.cancel({ id: postId });

      // Snapshot current value for rollback
      const previousPost = utils.posts.getById.getData({ id: postId });

      // Optimistically update cache
      utils.posts.getById.setData({ id: postId }, (old) => ({
        ...old!,
        likes: old!.likes + 1,
        isLiked: true,
      }));

      return { previousPost };
    },

    // Rollback on error
    onError: (err, variables, context) => {
      if (context?.previousPost) {
        utils.posts.getById.setData(
          { id: variables.postId },
          context.previousPost
        );
      }
    },

    // Refetch to ensure accuracy
    onSettled: (data, error, variables) => {
      void utils.posts.getById.invalidate({ id: variables.postId });
    },
  });

  return (
    <button onClick={() => likeMutation.mutate({ postId })}>
      Like
    </button>
  );
}
```

**Benefits:**

- Instant UI response (no waiting for server)
- Automatic rollback on failure
- Eventual consistency with server
- Best UX for frequent interactions (likes, toggles, votes)

---

## Event Handler Prefetching

```typescript
"use client";
import { api } from "@/trpc/react";

export function PostCard({ postId }: { postId: string }) {
  const utils = api.useUtils();

  const prefetchDetails = () => {
    // Prefetch on hover/focus for instant navigation
    void utils.posts.getById.prefetch(
      { id: postId },
      { staleTime: 60_000 }  // Cache for 1 minute
    );
  };

  return (
    <Link
      href={`/posts/${postId}`}
      onMouseEnter={prefetchDetails}
      onFocus={prefetchDetails}
    >
      View Post Details
    </Link>
  );
}
```

**Benefits:**

- Zero perceived loading time on navigation
- Triggered by user intent (hover/focus)
- Respects staleTime configuration
- Improves perceived performance

---

## Authentication Architecture (No Manual Checks Needed)

**Key Principle:** With WorkOS middleware + tRPC protected procedures, you **rarely need to manually check auth**. The architecture handles it automatically.

**Why No Manual Auth Checks?**

1. **WorkOS Middleware** protects routes before any component runs
2. **tRPC Protected Procedures** automatically validate auth for data fetching
3. **Client Components** inherit auth context from protected routes
4. Manual checks create redundancy and potential security gaps

---

### Protected Page (No Auth Checks)

```typescript
// src/app/dashboard/page.tsx (Server Component)
// Route is protected by WorkOS middleware - user is ALWAYS authenticated here
import { api, HydrateClient } from "@/trpc/server";

export default async function DashboardPage() {
  // No withAuth() check needed - middleware already validated user
  // Protected procedure will succeed because route is protected
  await api.user.getProfile.prefetch();
  await api.posts.getLatest.prefetch();

  return (
    <HydrateClient>
      <UserProfile />    {/* Client Component - already authenticated */}
      <LatestPosts />
    </HydrateClient>
  );
}
```

```typescript
// src/components/UserProfile.tsx (Client Component)
"use client";
import { api } from "@/trpc/react";

export function UserProfile() {
  // No auth check needed on client - route is protected by middleware
  // Data already prefetched on server
  const { data } = api.user.getProfile.useQuery();

  return <div>Welcome, {data.name}</div>;
}
```

**Why this works:**

- Middleware validates auth → Server Component runs → Protected procedures succeed
- Client Components inherit authenticated context
- tRPC provides type-safe access to `ctx.user` in protected procedures

---

### Public Pages with Conditional UI

**ONLY use manual auth checks on public routes** (like landing pages in `unauthenticatedPaths`) where you want to show different UI.

```typescript
// src/app/page.tsx (Public landing page)
import { withAuth } from "@workos-inc/authkit-nextjs";
import Link from "next/link";

export default async function HomePage() {
  // This route is PUBLIC - manually check to show conditional UI
  const { user } = await withAuth();

  return (
    <nav>
      {user ? (
        <Link href="/dashboard">Go to Dashboard</Link>
      ) : (
        <Link href="/login">Sign In</Link>
      )}
    </nav>
  );
}
```

**Use ONLY for:**

- Public landing pages showing different CTAs
- Navigation bars on public routes
- Marketing pages with personalization

**Never for:**

- Protected pages (middleware handles it)
- Data fetching (protected procedures handle it)
- Client Components (NEVER check auth on client for security)

---

**Security Best Practices:**

✅ **DO:**

- Let middleware protect routes
- Use `protectedProcedure` for all sensitive data
- Trust the auth context in protected routes

❌ **DON'T:**

- Check auth on client (security risk - client state can be manipulated)
- Redundantly check `withAuth()` on protected pages
- Mix manual checks with protected procedures (creates confusion)

---

## tRPC Procedure Types & Custom Middleware

### Understanding tRPC Procedures

Procedures are the building blocks of your tRPC API - they're type-safe functions that can be called from the client. Each procedure consists of:

- **Base procedure** - The foundation created from your tRPC instance
- **Middleware** - Functions that run before your resolver (auth, logging, validation)
- **Input validation** - Optional Zod schema to validate incoming data
- **Resolver** - Your actual business logic (query/mutation)

### Built-in Procedure Types

Our app provides two base procedures out of the box:

```typescript
// 1. Public Procedure - No authentication required
export const publicProcedure = t.procedure.use(timingMiddleware);

// 2. Protected Procedure - Requires authentication
export const protectedProcedure = t.procedure
  .use(timingMiddleware)
  .use(enforceUserIsAuthed); // Ensures ctx.user exists
```

**When to use each:**

```typescript
// Use publicProcedure for open endpoints
export const publicRouter = createTRPCRouter({
  getPublicPosts: publicProcedure.query(async ({ ctx }) => {
    // ctx.user might be undefined
    return ctx.db.post.findMany({ where: { published: true } });
  }),
});

// Use protectedProcedure when auth is required
export const userRouter = createTRPCRouter({
  getProfile: protectedProcedure.query(async ({ ctx }) => {
    // ctx.user is guaranteed to exist (type-safe!)
    return ctx.db.user.findUnique({
      where: { id: ctx.user.id }, // No null checks needed
    });
  }),
});
```

### Creating Custom Procedures

You can create specialized procedures by adding custom middleware. Here's a complete example of an admin procedure:

```typescript
// src/server/api/trpc.ts - Add after protectedProcedure

/**
 * Admin-only procedure
 *
 * Ensures the user is authenticated AND has admin role.
 * Extends protectedProcedure to inherit auth checks.
 */
const enforceUserIsAdmin = t.middleware(async ({ ctx, next }) => {
  // This runs AFTER enforceUserIsAuthed, so ctx.user exists

  // Check admin role (adjust based on your user model)
  const isAdmin = await ctx.db.user.findFirst({
    where: {
      id: ctx.user.id,
      role: "ADMIN", // Assumes you have a role field
    },
  });

  if (!isAdmin) {
    throw new TRPCError({
      code: "FORBIDDEN",
      message: "Admin access required",
    });
  }

  return next({
    ctx: {
      // Pass through the context with admin user
      user: isAdmin,
    },
  });
});

export const adminProcedure = protectedProcedure.use(enforceUserIsAdmin);
```

### Advanced: Role-Based Procedures

For more flexible authorization, create a factory function for role-based procedures:

```typescript
// src/server/api/trpc.ts

/**
 * Creates a procedure that requires specific roles
 */
const createRoleProcedure = (allowedRoles: string[]) => {
  return protectedProcedure.use(async ({ ctx, next }) => {
    const userWithRole = await ctx.db.user.findFirst({
      where: {
        id: ctx.user.id,
        role: { in: allowedRoles },
      },
    });

    if (!userWithRole) {
      throw new TRPCError({
        code: "FORBIDDEN",
        message: `Required role: ${allowedRoles.join(" or ")}`,
      });
    }

    return next({ ctx: { user: userWithRole } });
  });
};

// Create specific role procedures
export const adminProcedure = createRoleProcedure(["ADMIN"]);
export const moderatorProcedure = createRoleProcedure(["ADMIN", "MODERATOR"]);
export const premiumProcedure = createRoleProcedure(["PREMIUM", "ADMIN"]);
```

### Complete Working Example

Here's a comprehensive router showing all procedure types in action:

```typescript
// src/server/api/routers/admin.ts
import { z } from "zod";

import {
  adminProcedure,
  createTRPCRouter,
  protectedProcedure,
  publicProcedure,
} from "@/server/api/trpc";

export const adminRouter = createTRPCRouter({
  // PUBLIC: Anyone can check system status
  getSystemStatus: publicProcedure.query(async () => {
    return {
      status: "online",
      timestamp: new Date(),
    };
  }),

  // PROTECTED: Logged-in users can view their permissions
  getMyPermissions: protectedProcedure.query(async ({ ctx }) => {
    const user = await ctx.db.user.findUnique({
      where: { id: ctx.user.id },
      select: { role: true, permissions: true },
    });

    return {
      userId: ctx.user.id,
      role: user?.role ?? "USER",
      permissions: user?.permissions ?? [],
    };
  }),

  // ADMIN QUERY: View all users with pagination
  getAllUsers: adminProcedure
    .input(
      z.object({
        page: z.number().min(1).default(1),
        limit: z.number().min(1).max(100).default(20),
      }),
    )
    .query(async ({ ctx, input }) => {
      const users = await ctx.db.user.findMany({
        skip: (input.page - 1) * input.limit,
        take: input.limit,
        select: {
          id: true,
          email: true,
          role: true,
          createdAt: true,
        },
      });

      const total = await ctx.db.user.count();

      return {
        users,
        pagination: {
          page: input.page,
          limit: input.limit,
          total,
          totalPages: Math.ceil(total / input.limit),
        },
      };
    }),

  // ADMIN MUTATION: Update user role
  updateUserRole: adminProcedure
    .input(
      z.object({
        userId: z.string(),
        role: z.enum(["USER", "MODERATOR", "ADMIN"]),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      // Prevent admin from removing their own admin role
      if (input.userId === ctx.user.id && input.role !== "ADMIN") {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Cannot remove your own admin role",
        });
      }

      const updatedUser = await ctx.db.user.update({
        where: { id: input.userId },
        data: { role: input.role },
      });

      return {
        success: true,
        user: updatedUser,
      };
    }),
});
```

### Key Benefits

**Type Safety Throughout:**

- `ctx.user` is automatically typed based on the procedure
- Input validation with Zod provides type inference
- Errors are properly typed with TRPCError

**Composable Middleware:**

- Stack middleware functions for complex auth logic
- Each middleware can modify context for the next
- Reuse common patterns across procedures

**Clear Authorization Boundaries:**

- Public vs Protected vs Admin is explicit in code
- Authorization happens before business logic
- Failed auth never reaches your resolver

**Best Practices:**

- Always extend from `protectedProcedure` for auth-required procedures
- Use specific error codes (UNAUTHORIZED vs FORBIDDEN)
- Keep middleware focused on one concern
- Test authorization logic separately from business logic

---

**Living Document:** Add new patterns as they emerge in the codebase.
