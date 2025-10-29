# Performance & Environment

This document covers performance optimizations and environment configuration.

---

## Performance Optimizations

### Current Optimizations
- Server Components reduce client bundle size
- tRPC batching (multiple queries in single request)
- TanStack Query caching (reduce redundant fetches)
- Prisma connection pooling
- Suspense for streaming HTML
- MDX for static documentation

### Future Optimizations
- React Server Actions for mutations (reduce client JS)
- Partial Prerendering (Next.js 15 experimental)
- Incremental Static Regeneration for docs
- Image optimization (next/image)
- Font optimization (next/font)

---

## Environment Setup

### Required Environment Variables

```bash
# Database
DATABASE_URL="postgresql://..."
DIRECT_URL="postgresql://..."  # For Prisma migrations

# WorkOS
WORKOS_API_KEY="..."
WORKOS_CLIENT_ID="..."
WORKOS_COOKIE_PASSWORD="..."  # 32-char random string
WORKOS_REDIRECT_URI="http://localhost:3000/api/callback"

# App
NODE_ENV="development"
NEXT_PUBLIC_APP_URL="http://localhost:3000"
```

### Validation
All env vars validated at build time via `src/env.js` using `@t3-oss/env-nextjs` + Zod.

---

**Living Document:** Update as new optimizations are added and environment configuration changes.
