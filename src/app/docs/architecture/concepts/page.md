# Fundamental Concepts

Core mental models for building hybrid server/client applications with Next.js, tRPC, and TanStack Query.

---

## 1. React & Next.js: Server vs Client Components

**Goal:** Ship less JavaScript to the browser while maintaining rich interactivity. Server Components render on the server with zero client-side JavaScript, while Client Components provide interactivity where needed.

### Component Tree Patterns

**Unified Component Tree showing all three composition patterns:**

```mermaid
graph TB
    A["DashboardPage<br/>(Server)<br/>✅ Pattern 1: Server by Default"]

    A --> B["Header<br/>(Server)"]
    A --> C["Modal<br/>(Client)<br/>✅ Pattern 2: Client High"]
    A --> D["PostList<br/>(Server)"]
    A --> E["Sidebar<br/>(Server)"]

    B --> F["ThemeToggle<br/>(Client)<br/>✅ Pattern 3: Leaf Node"]

    C -.->|"children prop"| G["ServerContent<br/>(Server)<br/>✅ Pattern 2: Server as Children"]
    C --> H["CloseButton<br/>(Client)"]

    D --> I["PostCard<br/>(Server)"]
    I --> J["LikeButton<br/>(Client)<br/>✅ Pattern 3: Leaf Node"]

    E --> K["NavItem<br/>(Server)"]
    K --> L["ActionButton<br/>(Client)<br/>✅ Pattern 3: Leaf Node"]

    style A fill:#f97316,stroke:#ea580c,stroke-width:3px,color:#fff
    style B fill:#f97316,stroke:#ea580c,stroke-width:2px,color:#fff
    style C fill:#3b82f6,stroke:#2563eb,stroke-width:3px,color:#fff
    style D fill:#f97316,stroke:#ea580c,stroke-width:2px,color:#fff
    style E fill:#f97316,stroke:#ea580c,stroke-width:2px,color:#fff
    style F fill:#3b82f6,stroke:#2563eb,stroke-width:2px,color:#fff
    style G fill:#f97316,stroke:#ea580c,stroke-width:2px,color:#fff
    style H fill:#3b82f6,stroke:#2563eb,stroke-width:2px,color:#fff
    style I fill:#f97316,stroke:#ea580c,stroke-width:2px,color:#fff
    style J fill:#3b82f6,stroke:#2563eb,stroke-width:2px,color:#fff
    style K fill:#f97316,stroke:#ea580c,stroke-width:2px,color:#fff
    style L fill:#3b82f6,stroke:#2563eb,stroke-width:2px,color:#fff
```

**Legend:** 🟠 Orange = Server Component | 🔵 Blue = Client Component

**Three Patterns in One Tree:**

- ✅ **Pattern 1: Server by Default** - Root is always a Server Component
- ✅ **Pattern 2: Client High, Server as Children** - Modal (Client) receives ServerContent via `children` prop
- ✅ **Pattern 3: Clients at Leaf Nodes** - ThemeToggle, LikeButton, ActionButton are interactive leaves

---

### Rendering & Hydration Flow

**How Server Components become interactive in the browser:**

```mermaid
sequenceDiagram
    participant SC as Server Components
    participant Server as Next.js Server
    participant Net as Network Boundary
    participant Browser as Browser
    participant CC as Client Components

    Note over SC,Server: 🟠 SERVER SIDE
    SC->>Server: 1. React renders tree
    Server->>Server: 2. Dehydration<br/>(Convert to HTML + RSC Payload)
    Note over Server: RSC Payload = Serialized<br/>component tree data

    Server->>Net: 3. Send HTML + RSC Payload
    Note over Net: ━━━━━━━━━━━━━━━<br/>NETWORK BOUNDARY<br/>━━━━━━━━━━━━━━━
    Net->>Browser: 4. HTML arrives
    Browser->>Browser: 5. First Paint<br/>(Static HTML displays)

    Note over Browser,CC: 🔵 CLIENT SIDE
    Server->>Net: 6. Send JS Bundle
    Net->>Browser: 7. JS arrives
    Browser->>CC: 8. Hydration<br/>(Attach event handlers)
    CC->>Browser: 9. Interactive UI ready

    Note over CC: Only Client Components<br/>become interactive
```

### Key Concepts

**RSC (React Server Components):** Components that render only on the server. They can be `async`, query databases directly, and never re-render on the client.

