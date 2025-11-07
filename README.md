# ORG-OS

**Your organizational operating system** - Streamline team management, workflows, and collaboration.

Built with the [T3 Stack](https://create.t3.gg/) for a modern, type-safe, and performant experience.

## Features

- **Team Management** - Organize and manage teams within your organization
- **Workflow Builder** - Visual workflow builder powered by React Flow
- **Role-Based Access** - Fine-grained permission control with custom roles
- **Task Management** - Track and manage tasks across your organization
- **Metrics & Analytics** - Monitor organizational performance
- **Modern UI** - Beautiful, responsive design with shadcn/ui components

## Tech Stack

- **[Next.js 15](https://nextjs.org)** - React framework with App Router
- **[tRPC](https://trpc.io)** - End-to-end typesafe APIs
- **[Prisma](https://prisma.io)** - Database ORM
- **[WorkOS AuthKit](https://workos.com)** - Authentication provider
- **[TanStack Query](https://tanstack.com/query)** - Data fetching and caching
- **[Tailwind CSS](https://tailwindcss.com)** - Utility-first CSS framework
- **[shadcn/ui](https://ui.shadcn.com)** - Beautiful component library
- **[React Flow](https://reactflow.dev)** - Workflow visualization

## Getting Started

### Prerequisites

- Node.js 18+
- pnpm (recommended)
- PostgreSQL database

### Installation

1. Clone the repository:

```bash
git clone https://github.com/drifter089/orgOS.git
cd orgOS
```

2. Install dependencies:

```bash
pnpm install
```

3. Set up environment variables:

```bash
cp .env.example .env
```

Edit `.env` with your database credentials and WorkOS configuration.

4. Generate Prisma client and push schema:

```bash
pnpm db:generate
pnpm db:push
```

5. Start the development server:

```bash
pnpm dev
```

Open [http://localhost:3000](http://localhost:3000) to see the application.

## Development Commands

```bash
# Development
pnpm dev              # Start dev server with Turbo
pnpm build            # Build for production
pnpm start            # Start production server

# Code Quality
pnpm check            # Run linting and type checking
pnpm lint             # Run ESLint
pnpm lint:fix         # Auto-fix ESLint issues
pnpm typecheck        # Run TypeScript compiler check
pnpm format:check     # Check formatting
pnpm format:write     # Format code

# Database
pnpm db:generate      # Generate Prisma client
pnpm db:push          # Push schema changes
pnpm db:migrate       # Run migrations
pnpm db:studio        # Open Prisma Studio

# Testing
pnpm exec playwright test              # Run tests
pnpm exec playwright test --ui         # Run tests in UI mode
```

## Documentation

Comprehensive documentation is available in the `/docs` route of the application, including:

- Architecture concepts (Server/Client Components, TanStack Query, tRPC)
- Integration patterns and best practices
- Testing guide
- CI/CD setup

## Contributing

Contributions are welcome! Please check out the [GitHub repository](https://github.com/drifter089/orgOS) for issues and contribution guidelines.

## License

This project is built with the T3 Stack and follows its open-source philosophy.
