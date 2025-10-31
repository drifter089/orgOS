# Getting Started

Welcome to the project! This guide will walk you through everything you need to get up and running with your development environment. We'll cover prerequisites, installation, common workflows, and troubleshooting tips to ensure a smooth setup experience.

## Prerequisites

Before you begin, make sure you have the following installed on your system:

### Required Software

- **Node.js**: Version 20.x or higher
  - Download from [nodejs.org](https://nodejs.org/) or use a version manager like [nvm](https://github.com/nvm-sh/nvm)
  - Verify installation: `node --version`

- **pnpm**: Version 10.17.1 or higher
  - Install via npm: `npm install -g pnpm@10.17.1`
  - Or use [standalone installation](https://pnpm.io/installation)
  - Verify installation: `pnpm --version`

- **PostgreSQL**: Version 14+ recommended
  - Download from [postgresql.org](https://www.postgresql.org/download/)
  - Or use Docker: `docker run --name postgres -e POSTGRES_PASSWORD=password -p 5432:5432 -d postgres`
  - Make note of your connection credentials

- **Git**: For version control
  - Download from [git-scm.com](https://git-scm.com/)
  - Verify installation: `git --version`

### Recommended Tools

- **VS Code** with extensions:
  - ESLint
  - Prettier
  - Tailwind CSS IntelliSense
  - Prisma
  - MDX

## Installation

Follow these steps to set up your development environment:

### 1. Clone the Repository

```bash
# Clone via HTTPS
git clone https://github.com/your-org/org_os.git

# Or via SSH
git clone git@github.com:your-org/org_os.git

# Navigate to project directory
cd org_os
```

### 2. Install Dependencies

```bash
# Install all project dependencies
pnpm install
```

> **Note**: The `postinstall` script will automatically run `prisma generate` to create the Prisma client.

### 3. Set Up Environment Variables

Create a `.env` file from the example template:

```bash
# Copy the example environment file
cp .env.example .env
```

Edit `.env` and configure the required variables:

```bash
# Database Configuration
DATABASE_URL="postgresql://username:password@localhost:5432/org_os"

# WorkOS Configuration (if using authentication)
# Get these from your WorkOS dashboard
WORKOS_CLIENT_ID="your_client_id"
WORKOS_API_KEY="your_api_key"
WORKOS_REDIRECT_URI="http://localhost:3000/api/auth/callback"
WORKOS_COOKIE_DOMAIN="localhost"
```

> **Important**: Never commit your `.env` file to version control. It's already included in `.gitignore`.

### 4. Set Up the Database

Initialize your database with Prisma:

```bash
# Generate Prisma client (if not already done by postinstall)
pnpm db:generate

# Push the schema to your database
pnpm db:push

# (Optional) Open Prisma Studio to view your database
pnpm db:studio
```

### 5. Verify Installation

Start the development server to verify everything is working:

```bash
# Start development server with Turbo
pnpm dev
```

Your application should now be running at:

- **Application**: http://localhost:3000
- **Prisma Studio** (if started): http://localhost:5555

Test the setup by:

1. Opening http://localhost:3000 in your browser
2. Checking the console for any errors
3. Verifying the documentation at http://localhost:3000/docs

## First Steps After Installation

### Explore the Codebase

Start by familiarizing yourself with the project structure:

```
src/
├── app/                    # Next.js App Router pages
│   ├── api/               # API routes (WorkOS, tRPC)
│   ├── docs/              # Documentation (you are here!)
│   └── _components/       # Page-specific components
├── components/            # Shared UI components
│   ├── ui/               # shadcn/ui components
│   └── navbar/           # Navigation components
├── server/               # Server-side code
│   ├── api/             # tRPC routers
│   └── db.ts            # Prisma client singleton
├── trpc/                 # tRPC setup
└── styles/              # Global CSS
```

### Create Your First tRPC Route

1. **Create a new router** in `src/server/api/routers/`:

```typescript
// src/server/api/routers/hello.ts
import { z } from "zod";
import { createTRPCRouter, publicProcedure } from "~/server/api/trpc";

export const helloRouter = createTRPCRouter({
  greeting: publicProcedure
    .input(z.object({ name: z.string() }))
    .query(({ input }) => {
      return {
        message: `Hello, ${input.name}!`,
      };
    }),
});
```

2. **Add router to the root** in `src/server/api/root.ts`:

```typescript
export const appRouter = createTRPCRouter({
  // ... existing routers
  hello: helloRouter,
});
```

3. **Use in a component**:

```tsx
// In a client component
"use client";

import { api } from "~/trpc/react";

// In a client component

export function Greeting() {
  const { data } = api.hello.greeting.useQuery({ name: "World" });
  return <div>{data?.message}</div>;
}
```

### Add a New Page

Create a new page in the `src/app/` directory:

```tsx
// src/app/about/page.tsx
export default function AboutPage() {
  return (
    <div className="container mx-auto py-8">
      <h1 className="text-3xl font-bold">About Us</h1>
      <p>Welcome to our application!</p>
    </div>
  );
}
```

The page will be automatically available at `/about`.

## Development Commands

### Essential Commands

```bash
# Start development server with hot reload
pnpm dev

# Build for production
pnpm build

# Start production server
pnpm start

# Preview production build locally
pnpm preview
```

### Code Quality Commands

```bash
# Run linting and type checking together (recommended)
pnpm check

# Run ESLint only
pnpm lint

# Auto-fix ESLint issues
pnpm lint:fix

# Check TypeScript types
pnpm typecheck

# Check code formatting
pnpm format:check

# Auto-format code
pnpm format:write
```

### Database Commands

```bash
# Generate Prisma client after schema changes
pnpm db:generate

# Deploy migrations (production)
pnpm db:migrate

# Push schema changes without migrations (development)
pnpm db:push

# Open Prisma Studio - visual database editor
pnpm db:studio
```

### Common Development Workflow

A typical development workflow looks like this:

1. **Start your dev environment**:

```bash
pnpm dev           # Start Next.js dev server
pnpm db:studio     # (Optional) Open database viewer in another terminal
```

2. **Make changes and test**:

- Edit code - changes auto-reload
- Check the browser for visual changes
- Check terminal for TypeScript/build errors

3. **Before committing**:

```bash
pnpm check         # Lint and typecheck
pnpm format:write  # Format code
```

4. **Commit your changes**:

```bash
git add .
git commit -m "feat: your feature description"
# Pre-commit hooks will auto-format and lint
```

## Understanding the Development Flow

### Hot Reload Process

The development server uses Next.js Fast Refresh and Turbopack for instant updates:

- **React Components**: Changes appear instantly without losing state
- **API Routes**: Server restarts automatically
- **tRPC Routes**: Changes require a page refresh
- **Styles**: Tailwind CSS updates instantly
- **Database Schema**: Run `pnpm db:push` after schema changes

### Testing Your Changes

1. **Visual Testing**: Check the browser at http://localhost:3000
2. **API Testing**: Use the tRPC panel in React Query DevTools
3. **Database Changes**: View in Prisma Studio (`pnpm db:studio`)
4. **Type Safety**: TypeScript errors appear in terminal and IDE

### Authentication in Development

The application uses WorkOS for authentication:

- **Public Routes**: `/` and `/docs/*` are accessible without login
- **Protected Routes**: All other routes require authentication
- **Middleware**: Automatically handles auth checks (see `src/middleware.ts`)
- **Development Mode**: You can configure test users in WorkOS dashboard

### Finding Logs and Errors

- **Browser Console**: Client-side errors and logs
- **Terminal**: Server-side logs, build errors, TypeScript errors
- **React Query DevTools**: API call status and cache (dev mode only)
- **Network Tab**: HTTP requests and responses
- **Prisma Logs**: Database queries (enabled in development)

## Troubleshooting

### Common Issues and Solutions

#### Port 3000 Already in Use

**Error**: `Error: listen EADDRINUSE: address already in use :::3000`

**Solutions**:

```bash
# Find and kill the process using port 3000
lsof -i :3000
kill -9 <PID>

# Or use a different port
PORT=3001 pnpm dev
```

#### Database Connection Errors

**Error**: `P1001: Can't reach database server`

**Solutions**:

1. Verify PostgreSQL is running:

```bash
# Check PostgreSQL status
pg_isready

# Start PostgreSQL (macOS)
brew services start postgresql

# Start PostgreSQL (Linux)
sudo systemctl start postgresql
```

2. Check your `DATABASE_URL` in `.env`:

- Verify username, password, host, port, and database name
- Ensure the database exists: `createdb org_os`

#### Prisma Client Out of Sync

**Error**: `The table 'User' does not exist in the current database`

**Solutions**:

```bash
# Regenerate Prisma client
pnpm db:generate

# Push schema to database
pnpm db:push

# If issues persist, reset database (WARNING: deletes all data)
pnpm prisma db push --force-reset
```

#### TypeScript Errors After Installing Packages

**Error**: `Cannot find module` or type errors after `pnpm install`

**Solutions**:

```bash
# Clear TypeScript cache
rm -rf .next

# Regenerate types
pnpm db:generate
pnpm typecheck

# Restart TypeScript server in VS Code
# Press Cmd/Ctrl + Shift + P → "TypeScript: Restart TS Server"
```

#### Authentication Not Working

**Error**: `WorkOS configuration error` or redirect issues

**Solutions**:

1. Verify WorkOS environment variables are set in `.env`
2. Check `WORKOS_REDIRECT_URI` matches your development URL
3. Ensure WorkOS application is configured for http://localhost:3000
4. Clear cookies and try logging in again

## Code Quality Best Practices

### Working with Pre-commit Hooks

The project uses Husky and lint-staged to maintain code quality:

- **Automatic**: Runs on every commit
- **Fixes**: Auto-fixes ESLint issues and formats code
- **Fast**: Only checks staged files

### Temporarily Disable Hooks

If you need to commit without running hooks (not recommended):

```bash
# Skip pre-commit hooks
git commit -m "WIP: temporary commit" --no-verify

# Remember to fix issues before pushing!
pnpm check
pnpm format:write
```

### Commit Message Best Practices

Follow conventional commits for clear history:

```bash
# Features
git commit -m "feat: add user profile page"

# Bug fixes
git commit -m "fix: resolve login redirect issue"

# Documentation
git commit -m "docs: update API documentation"

# Refactoring
git commit -m "refactor: simplify auth flow"

# Tests
git commit -m "test: add user service tests"

# Chores
git commit -m "chore: update dependencies"
```

### Code Review Checklist

Before pushing code:

1. ✅ All TypeScript errors resolved (`pnpm typecheck`)
2. ✅ Linting passes (`pnpm lint`)
3. ✅ Code is formatted (`pnpm format:check`)
4. ✅ Tests pass (if applicable)
5. ✅ Database migrations work (`pnpm db:push`)
6. ✅ Application builds (`pnpm build`)

## Next Steps

Now that your environment is set up, explore these resources to deepen your understanding:

### 📚 Learn the Architecture

1. **[Architecture Concepts](/docs/architecture/concepts)** - Understand the core concepts:
   - React Server vs Client Components
   - TanStack Query patterns
   - tRPC dual API approach
   - Complete data flow diagrams

2. **[Architecture Patterns](/docs/architecture/patterns)** - See implementation examples:
   - Server prefetching strategies
   - Cache management patterns
   - Authentication flows
   - Custom tRPC procedures

### 🎨 Explore the UI

3. **[Components Library](/docs/components)** - Browse available components:
   - shadcn/ui components
   - Custom components
   - Form patterns
   - Layout components

### 🚀 Build Your First Feature

Try building a simple feature end-to-end:

1. Create a database model in `prisma/schema.prisma`
2. Generate types with `pnpm db:push`
3. Create a tRPC router in `src/server/api/routers/`
4. Build a UI component using shadcn/ui
5. Add a new page in `src/app/`
6. Test with Prisma Studio and browser

### 📖 Additional Resources

- **[MDX Documentation](/docs)** - Learn about writing documentation
- **[API Reference](/docs/api)** - Detailed API documentation
- **[Deployment Guide](/docs/deployment)** - Deploy to production

## Need Help?

If you run into issues not covered here:

1. **Check existing documentation** - Most answers are in `/docs`
2. **Review error messages** - They often point to the solution
3. **Search the codebase** - Look for similar patterns
4. **Check dependencies docs**:
   - [Next.js Documentation](https://nextjs.org/docs)
   - [tRPC Documentation](https://trpc.io/docs)
   - [Prisma Documentation](https://www.prisma.io/docs)
   - [WorkOS Documentation](https://workos.com/docs)
5. **Reach out to the team** - We're here to help!

---

Happy coding! 🚀 You're now ready to start building amazing features with the full power of the T3 Stack, WorkOS authentication, and a modern development workflow.