**Dehydration:** Converting Server Components into static HTML and an RSC Payload (serialized component data) on the server. This enables instant First Paint in the browser.

**Hydration:** React's process for attaching event handlers to the DOM to make static HTML interactive. **Only happens for Client Components** after the JS bundle crosses the network boundary.

---

### How It Works: Client-Side Rendering & Navigation

**Initial Page Load:**

When your application loads in the browser, three key assets work together:

1. **HTML** → Immediately shows a fast non-interactive preview (First Paint)
2. **RSC Payload** → Reconciles the Client and Server Component trees
3. **JavaScript** → Hydrates Client Components to make them interactive

**Subsequent Navigations:**

After initial load, navigation is optimized:

- RSC Payload is prefetched and cached for instant route changes
- Client Components render entirely on the client without server-rendered HTML
- Creates smooth, app-like experience without full page reloads

**Component Composition Rules:**

- ✅ Server Component can import and render Client Components
- ✅ Client Component can receive Server Components as `children` prop
- ❌ Client Component cannot import Server Components directly

**References:**

- [Next.js Server & Client Components](https://nextjs.org/docs/app/getting-started/server-and-client-components)
- [React Foundations: Server and Client Components](https://nextjs.org/learn/react-foundations/server-and-client-components)

---

## 2. TanStack Query: Client-Side Cache & Server Hydration

**Goal:** Manage asynchronous state in Client Components with automatic caching, synchronization, and seamless server-to-client data flow. TanStack Query eliminates manual loading states, provides optimistic updates, and enables instant UX through server prefetching.

### Server vs Client Rendering

**TanStack Query is a client-side library**, but Next.js enables server prefetching to hydrate the cache before the page loads.

```mermaid
sequenceDiagram
    participant RSC as Server Component
    participant Server as Next.js Server
    participant Cache as TanStack Cache
    participant Browser as Browser
    participant Client as Client Component

    Note over RSC,Server: 🟠 SERVER SIDE
    RSC->>Server: 1. prefetchQuery()<br/>(Server Prefetch)
    Server->>Server: 2. Execute tRPC procedure<br/>(Direct function call)
    Server->>Cache: 3. Populate cache state<br/>(Dehydrated state)

    Server->>Browser: 4. Send HTML + Dehydrated state
    Note over Browser: HTML displays immediately<br/>(No loading spinner!)

    Note over Cache,Client: 🔵 CLIENT SIDE
    Cache->>Client: 5. Hydrate cache<br/>(Restore server state)
    Client->>Client: 6. useQuery() reads<br/>from hydrated cache
    Note over Client: Data available instantly<br/>(No network request!)

    Client->>Cache: 7. Background refetch<br/>(Ensure freshness)
    Cache->>Server: 8. HTTP POST /api/trpc
    Server->>Cache: 9. Updated data
    Client->>Client: 10. Re-render with fresh data

    rect rgba(249, 115, 22, 0.1)
        Note over RSC,Cache: Server Prefetch Pattern
    end

    rect rgba(59, 130, 246, 0.1)
        Note over Cache,Client: Client Hydration Pattern
    end
```

**Why Server Prefetch?**

- Eliminates loading spinners on initial page load
- Data is embedded in HTML (available immediately)
- Client Components receive pre-populated cache
- Background refetch ensures data freshness

**useQuery vs useSuspenseQuery:**

- **useQuery**: Returns `{data, isLoading, error}` → Manual loading states
- **useSuspenseQuery**: Suspends component until data loads → Integrates with React Suspense boundaries

**Decision Rule:**

- Use `useSuspenseQuery` when you have a Suspense boundary and want automatic loading UI
- Use `useQuery` when you need fine-grained control over loading states or show partial UI

---

### Mutations Strategy

**Where should mutations live?** Always on the client using `useMutation()` hooks in Client Components.

**Why Client-Side?**

- Mutations need user interaction (buttons, forms)
- Require optimistic updates for instant feedback
- Need access to TanStack Query's invalidation system
- Can't be triggered from Server Components

**Mutation Lifecycle:**

```mermaid
graph LR
    A[User Action] --> B[useMutation]
    B --> C{Optimistic?}

    C -->|Yes| D1[Update cache immediately]
    C -->|No| D2[Show loading state]

    D1 --> E[HTTP POST /api/trpc]
    D2 --> E

    E --> F{Success?}

    F -->|Yes| G[Invalidate queries]
    F -->|No| H[Rollback optimistic update]

    G --> I[Refetch affected data]
    H --> I

    I --> J[UI reflects reality]

    style A fill:#3b82f6,stroke:#2563eb,stroke-width:2px,color:#fff
    style B fill:#3b82f6,stroke:#2563eb,stroke-width:2px,color:#fff
    style D1 fill:#10b981,stroke:#059669,stroke-width:2px,color:#fff
    style E fill:#f97316,stroke:#ea580c,stroke-width:2px,color:#fff
    style G fill:#10b981,stroke:#059669,stroke-width:2px,color:#fff
    style H fill:#ef4444,stroke:#dc2626,stroke-width:2px,color:#fff
```

---

### Cache Update Patterns

**Three ways to update the cache after mutations:**

**1. Query Invalidation (Recommended Default)**

- Marks queries as stale and triggers automatic refetch
- Guarantees data consistency with server
- Use for most mutations

**2. Direct Cache Updates**

- Manually update cache using `setQueryData()`
- Avoids network request for predictable changes
- Use when mutation response contains all updated data

**3. Optimistic Updates**

- Update cache before mutation completes
- Rollback if mutation fails
- Use for instant user feedback (like buttons, toggles)

**Decision Tree:**

```mermaid
graph TD
    A[Mutation Completed] --> B{Do you have the<br/>complete updated data?}

    B -->|Yes| C{Is instant feedback<br/>critical for UX?}
    B -->|No| D[Query Invalidation]

    C -->|Yes| E[Optimistic Update]
    C -->|No| F[Direct Cache Update]

    D --> G[Safest: Refetch from server]
    F --> H[Efficient: No network request]
    E --> I[Fastest: Instant UI response]

    style D fill:#3b82f6,stroke:#2563eb,stroke-width:3px,color:#fff
    style F fill:#10b981,stroke:#059669,stroke-width:2px,color:#fff
    style E fill:#f59e0b,stroke:#d97706,stroke-width:2px,color:#fff
```

**How They Work:**

**Query Invalidation:**

- Marks cache entry as stale
- If component is mounted, triggers immediate refetch
- If component is unmounted, refetches on next mount

**Direct Cache Updates:**

- Use mutation response to update cache directly
- Skips network request entirely
- Must ensure updated data is complete and accurate

**Optimistic Updates:**

- Update cache immediately (before server responds)
- Store previous state for rollback
- On error, restore previous state and show error
- On success, optionally invalidate to ensure accuracy

---

### Render & Update Strategy

**Our Complete Data Flow Pattern:**

```mermaid
graph TB
    subgraph Initial["INITIAL PAGE LOAD"]
        A1[Server Component] --> A2[prefetchQuery]
        A2 --> A3[Dehydrate state]
        A3 --> A4[Send to browser]
    end

    subgraph Hydration["CLIENT HYDRATION"]
        B1[Browser receives HTML] --> B2[HydrationBoundary]
        B2 --> B3[Restore cache state]
        B3 --> B4[useQuery reads cache]
        B4 --> B5[UI renders instantly]
    end

    subgraph Updates["USER INTERACTIONS"]
        C1[User clicks button] --> C2[useMutation fires]
        C2 --> C3{Update pattern?}

        C3 -->|Invalidation| C4[Mark stale + refetch]
        C3 -->|Direct update| C5[setQueryData]
        C3 -->|Optimistic| C6[Update now, rollback if error]

        C4 --> C7[Cache updated]
        C5 --> C7
        C6 --> C7

        C7 --> C8[React re-renders]
        C8 --> C9[UI reflects new state]
    end

    A4 --> B1
    B5 --> C1

    style Initial fill:#f97316,stroke:#ea580c,stroke-width:2px,color:#fff
    style Hydration fill:#3b82f6,stroke:#2563eb,stroke-width:2px,color:#fff
    style Updates fill:#10b981,stroke:#059669,stroke-width:2px,color:#fff
```

**The Strategy:**

1. **Server Prefetch**: Load critical data on server → zero loading spinners
2. **Client Hydration**: Restore cache in browser → instant UI
3. **Background Refetch**: Ensure data freshness → silent updates
4. **Mutations**: Use appropriate cache update pattern → consistent state
5. **Automatic Sync**: TanStack Query refetches on focus/reconnect → always fresh

**Key Principles:**

- Server Components fetch initial data (fast, no client JS)
- Client Components use `useQuery` to read hydrated cache (instant)
- Mutations always happen client-side (user interactions)
- Cache invalidation keeps everything synchronized
- Optimistic updates provide instant feedback when needed

---

### TanStack Query in Next.js Best Practices

**Server-Side Pattern (HydrationBoundary):**

- Wrap prefetched data with `HydrationBoundary` component
- Pass dehydrated state to client via `dehydrate(queryClient)`
- Client automatically hydrates cache from this state

**When to Prefetch:**

- Critical data visible above the fold
- Data needed for initial render
- Data with slow network requests

**When NOT to Prefetch:**

- Data below the fold or in tabs
- Data that changes frequently
- User-specific data that varies per request

**Cache Configuration:**

- Set appropriate `staleTime` (how long data stays fresh)
- Set appropriate `cacheTime` (how long unused data stays in memory)
- Enable automatic refetching on window focus for real-time updates
- Use query keys consistently for proper invalidation

**References:**

- [TanStack Query: Server Rendering & Hydration](https://tanstack.com/query/latest/docs/framework/react/guides/ssr)
- [TanStack Query: Prefetching in Next.js](https://tanstack.com/query/latest/docs/framework/react/guides/prefetching)
- [TanStack Query: useQuery vs useSuspenseQuery](https://tanstack.com/query/latest/docs/framework/react/guides/suspense)
- [TanStack Query: Mutations](https://tanstack.com/query/latest/docs/framework/react/guides/mutations)
- [TanStack Query: Optimistic Updates](https://tanstack.com/query/latest/docs/framework/react/guides/optimistic-updates)
- [TanStack Query: Invalidation](https://tanstack.com/query/latest/docs/framework/react/guides/query-invalidation)
- [TanStack Query: Important Defaults](https://tanstack.com/query/latest/docs/framework/react/guides/important-defaults)

---

## 3. tRPC: Dual API Pattern

tRPC provides **two different APIs** for Server vs Client Components.

```mermaid
graph TB
    subgraph Server["SERVER COMPONENT"]
        A1[import api from @/trpc/server] --> A2[await api.post.list]
        A2 --> A3[Direct Function Call<br/>No HTTP]
        A3 --> A4[Prisma ORM]
        A4 --> A5[(PostgreSQL)]
    end

    subgraph Client["CLIENT COMPONENT"]
        B1['use client'<br/>import api from @/trpc/react] --> B2[api.post.list.useQuery]
        B2 --> B3[HTTP POST /api/trpc]
        B3 --> B4[tRPC Handler]
        B4 --> B5[Prisma ORM]
        B5 --> B6[(PostgreSQL)]
        B6 --> B7[TanStack Query Cache]
    end

    A5 -.->|"~5ms"| A6[Response]
    B7 -.->|"~50ms"| B8[Response]

    style Server fill:#10b981,stroke:#059669,color:#fff
    style Client fill:#3b82f6,stroke:#2563eb,color:#fff
    style A5 fill:#8b5cf6,stroke:#7c3aed,color:#fff
    style B6 fill:#8b5cf6,stroke:#7c3aed,color:#fff
```

**Performance:** Server Components are ~10x faster (no network roundtrip).

**When to use:**

- **Server Components:** Initial loads, static data, maximum performance
- **Client Components:** User interactions, real-time updates, dynamic features

**Reference:** [tRPC with Next.js](https://trpc.io/docs/client/nextjs/setup)

---

## Best Practices

1. **Default to Server Components** → Only use `'use client'` when needed
2. **Server for data fetching** → Use tRPC server caller
3. **Client for interactivity** → Use tRPC React hooks + TanStack Query
4. **Prefetch on server** → Eliminate loading states
5. **Invalidate after mutations** → Keep cache synchronized

---

## Additional Resources

- [Next.js App Router](https://nextjs.org/docs/app)
- [React Server Components RFC](https://github.com/reactjs/rfcs/blob/main/text/0188-server-components.md)
- [tRPC Documentation](https://trpc.io/docs)
- [TanStack Query Guides](https://tanstack.com/query/latest/docs/framework/react/guides)
- [Prisma Documentation](https://www.prisma.io/docs)
