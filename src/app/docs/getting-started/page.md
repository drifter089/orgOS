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
