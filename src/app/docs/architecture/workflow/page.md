# Development Workflow

This document outlines the development workflow for adding features and following best practices.

---

## Adding a New Feature

### 1. Database Schema (if needed)
```bash
# Edit prisma/schema.prisma
pnpm prisma migrate dev --name add_feature
```

### 2. Create tRPC Router
```typescript
// src/server/api/routers/feature.ts
export const featureRouter = createTRPCRouter({
  // queries and mutations
});
```

### 3. Register Router
```typescript
// src/server/api/root.ts
export const appRouter = createTRPCRouter({
  post: postRouter,
  feature: featureRouter,  // Add here
});
```

### 4. Use in Components
```typescript
// Server Component
const data = await api.feature.get();

// Client Component
const { data } = api.feature.get.useQuery();
```

---

## Best Practices

### DO:
- ✅ Use Server Components by default
- ✅ Add Zod validation to all tRPC inputs
- ✅ Use `protectedProcedure` for auth-required actions
- ✅ Invalidate queries after mutations
- ✅ Use Suspense boundaries for loading states
- ✅ Add indexes to Prisma schema for performance
- ✅ Log errors in development

### DON'T:
- ❌ Fetch data in Client Components that could be Server Components
- ❌ Skip input validation
- ❌ Expose sensitive data in public procedures
- ❌ Put business logic in components
- ❌ Hardcode values that should be env variables
- ❌ Forget to handle loading/error states

---

## Current State & Next Steps

### What's Built
✅ Next.js 15 App Router with React 19
✅ tRPC setup with example router (post)
✅ Prisma schema with PostgreSQL
✅ WorkOS authentication (middleware + tRPC)
✅ Shadcn UI component library (50+ components)
✅ Dark mode with next-themes
✅ GSAP page transitions
✅ MDX documentation site
✅ TypeScript strict mode
✅ Environment variable validation

### Architecture Ready For
🔲 New tRPC routers (users, organizations, etc.)
🔲 Complex Prisma schemas with relations
🔲 Role-based access control (extend protectedProcedure)
🔲 File uploads (add storage pattern)
🔲 Real-time features (extend with WebSockets/SSE)
🔲 Background jobs (add queue pattern)
🔲 Multi-tenancy (WorkOS organizations)

### Conventions to Establish
- File naming (kebab-case vs camelCase)
- Component organization (when to colocate vs shared)
- Error handling patterns
- Loading state patterns
- Form validation approach
- Test strategy

---

**Living Document:** Update this as the development workflow evolves and new conventions are established.
