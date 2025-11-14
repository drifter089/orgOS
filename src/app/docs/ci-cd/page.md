# CI/CD Pipeline

Complete guide to Continuous Integration and Continuous Deployment for this T3 Stack application.

---

## Overview

This project uses **GitHub Actions** for CI/CD workflows, automating testing, building, and deployment processes to ensure code quality and streamline releases.

**Current Workflows:**

- Playwright E2E Testing (on PR)
- Documentation Sync (daily automated)
- Type Checking & Linting (planned)
- Automated Deployments (planned)

---

## GitHub Actions Setup

### Workflow Files Location

```
.github/workflows/
├── playwright.yml         # E2E testing workflow
├── docs-sync.yml         # Daily documentation sync
├── ci.yml                # Lint, typecheck, build (planned)
└── deploy.yml            # Automated deployments (planned)
```

---

## E2E Testing Workflow

### Playwright Tests

**File:** `.github/workflows/playwright.yml`

```yaml
name: Playwright Tests
on:
  pull_request:
    branches: [main, develop]
  push:
    branches: [main, develop]

jobs:
  test:
    timeout-minutes: 60
    runs-on: ubuntu-latest

    services:
      postgres:
        image: postgres:16
        env:
          POSTGRES_USER: postgres
          POSTGRES_PASSWORD: postgres
          POSTGRES_DB: test_db
        options: >-
          --health-cmd pg_isready
          --health-interval 10s
          --health-timeout 5s
          --health-retries 5
        ports:
          - 5432:5432

    steps:
      - uses: actions/checkout@v4

      - uses: pnpm/action-setup@v2
        with:
          version: 10

      - uses: actions/setup-node@v4
        with:
          node-version: "20"
          cache: "pnpm"

      - name: Install dependencies
        run: pnpm install

      - name: Generate Prisma Client
        run: pnpm db:generate

      - name: Run database migrations
        run: pnpm db:migrate
        env:
          DATABASE_URL: postgresql://postgres:postgres@localhost:5432/test_db

      - name: Install Playwright browsers
        run: pnpm exec playwright install --with-deps

      - name: Run Playwright tests
        run: pnpm test:e2e
        env:
          DATABASE_URL: postgresql://postgres:postgres@localhost:5432/test_db

      - uses: actions/upload-artifact@v4
        if: always()
        with:
          name: playwright-report
          path: playwright-report/
          retention-days: 30
```

**Key Features:**

- Runs on every PR and push to main/develop
- Spins up PostgreSQL database for testing
- Applies migrations with `pnpm db:migrate` (production-safe)
- Installs dependencies and Playwright browsers
- Runs all E2E tests
- Uploads test reports as artifacts

> **Note**: We use `pnpm db:migrate` (not `db:push`) to ensure migrations are tested in CI exactly as they'll run in production.

---

## Documentation Sync Workflow

### Daily Sync

**File:** `.github/workflows/docs-sync.yml`

```yaml
name: Documentation Sync
on:
  schedule:
    - cron: "0 9 * * *" # Every day at 9:00 UTC
  workflow_dispatch: # Manual trigger

jobs:
  sync:
    runs-on: ubuntu-latest

    steps:
      - uses: actions/checkout@v4
        with:
          token: ${{ secrets.GITHUB_TOKEN }}

      - uses: pnpm/action-setup@v2
        with:
          version: 10

      - uses: actions/setup-node@v4
        with:
          node-version: "20"
          cache: "pnpm"

      - name: Install dependencies
        run: pnpm install

      - name: Run sync script
        run: pnpm sync:docs --fix

      - name: Check for changes
        id: verify-changes
        run: |
          git diff --quiet || echo "changed=true" >> $GITHUB_OUTPUT

      - name: Commit and push changes
        if: steps.verify-changes.outputs.changed == 'true'
        run: |
          git config user.name "github-actions[bot]"
          git config user.email "github-actions[bot]@users.noreply.github.com"
          git add .
          git commit -m "docs: automated documentation sync [skip ci]"
          git push
```

**Key Features:**

- Runs daily at 9:00 UTC
- Can be triggered manually via GitHub UI
- Syncs ROADMAP, CHANGELOG, and CLAUDE.md
- Auto-commits changes if detected
- Skips CI on sync commits

---

## Code Quality Workflow (Planned)

### Lint, Typecheck, Build

**File:** `.github/workflows/ci.yml`

