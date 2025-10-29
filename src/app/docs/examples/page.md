# Examples

Practical examples and common patterns used in this project.

## TypeScript Examples

### Type-safe API Routes with tRPC

```typescript
import { z } from "zod";
import { createTRPCRouter, publicProcedure } from "~/server/api/trpc";

export const exampleRouter = createTRPCRouter({
  hello: publicProcedure
    .input(z.object({ text: z.string() }))
    .query(({ input }) => {
      return {
        greeting: `Hello ${input.text}`,
      };
    }),

  create: publicProcedure
    .input(z.object({ name: z.string().min(1) }))
    .mutation(async ({ ctx, input }) => {
      return ctx.db.post.create({
        data: {
          name: input.name,
        },
      });
    }),
});
```

### React Server Components

```tsx
import { api } from "~/trpc/server";

export default async function ServerComponent() {
  const data = await api.post.getLatest();

  return (
    <div>
      <h1>{data?.name}</h1>
      <p>This component is rendered on the server!</p>
    </div>
  );
}
```

### Client Components with Hooks

```tsx
"use client";

import { api } from "~/trpc/react";
import { Button } from "~/components/ui/button";

export function ClientComponent() {
  const [name, setName] = useState("");
  const utils = api.useUtils();

  const createPost = api.post.create.useMutation({
    onSuccess: async () => {
      await utils.post.invalidate();
    },
  });

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        createPost.mutate({ name });
      }}
    >
      <input
        value={name}
        onChange={(e) => setName(e.target.value)}
        placeholder="Title"
      />
      <Button type="submit" disabled={createPost.isPending}>
        {createPost.isPending ? "Submitting..." : "Submit"}
      </Button>
    </form>
  );
}
```

## Styling Examples

### Tailwind CSS Classes

```tsx
export default function StyledComponent() {
  return (
    <div className="flex items-center justify-center min-h-screen bg-background">
      <div className="rounded-lg border bg-card p-6 shadow-sm">
        <h2 className="text-2xl font-bold text-foreground">
          Styled with Tailwind
        </h2>
        <p className="mt-2 text-muted-foreground">
          Using semantic color tokens for theming
        </p>
      </div>
    </div>
  );
}
```

### Custom Animations with GSAP

```tsx
"use client";

import { useGSAP } from "@gsap/react";
import { gsap } from "gsap";
import { useRef } from "react";

export function AnimatedComponent() {
  const boxRef = useRef<HTMLDivElement>(null);

  useGSAP(() => {
    gsap.from(boxRef.current, {
      opacity: 0,
      y: 50,
      duration: 1,
      ease: "power2.out",
    });
  }, []);

  return (
    <div ref={boxRef} className="rounded-lg bg-primary p-8 text-primary-foreground">
      This element animates in!
    </div>
  );
}
```

## Form Handling

### React Hook Form with Zod

```tsx
"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "~/components/ui/button";
import { Input } from "~/components/ui/input";

const formSchema = z.object({
  email: z.string().email("Invalid email address"),
  password: z.string().min(8, "Password must be at least 8 characters"),
});

type FormData = z.infer<typeof formSchema>;

export function LoginForm() {
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<FormData>({
    resolver: zodResolver(formSchema),
  });

  const onSubmit = (data: FormData) => {
    console.log("Form data:", data);
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      <div>
        <Input {...register("email")} placeholder="Email" />
        {errors.email && (
          <p className="text-sm text-destructive">{errors.email.message}</p>
        )}
      </div>

      <div>
        <Input {...register("password")} type="password" placeholder="Password" />
        {errors.password && (
          <p className="text-sm text-destructive">{errors.password.message}</p>
        )}
      </div>

      <Button type="submit">Login</Button>
    </form>
  );
}
```

## Database Queries

### Prisma Examples

```typescript
import { db } from "~/server/db";

// Find unique record
const user = await db.user.findUnique({
  where: { id: userId },
  include: { posts: true },
});

// Create with relations
const post = await db.post.create({
  data: {
    title: "New Post",
    content: "Post content",
    author: {
      connect: { id: userId },
    },
  },
});

// Update record
const updated = await db.post.update({
  where: { id: postId },
  data: { published: true },
});

// Delete record
await db.post.delete({
  where: { id: postId },
});

// Complex query with filtering
const posts = await db.post.findMany({
  where: {
    published: true,
    author: {
      email: { contains: "@example.com" },
    },
  },
  orderBy: { createdAt: "desc" },
  take: 10,
});
```

## Authentication

### WorkOS AuthKit

```tsx
import { getSignInUrl, getSignUpUrl, signOut } from "@workos-inc/authkit-nextjs";
import { Button } from "~/components/ui/button";

export async function AuthButtons() {
  const signInUrl = await getSignInUrl();
  const signUpUrl = await getSignUpUrl();

  return (
    <div className="flex gap-2">
      <form action={signInUrl}>
        <Button type="submit">Sign In</Button>
      </form>

      <form action={signUpUrl}>
        <Button type="submit" variant="outline">
          Sign Up
        </Button>
      </form>

      <form action={signOut}>
        <Button type="submit" variant="ghost">
          Sign Out
        </Button>
      </form>
    </div>
  );
}
```

## Image Example

Here's an example image loaded from the public folder:

![Example Image](/docs-images/example.png)

## Tables

| Feature | Description | Status |
|---------|-------------|--------|
| MDX Support | Write docs in markdown | ✅ |
| Syntax Highlighting | Beautiful code blocks | ✅ |
| Dark Mode | Theme switching | ✅ |
| Type Safety | Full TypeScript support | ✅ |

## Task Lists

- [x] Set up project
- [x] Configure dependencies
- [x] Create documentation
- [ ] Deploy to production
- [ ] Add more examples

## Callouts

> **Note:** This is an important callout!
>
> You can use blockquotes to highlight important information.

---

## More Examples

For more examples, check out:

- The main app at `/`
- The Shadcn showcase at `/shadcn`
- The [Getting Started](/docs/getting-started) guide
