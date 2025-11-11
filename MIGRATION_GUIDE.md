# Database Migration Guide

## 🚨 Critical: Your Current Situation

Your **production database has tables** but **no migration history**. This happened because you used `db:push` (which directly syncs the schema) instead of migrations.

## ✅ Step-by-Step: Fix This Now

### 1. Create Baseline Migration (One-Time Setup)

Run this **locally** when your database connection is working:

```bash
# Step 1: Create migration files WITHOUT applying them (since tables already exist)
pnpm prisma migrate dev --create-only --name init

# This creates: prisma/migrations/YYYYMMDDHHMMSS_init/migration.sql

# Step 2: Mark this migration as "already applied" (because your tables already exist)
pnpm prisma migrate resolve --applied "YYYYMMDDHHMMSS_init"

# Replace YYYYMMDDHHMMSS_init with the actual folder name created in Step 1

# Step 3: Commit to git
git add prisma/migrations
git commit -m "chore: add baseline database migrations"
git push
```

### 2. Update Production Build Command

**Choose ONE of these options:**

#### Option A: Vercel/Netlify (Platform Settings)

Update your deployment platform:

- **Build Command:** `pnpm db:migrate && pnpm build`
- **Start Command:** `pnpm start`

#### Option B: Railway/Render (Platform Settings)

Update your deployment platform:

- **Build Command:** `pnpm db:migrate && pnpm build`
- **Start Command:** `pnpm start`

#### Option C: Manual Deployment

```bash
pnpm db:migrate  # Apply migrations first
pnpm build       # Then build
pnpm start       # Then start
```

## 📝 Future Workflow: Making Schema Changes

Whenever you need to change your database schema:

```bash
# 1. Edit prisma/schema.prisma
#    (Add/remove fields, models, etc.)

# 2. Create and apply migration
pnpm prisma migrate dev

#    You'll be prompted for a name: add_user_email, make_field_optional, etc.
#
#    This automatically:
#    ✅ Creates SQL migration files
#    ✅ Applies migration to your local DB
#    ✅ Regenerates Prisma Client

# 3. Commit everything
git add prisma/migrations prisma/schema.prisma
git commit -m "feat: add email field to User model"
git push

# 4. Deploy to production
#    Your build command (pnpm db:migrate && pnpm build) will:
#    ✅ Apply the new migration
#    ✅ Build your app with updated schema
```

## 🛡️ Migration Safety Guarantees

When you use `pnpm db:migrate` (prisma migrate deploy):

- ✅ **Zero-downtime**: Skips already-applied migrations
- ✅ **Transactional**: Rolls back if any migration fails
- ✅ **Ordered**: Applies migrations in chronological order
- ✅ **Tracked**: Records history in `_prisma_migrations` table
- ✅ **No data loss**: Safe to run on production databases
- ✅ **CI/CD friendly**: Never prompts for user input

## ⚠️ What NOT to Do

| ❌ DON'T                              | ✅ DO INSTEAD                                         |
| ------------------------------------- | ----------------------------------------------------- |
| `pnpm db:push` in production          | `pnpm prisma migrate dev` (locally) → commit → deploy |
| Edit migration files after committing | Create a new migration to fix issues                  |
| Delete migrations folder              | Keep all migrations in version control                |
| Skip migrations in production         | Always run `pnpm db:migrate` before build             |

## 🔍 Useful Commands

```bash
# Check which migrations are pending/applied
pnpm prisma migrate status

# View your database visually
pnpm db:studio

# Generate Prisma Client after pulling changes
pnpm db:generate

# See migration history in database
pnpm prisma migrate status
```

## 🆘 Emergency: Fix Failed Migration

If a migration fails in production:

```bash
# 1. Check what happened
pnpm prisma migrate status

# 2. Mark failed migration as rolled back
pnpm prisma migrate resolve --rolled-back "YYYYMMDDHHMMSS_failed_migration"

# 3. Fix the issue locally, create new migration
pnpm prisma migrate dev --name fix_issue

# 4. Deploy the fix
git push  # Your build command will apply the new migration
```

## 📊 Production Deployment Checklist

Before deploying schema changes:

- [ ] Created migration locally with `pnpm prisma migrate dev`
- [ ] Tested migration on local database
- [ ] Committed migration files to git
- [ ] (Optional) Tested on staging environment
- [ ] Production build command includes `pnpm db:migrate`
- [ ] Verified no destructive changes (dropping columns with data)

## 🎯 Quick Reference

**When database connection works, run this ONCE:**

```bash
pnpm prisma migrate dev --create-only --name init
pnpm prisma migrate resolve --applied "YYYYMMDDHHMMSS_init"
git add prisma/migrations && git commit -m "chore: baseline migrations" && git push
```

**Every time you change schema:**

```bash
pnpm prisma migrate dev  # Creates migration + applies + generates client
git add . && git commit -m "feat: schema change" && git push
```

**Production build command:**

```bash
pnpm db:migrate && pnpm build
```

---

✨ **You're all set!** Your database migrations are now production-safe and won't cause data loss.
