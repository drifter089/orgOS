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
        run: pnpm db:push
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
- Installs dependencies and Playwright browsers
- Runs all E2E tests
- Uploads test reports as artifacts

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

```json
// vercel.json
{
  "buildCommand": "pnpm build",
  "devCommand": "pnpm dev",
  "installCommand": "pnpm install",
  "framework": "nextjs",
  "regions": ["iad1"]
}
```

### Railway Deployment (Alternative)

**Setup:**

1. Connect GitHub repository
2. Add environment variables
3. Configure build settings:

```
Build Command: pnpm build
Start Command: pnpm start
```

**Auto-deploy on:**

- Push to main branch
- Merging pull requests

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