```yaml
name: CI
on:
  pull_request:
    branches: [main, develop]
  push:
    branches: [main, develop]

jobs:
  quality:
    runs-on: ubuntu-latest

    steps:
      - uses: actions/checkout@v4

      - uses: pnpm/action-setup@v2
        with:
          version: 10

      - uses: actions/setup-node@v4
        with:
          node-version: "20"
          cache: "pnpm"

      - name: Install dependencies
        run: pnpm install

      - name: Run ESLint
        run: pnpm lint

      - name: Run TypeScript check
        run: pnpm typecheck

      - name: Build application
        run: pnpm build
        env:
          SKIP_ENV_VALIDATION: true
```

**When to Enable:**

- Once all linting errors are fixed
- After codebase reaches stable state
- Before enabling branch protection rules

---

## Deployment Workflows

### Vercel Deployment

**Automatic on Vercel:**

Vercel automatically deploys:

- **Production:** Every push to `main` branch
- **Preview:** Every pull request

**Environment Variables:**

Set in Vercel dashboard:

```
DATABASE_URL=<production-db-url>
DIRECT_URL=<direct-db-url>
WORKOS_CLIENT_ID=<client-id>
WORKOS_API_KEY=<api-key>
WORKOS_REDIRECT_URI=<redirect-uri>
WORKOS_COOKIE_PASSWORD=<cookie-password>
```

**Build Configuration:**

Update your Vercel project settings to include database migrations:

```json
// vercel.json
{
  "buildCommand": "pnpm db:migrate && pnpm build",
  "devCommand": "pnpm dev",
  "installCommand": "pnpm install",
  "framework": "nextjs",
  "regions": ["iad1"]
}
```

Or configure via Vercel Dashboard:

- **Build Command:** `pnpm db:migrate && pnpm build`
- **Install Command:** `pnpm install`
- **Output Directory:** `.next`

> **Important**: The build command runs `pnpm db:migrate` before building to ensure all pending migrations are applied. This is production-safe and zero-downtime.

### Railway Deployment (Alternative)

**Setup:**

1. Connect GitHub repository
2. Add environment variables (same as Vercel)
3. Configure build settings:

```
Build Command: pnpm db:migrate && pnpm build
Start Command: pnpm start
```

**Auto-deploy on:**

- Push to main branch
- Merging pull requests

> **Note**: Railway will run migrations before each deployment, ensuring database schema stays in sync with application code.

---

## Database Migration Strategy

### Production Deployment Flow

When deploying schema changes to production, follow this workflow:

```mermaid
graph LR
    A[Edit Schema] --> B[prisma migrate dev]
    B --> C[Test Locally]
    C --> D[Commit Migration]
    D --> E[Push to GitHub]
    E --> F[CI Tests Pass]
    F --> G[Deploy to Production]
    G --> H[db:migrate runs]
    H --> I[Build Application]
    I --> J[Start Server]
```

### Migration Lifecycle

```bash
# Developer Workflow (Local)
1. Edit prisma/schema.prisma
2. pnpm prisma migrate dev --name descriptive_name
3. Test migration locally
4. Review generated SQL in prisma/migrations/
5. git add prisma/migrations prisma/schema.prisma
6. git commit -m "feat: add new field"
7. git push

# CI/CD Workflow (Automated)
8. GitHub Actions runs tests with pnpm db:migrate
9. Vercel/Railway detects new commit
10. Build process runs: pnpm db:migrate && pnpm build
11. Migrations applied to production database
12. Application builds with updated schema
13. New version deployed
```

### Zero-Downtime Guarantees

The `pnpm db:migrate` command provides several safety guarantees:

| Feature             | Behavior                                | Benefit                    |
| ------------------- | --------------------------------------- | -------------------------- |
| **Idempotent**      | Skips already-applied migrations        | Safe to run multiple times |
| **Transactional**   | Wraps each migration in a transaction   | Rolls back on failure      |
| **Ordered**         | Applies migrations chronologically      | Predictable state          |
| **Non-interactive** | Never prompts for input                 | CI/CD friendly             |
| **Tracked**         | Records history in `_prisma_migrations` | Audit trail                |

### Handling Migration Conflicts

If multiple developers create migrations simultaneously:

```bash
# Developer A creates migration_001
# Developer B creates migration_002
# Both push to GitHub

# When Developer A pulls:
git pull
pnpm prisma migrate dev  # Applies B's migration locally

# When deploying to production:
pnpm db:migrate  # Applies both migrations in order
```

Prisma automatically handles migration ordering based on timestamps.

### Rollback Strategy

Prisma Migrate doesn't support automatic rollbacks. To revert changes:

**Option 1: Forward-only Migration**

```bash
# Create a new migration that undoes the change
pnpm prisma migrate dev --name revert_previous_change

# Edit the generated SQL to reverse the operation
# Example: If you added a column, drop it
ALTER TABLE "User" DROP COLUMN "email";

# Apply and deploy
git add . && git commit -m "revert: remove email field"
```

