# Key Integration Patterns

This document showcases common patterns for integrating Next.js, tRPC, Prisma, and WorkOS together.

---

## Pattern: Server Component + Client Component Hydration

```typescript
// src/app/page.tsx (Server Component)
import { api, HydrateClient } from "@/trpc/server";

export default async function Home() {
  // Fetch on server
  const data = await api.post.hello({ text: "server" });

  // Prefetch for client component
  void api.post.getLatest.prefetch();

  return (
    <HydrateClient>  {/* Hydrates TanStack Query cache */}
      <ServerData data={data} />
      <ClientComponent />  {/* Uses prefetched data */}
    </HydrateClient>
  );
}
```

**Benefits:**

- Fast initial render (server)
- No loading spinner (data prefetched)
- Client can refetch if needed

---

## Pattern: Form with Mutation + Cache Invalidation

```typescript
"use client";
import { api } from "@/trpc/react";

export function CreatePostForm() {
  const utils = api.useUtils();

  const createPost = api.post.create.useMutation({
    onSuccess: async () => {
      await utils.post.invalidate();  // Refetch all post queries
    },
  });

  return (
    <form onSubmit={(e) => {
      e.preventDefault();
      createPost.mutate({ name: "..." });
    }}>
      <input />
      <button disabled={createPost.isPending}>
        {createPost.isPending ? "Creating..." : "Create"}
      </button>
    </form>
  );
}
```

**Benefits:**

- Automatic UI updates after mutation
- Loading states built-in
- Error handling with TanStack Query

---

## Pattern: Protected Server Component

```typescript
// src/components/navbar/NavBar.server.tsx
import { withAuth, signOut } from "@workos-inc/authkit-nextjs";

export async function NavBar() {
  const { user } = await withAuth();  // Get session

  if (!user) {
    return <Link href="/login">Sign in</Link>;
  }

  return (
    <>
      <span>Welcome, {user.firstName}</span>
      <form action={async () => {
        "use server";
        await signOut();
      }}>
        <button type="submit">Sign out</button>
      </form>
    </>
  );
}
```

**Benefits:**

- Server-rendered auth state
- No flash of wrong UI
- Progressive enhancement (works without JS)

---

## Pattern: Type-Safe Protected tRPC Procedure

```typescript
// src/server/api/routers/user.ts
export const userRouter = createTRPCRouter({
  getProfile: protectedProcedure.query(async ({ ctx }) => {
    // ctx.user is type-safe (enforced by middleware)
    return ctx.db.user.findUnique({
      where: { id: ctx.user.id },
    });
  }),

  updateProfile: protectedProcedure
    .input(z.object({ name: z.string() }))
    .mutation(async ({ ctx, input }) => {
      return ctx.db.user.update({
        where: { id: ctx.user.id },
        data: { name: input.name },
      });
    }),
});
```

**Benefits:**

- Auth enforced at procedure level
- Type-safe user context
- Clear separation (public vs protected)

---

## Pattern: Server Prefetching for Instant UI

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

## Pattern: useSuspenseQuery for Declarative Loading

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

## Pattern: Optimistic Updates for Instant Feedback

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

## Pattern: Query Invalidation (Recommended Default)

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

## Pattern: Direct Cache Updates (Efficient Alternative)

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

## Pattern: Event Handler Prefetching

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

**Living Document:** Add new patterns as they emerge in the codebase.
