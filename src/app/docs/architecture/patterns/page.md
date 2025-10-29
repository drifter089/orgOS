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

**Living Document:** Add new patterns as they emerge in the codebase.