**Option 2: Database Restore (Emergency)**

```bash
# Restore from backup (production database snapshot)
# Update application code to match restored schema
# Mark failed migrations as rolled back
pnpm prisma migrate resolve --rolled-back "XXXXXX_failed_migration"
```

### Testing Migrations

**Local Testing:**

```bash
# Test migration locally
pnpm prisma migrate dev --name test_migration

# Verify schema is correct
pnpm db:studio

# Test with application
pnpm dev

# If issues found, reset and fix
pnpm prisma migrate reset
```

**Staging Testing:**

```bash
# Deploy to staging first
git push origin main:staging

# Staging build runs:
pnpm db:migrate && pnpm build

# Verify in staging environment
# Check logs for migration errors
# Test application functionality

# If successful, promote to production
git push origin main
```

### Migration Best Practices for CI/CD

1. **Always Test in CI Before Production**
   - GitHub Actions applies migrations with `pnpm db:migrate`
   - Same command used in production
   - Catches migration issues early

2. **Use Staging Environment**
   - Test migrations on production-like data
   - Verify performance with realistic data volumes
   - Check for edge cases

3. **Review Generated SQL**
   - Always review migration SQL before merging
   - Look for destructive operations (DROP, TRUNCATE)
   - Ensure indexes are created for large tables

4. **Coordinate Breaking Changes**
   - Plan schema changes that require code changes
   - Deploy in phases: (1) Make column optional, (2) Update code, (3) Make required
   - Use feature flags for gradual rollouts

5. **Monitor Migration Duration**
   - Long-running migrations can timeout in CI/CD
   - Consider data migrations separately
   - Use `CONCURRENTLY` for index creation in Postgres

### Example Migration Scenarios

**Scenario: Adding a New Model**

```bash
# Edit schema.prisma - add new model
model Organization {
  id        String   @id @default(cuid())
  name      String
  createdAt DateTime @default(now())
}

# Create migration
pnpm prisma migrate dev --name add_organization_model

# Commit and deploy
git add . && git commit -m "feat: add Organization model"
```

**Scenario: Adding a Required Field**

```bash
# Step 1: Add field as optional
model User {
  id    String  @id
  email String?  # Optional first
}

pnpm prisma migrate dev --name add_email_optional

# Step 2: Backfill data in production
# Step 3: Make field required
model User {
  id    String @id
  email String  # Now required
}

pnpm prisma migrate dev --name make_email_required
```

**Scenario: Renaming a Field**

```bash
# Prisma treats rename as drop + add (data loss!)
# Instead, create new field and migrate data:

# Step 1: Add new field
model User {
  id       String @id
  oldName  String
  newName  String?
}

pnpm prisma migrate dev --name add_new_name_field

# Step 2: Deploy and run data migration
# Copy oldName to newName in application code

# Step 3: Remove old field
model User {
  id      String @id
  newName String
}

pnpm prisma migrate dev --name remove_old_name_field
```

### Troubleshooting CI/CD Migration Issues

**Issue: Migration timeout in CI**

```yaml
# Increase timeout in GitHub Actions
jobs:
  deploy:
    timeout-minutes: 30 # Default is 60
```

**Issue: Migration works locally but fails in CI**

```bash
# Check DATABASE_URL format
# Ensure connection pooling is configured
DATABASE_URL="postgresql://user:pass@host:5432/db?schema=public&connect_timeout=30"
```

**Issue: Migration applied in CI but not in production**

```bash
# Check if build command includes migration
# Vercel: pnpm db:migrate && pnpm build
# Railway: pnpm db:migrate && pnpm build

# Verify environment variables are set correctly
```

**Issue: Concurrent deployments causing migration conflicts**

```yaml
# Add concurrency control in GitHub Actions
concurrency:
  group: production-deploy
  cancel-in-progress: false # Don't cancel running deployments
```

---

## Branch Protection Rules

### Recommended Settings

**For `main` branch:**

```yaml
Require pull request reviews: Yes
  - Required approvals: 1

Require status checks to pass: Yes
  - Playwright Tests
  - ESLint
  - TypeScript Check
  - Build

Require branches to be up to date: Yes

Require conversation resolution: Yes

Do not allow bypassing settings: Yes
```

**For `develop` branch:**

```yaml
Require pull request reviews: No (allow direct commits for rapid development)

Require status checks to pass: Yes
  - Playwright Tests

Require branches to be up to date: No
```

---

## Release Process

### Semantic Versioning

