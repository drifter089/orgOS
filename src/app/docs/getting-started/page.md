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

# Create initial migration (first-time setup)
pnpm prisma migrate dev --name init

# This creates migration files and applies them to your database
# It also regenerates the Prisma client automatically

# (Optional) Open Prisma Studio to view your database
pnpm db:studio
```

> **Important**: Use `prisma migrate dev` for schema changes during development. The older `db:push` command bypasses migrations and should only be used for rapid prototyping. See the [Database Migration Workflow](#database-migration-workflow) section below for details.

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
# Generate Prisma client (TypeScript types only)
pnpm db:generate

# Create and apply migration (use when changing schema in development)
pnpm prisma migrate dev

# Deploy migrations to production (safe, transactional)
pnpm db:migrate

# Push schema changes without migrations (dev only, can cause data loss!)
pnpm db:push

# Check migration status
pnpm prisma migrate status

# Open Prisma Studio - visual database editor
pnpm db:studio
```

> **Migration Best Practice**: Always use `prisma migrate dev` when changing your schema during development. Commit the generated migration files to git. Never use `db:push` in production as it can cause data loss.

### Testing Commands

The project uses [Playwright](https://playwright.dev/docs/intro) for end-to-end testing. Run tests to ensure your changes work correctly:

```bash
# Run all end-to-end tests
pnpm exec playwright test

# Start interactive UI mode for debugging
pnpm exec playwright test --ui

# Run tests only on Desktop Chrome
pnpm exec playwright test --project=chromium

# Run tests in a specific file
pnpm exec playwright test example

# Run tests in debug mode with breakpoints
pnpm exec playwright test --debug

# Auto generate tests with Codegen
pnpm exec playwright codegen
```

Test files are located in `./tests/example.spec.ts` with configuration in `./playwright.config.ts`.

## Database Migration Workflow

This project uses **Prisma Migrate** for production-safe database migrations. Understanding the migration workflow is critical for maintaining data integrity.

### Migration Commands Overview

| Command                      | Purpose                                   | When to Use                             | Safe for Production?   |
| ---------------------------- | ----------------------------------------- | --------------------------------------- | ---------------------- |
| `pnpm db:generate`           | Generate Prisma Client (TypeScript types) | After pulling schema changes from git   | ✅ Yes (no DB changes) |
| `pnpm prisma migrate dev`    | Create and apply migration                | During development when changing schema | ❌ No (dev only)       |
| `pnpm db:migrate`            | Deploy pending migrations                 | Production deployments                  | ✅ Yes (transactional) |
| `pnpm db:push`               | Direct schema sync (no migrations)        | Rapid prototyping only                  | ❌ No (can lose data)  |
| `pnpm prisma migrate status` | Check migration status                    | Debugging migration issues              | ✅ Yes (read-only)     |

### Initial Setup: Baselining Existing Database

If your database already has tables (from using `db:push`), you need to baseline migrations:

```bash
# Step 1: Create migration files WITHOUT applying them
pnpm prisma migrate dev --create-only --name init

# Step 2: Mark the migration as already applied (since tables exist)
pnpm prisma migrate resolve --applied "YYYYMMDDHHMMSS_init"

# Replace YYYYMMDDHHMMSS_init with the actual folder name from Step 1

# Step 3: Commit migration files to git
git add prisma/migrations
git commit -m "chore: add baseline database migrations"
```

### Development Workflow: Making Schema Changes

When you need to modify your database schema:

```bash
# 1. Edit prisma/schema.prisma
#    (Add fields, models, indexes, etc.)

# 2. Create and apply migration (you'll be prompted for a name)
pnpm prisma migrate dev

# Example migration names:
#   - add_user_email_field
#   - make_metric_optional
#   - create_team_index

# This command automatically:
#   ✅ Creates SQL migration files in prisma/migrations/
#   ✅ Applies the migration to your local database
#   ✅ Regenerates Prisma Client with new types

# 3. Commit migration files to version control
git add prisma/migrations prisma/schema.prisma
git commit -m "feat: add email field to User model"
```

### Production Deployment

**Recommended Build Command:**

```bash
pnpm db:migrate && pnpm build
```

This ensures migrations are applied before the application starts.

**Platform-Specific Configuration:**

<details>
<summary><strong>Vercel</strong></summary>

Update build command in your Vercel project settings:

```
Build Command: pnpm db:migrate && pnpm build
Install Command: pnpm install
```

</details>

<details>
<summary><strong>Railway</strong></summary>

Update build settings in Railway:

```
Build Command: pnpm db:migrate && pnpm build
Start Command: pnpm start
```

</details>

<details>
<summary><strong>Render</strong></summary>

Update build command in render.yaml or dashboard:

```yaml
buildCommand: pnpm db:migrate && pnpm build
startCommand: pnpm start
```

</details>

### Migration Safety Guarantees

When you run `pnpm db:migrate` (which executes `prisma migrate deploy`):

- ✅ **Zero-downtime**: Skips already-applied migrations
- ✅ **Transactional**: Rolls back if any migration fails
- ✅ **Ordered**: Applies migrations chronologically
- ✅ **Tracked**: Records history in `_prisma_migrations` table
- ✅ **No data loss**: Safe for production databases
- ✅ **CI/CD friendly**: Never prompts for user input

### Migration Best Practices

**DO:**

- ✅ Use descriptive migration names: `add_user_role`, `create_metrics_index`
- ✅ Test migrations on a staging database before production
- ✅ Always commit migration files to version control
- ✅ Review generated SQL before applying to production
- ✅ Create backward-compatible changes when possible
- ✅ Use `prisma migrate dev` for all schema changes during development

**DON'T:**

- ❌ Never edit migration files after they've been committed
- ❌ Never use `db:push` in production (it can cause data loss)
- ❌ Never delete migration files from the migrations folder
- ❌ Never skip migrations in production deployments
- ❌ Don't make breaking schema changes without planning

### Common Scenarios

#### Scenario 1: Pulling Schema Changes from Git

When teammates add new migrations:

```bash
# Pull latest code
git pull

# Regenerate Prisma Client (TypeScript types)
pnpm db:generate

# Apply new migrations to your local database
pnpm prisma migrate dev
```

#### Scenario 2: Rapid Prototyping (Development Only)

For quick experimentation without creating migrations:

```bash
# Edit schema.prisma
# Then push directly (skips migration creation)
pnpm db:push

# WARNING: Only use in development! Can cause data loss!
```

#### Scenario 3: Rolling Back a Migration

If a migration causes issues:

```bash
# 1. Check migration status
pnpm prisma migrate status

# 2. Mark failed migration as rolled back
pnpm prisma migrate resolve --rolled-back "YYYYMMDDHHMMSS_failed_migration"

# 3. Fix the issue and create a new migration
pnpm prisma migrate dev --name fix_previous_issue
```

### Troubleshooting

**Issue: "Migration failed in production"**

```bash
# Check status
pnpm prisma migrate status

# Mark as rolled back
pnpm prisma migrate resolve --rolled-back "YYYYMMDDHHMMSS_migration"

# Fix schema, create new migration locally
pnpm prisma migrate dev --name fix_issue

# Commit and deploy
git add . && git commit -m "fix: resolve migration issue"
```

**Issue: "Database out of sync with migrations"**

```bash
# Check current status
pnpm prisma migrate status

# Reset database (DEVELOPMENT ONLY - loses all data!)
pnpm prisma migrate reset

# For production, you'll need to manually resolve discrepancies
```

**Issue: "Need to make urgent schema change in production"**

```bash
# 1. Create migration locally
pnpm prisma migrate dev --name urgent_fix

# 2. Test thoroughly on staging
# 3. Review generated SQL carefully
# 4. Commit and deploy
git add . && git commit -m "fix: urgent schema change"

# Your build command will apply the migration
```

### Advanced: Migration Customization

Sometimes Prisma generates migrations that need manual adjustment:

```bash
# Create migration without applying
pnpm prisma migrate dev --create-only --name custom_migration

# Edit the generated SQL file in prisma/migrations/
# Add custom SQL, indexes, or data transformations

# Apply the customized migration
pnpm prisma migrate dev
```

**Example: Adding a non-nullable column safely**

```sql
-- Migration file: prisma/migrations/XXXXXX_add_email/migration.sql

-- Step 1: Add column as nullable
ALTER TABLE "User" ADD COLUMN "email" TEXT;

-- Step 2: Backfill data
UPDATE "User" SET "email" = 'noreply@example.com' WHERE "email" IS NULL;

-- Step 3: Make it required
ALTER TABLE "User" ALTER COLUMN "email" SET NOT NULL;
```

### Further Reading

For complete migration workflow details, see:

- **CLAUDE.md**: Database Migration Workflow section
- **MIGRATION_GUIDE.md**: Step-by-step migration setup guide
- [Prisma Migrate Documentation](https://www.prisma.io/docs/concepts/components/prisma-migrate)

## Reference Documentation

For detailed information, refer to the official documentation:

- [Next.js Documentation](https://nextjs.org/docs)
- [tRPC Documentation](https://trpc.io/docs)
- [Prisma Documentation](https://www.prisma.io/docs)
- [WorkOS Documentation](https://workos.com/docs)
- [TanStack Query Documentation](https://tanstack.com/query/latest/docs)
- [Tailwind CSS Documentation](https://tailwindcss.com/docs)
- [shadcn/ui Documentation](https://ui.shadcn.com)

---

Now that your environment is set up, explore [Architecture Concepts](/docs/architecture/concepts) and [Patterns](/docs/architecture/patterns) to understand how everything works together.
