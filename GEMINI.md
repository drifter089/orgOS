# GEMINI.md

This file provides context and guidance for Gemini when working with the **orgOS** codebase.

## 1. Project Overview

**orgOS** is an "Organizational Operating System" designed to help teams visualize their structure, manage roles, and track metrics. It uses a modern "T3 Stack" architecture with heavy emphasis on visual tools (React Flow) and AI-assisted configuration.

### Core Domain Concepts

- **Team Canvas:** A visual graph where Nodes are Roles and Edges are reporting lines or workflows.
- **Roles:** The fundamental unit of organization. Roles have purposes, accountabilities, and assigned users.
- **Metrics:** KPIs linked to Roles or Integrations. Data is fetched via Nango or external APIs.
- **Transformers:** AI-generated code snippets that transform raw API data into standardized `MetricDataPoint`s and Chart configurations.

## 2. Technology Stack & Architecture

### Frontend

- **Framework:** Next.js 15.5 (App Router)
- **Language:** TypeScript 5.9
- **UI Library:** Tailwind CSS 4, shadcn/ui, Radix UI
- **Visualization:**
  - **React Flow:** For the Team Canvas (interactive node editor).
  - **Recharts:** For Metric dashboards.
  - **Mermaid/ELK.js:** For automatic layout and diagrams.
- **State Management:**
  - **Zustand:** For local complex state (e.g., Canvas state).
  - **TanStack Query:** For server state caching and synchronization.

### Backend

- **API Layer:** tRPC 11 (App Router compatible).
- **Database:** PostgreSQL 14+ via Prisma 6 ORM.
- **Authentication:** WorkOS AuthKit (Enterprise SSO/Auth).
- **Integrations:** Nango (OAuth/API handling).

### Key Architectural Patterns

#### 1. tRPC Dual API

We use a "Dual API" pattern to share logic between Server Components and Client Components:

- **Server Components:** Use `import { api } from "@/trpc/server"`. Direct DB calls, no HTTP overhead.
- **Client Components:** Use `import { api } from "@/trpc/react"`. Standard HTTP/Hooks wrapper.

#### 2. Team Canvas System (`src/app/teams/[teamId]/`)

- **Cache-First Nodes:** React Flow nodes stores _minimal_ data (e.g., just `roleId`). The Node component itself fetches the full Role data from the TanStack Query cache. This ensures the canvas and sidebars are always in sync.
- **Auto-Save:** Canvas changes are debounced (2s) and saved via `editSession` logic to handle concurrent edits.

#### 3. Metrics Pipeline

Data flows through a 3-stage pipeline:

1.  **Ingestion:** Raw API Data $\xrightarrow{\text{DataIngestionTransformer (AI)}}$ `MetricDataPoint` (Time-series DB)
2.  **Aggregation:** `MetricDataPoint` $\xrightarrow{\text{ChartTransformer (AI)}}$ Chart Configuration
3.  **Visualization:** Chart Config $\rightarrow$ Recharts UI

## 3. Directory Structure

```
orgOS/
├── prisma/
│   └── schema.prisma          # Database Schema (Team, Role, Metric, Transformer)
├── src/
│   ├── app/                   # Next.js App Router
│   │   ├── api/               # API Routes (Cron, Webhooks)
│   │   ├── teams/[teamId]/    # Team Canvas (React Flow implementation)
│   │   ├── dashboard/         # Metrics Dashboard
│   │   └── docs/              # MDX Documentation
│   ├── components/
│   │   ├── ui/                # shadcn/ui primitive components
│   │   └── react-flow/        # Shared React Flow components (BaseNode, etc.)
│   ├── server/
│   │   ├── api/
│   │   │   ├── routers/       # tRPC Routers (team, role, metric, etc.)
│   │   │   └── root.ts        # AppRouter definition
│   │   └── db.ts              # Prisma Client singleton
│   ├── lib/                   # Shared logic
│   │   ├── canvas/            # Reusable Canvas logic (stores, hooks)
│   │   └── metrics/           # Metric transformation logic
│   └── env.js                 # Environment variable validation
└── tests/                     # Playwright E2E tests
```

## 4. Development & Commands

### Setup & Run

- **Install:** `pnpm install`
- **Database:**
  - `pnpm db:generate` (Generate Prisma Client)
  - `pnpm db:push` (Push schema to DB - Dev)
- **Dev Server:** `pnpm dev` (Starts at http://localhost:3000)

### Code Quality

- **Lint/Check:** `pnpm check` (Runs ESLint + TSC)
- **Format:** `pnpm format:write` (Prettier)
- **Tests:** `pnpm exec playwright test`

## 5. Coding Conventions

- **No Random Docs:** Do not create `.md` files unless explicitly asked. Use `CLAUDE.md` or this file for reference.
- **Environment Variables:** Must be defined in `.env` and validated in `src/env.js`.
- **Authorization:** NEVER assume auth. Always use helpers like `getTeamAndVerifyAccess` in tRPC procedures.
- **Components:**
  - Prefer **Server Components** for initial data fetching.
  - Use **Client Components** (`"use client"`) only for interactivity.
  - Place colocated components in `_components/` folders.

## 6. Known "Hot Spots" (Be Careful)

- **Canvas Serialization:** The logic to save/load React Flow nodes to the DB (`reactFlowNodes` column) is complex. Ensure you understand the `enrichNodesWithRoleData` flow before modifying.
- **Metric Transformers:** These are AI-generated code stored in the DB (`DataIngestionTransformer`). Changing the schema requires updating how these transformers are generated/executed.
- **Edit Sessions:** The `EditSession` model handles locking for concurrent team editing. Be careful when modifying team save logic.