Follow [semver](https://semver.org):

```
MAJOR.MINOR.PATCH

1.0.0 → 1.0.1 (patch: bug fixes)
1.0.1 → 1.1.0 (minor: new features, backwards compatible)
1.1.0 → 2.0.0 (major: breaking changes)
```

### Release Workflow

1. **Create release branch:**

   ```bash
   git checkout -b release/v1.2.0
   ```

2. **Update version:**

   ```bash
   # Update package.json version
   pnpm version 1.2.0 --no-git-tag-version
   ```

3. **Update CHANGELOG.md:**

   ```markdown
   ## [1.2.0] - 2025-11-05

   ### Added

   - Feature X
   - Feature Y

   ### Fixed

   - Bug A
   - Bug B
   ```

4. **Create PR to main:**

   ```bash
   git add .
   git commit -m "chore(release): v1.2.0"
   git push origin release/v1.2.0
   ```

5. **After merge, create Git tag:**

   ```bash
   git checkout main
   git pull
   git tag -a v1.2.0 -m "Release v1.2.0"
   git push origin v1.2.0
   ```

6. **Create GitHub Release:**
   - Go to GitHub Releases
   - Click "Draft a new release"
   - Select tag v1.2.0
   - Copy changelog content
   - Publish release

---

## Environment-Specific Configurations

### Development

```env
NODE_ENV=development
DATABASE_URL=postgresql://user:pass@localhost:5432/dev_db
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

### Staging

```env
NODE_ENV=production
DATABASE_URL=<staging-db-url>
NEXT_PUBLIC_APP_URL=https://staging.example.com
```

### Production

```env
NODE_ENV=production
DATABASE_URL=<production-db-url>
NEXT_PUBLIC_APP_URL=https://example.com
```

---

## Monitoring & Logs

### Vercel Logs

Access via Vercel Dashboard:

- Real-time function logs
- Build logs
- Error tracking

### PostgreSQL Monitoring

**Connection Pooling:**

- Use Prisma Accelerate or PgBouncer
- Monitor connection counts
- Set appropriate pool size

**Query Performance:**

```sql
-- Enable slow query logging
ALTER SYSTEM SET log_min_duration_statement = 1000;  -- 1 second
```

### Error Tracking

**Recommended:** Sentry Integration

```bash
pnpm add @sentry/nextjs
```

```javascript
// next.config.js
const { withSentryConfig } = require("@sentry/nextjs");

module.exports = withSentryConfig(
  {
    // ... your config
  },
  {
    silent: true,
    org: "your-org",
    project: "your-project",
  },
);
```

---

## Troubleshooting

### Build Failures

**Issue: Environment variable validation fails**

```bash
# Solution: Skip validation in CI
export SKIP_ENV_VALIDATION=true
pnpm build
```

**Issue: TypeScript errors in CI but not locally**

```bash
# Ensure same TypeScript version
pnpm add -D typescript@5.8.2

# Clear cache and rebuild
rm -rf .next node_modules/.cache
pnpm install
pnpm build
```

**Issue: Prisma client not generated**

```bash
# Add to CI workflow before build
pnpm db:generate
```

**Issue: Migrations not applied in CI**

```yaml
# Ensure migration step is before tests
- name: Apply database migrations
  run: pnpm db:migrate
  env:
    DATABASE_URL: ${{ secrets.DATABASE_URL }}

- name: Run tests
  run: pnpm test:e2e
```

### Deployment Failures

**Issue: Database connection timeout**

```env
# Increase timeout in DATABASE_URL
postgresql://user:pass@host:5432/db?connect_timeout=30
```

**Issue: Missing environment variables**

```bash
# Verify all required vars are set
pnpm env:check  # (custom script to validate)
```

---

## Best Practices

### 1. Small, Frequent Commits

```bash
# ✅ Good
git commit -m "feat(auth): add login form validation"

# ❌ Avoid
git commit -m "misc changes"
```

### 2. Meaningful PR Titles

```
feat: Add user dashboard with analytics
fix: Resolve race condition in cache invalidation
docs: Update tRPC integration guide
```

### 3. Test Before Merge

```bash
# Run full test suite locally
pnpm check
pnpm test:e2e
pnpm build
```

### 4. Review Logs Regularly

- Check Vercel deployment logs weekly
- Monitor error rates in production
- Review slow queries monthly

### 5. Keep Dependencies Updated

```bash
# Check for updates
pnpm outdated

# Update dependencies
pnpm update

# Update major versions carefully
pnpm add next@latest --save-exact
```

---

## Resources

- [GitHub Actions Documentation](https://docs.github.com/en/actions)
- [Vercel Deployment Docs](https://vercel.com/docs)
- [Railway Deployment Guide](https://docs.railway.app)
- [Semantic Versioning](https://semver.org)
- [Keep a Changelog](https://keepachangelog.com)
