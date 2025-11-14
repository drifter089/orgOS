<div align="center">
  <h1>🏢 ORG-OS</h1>
  <p><strong>Your Organizational Operating System</strong></p>
  <p>A modern, visual platform for team management, role organization, and workflow orchestration.</p>

[![Built with T3 Stack](https://img.shields.io/badge/Built%20with-T3%20Stack-blueviolet)](https://create.t3.gg/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.9-blue)](https://www.typescriptlang.org/)
[![Next.js](https://img.shields.io/badge/Next.js-15.5-black)](https://nextjs.org/)
[![License](https://img.shields.io/badge/license-MIT-green)](LICENSE)

</div>

---

## 📖 Overview

ORG-OS is a comprehensive organizational management platform that helps teams visualize, structure, and manage their operations through an intuitive interface. Built on the T3 Stack, it combines type safety, performance, and developer experience with powerful visual tools for organizational design.

### Key Highlights

- 🎨 **Visual Team Canvas** - Drag-and-drop interface for creating and organizing team roles using React Flow
- 🔄 **Workflow Builder** - Design and execute custom workflows with visual node-based editor
- 📊 **Metrics Dashboard** - Track KPIs and performance indicators across roles and teams
- 🔐 **Enterprise Authentication** - WorkOS-powered auth with organization support
- 🌐 **Multi-tenant Architecture** - Full organization isolation and access control
- 📱 **Modern UI/UX** - Beautiful, responsive design with shadcn/ui components

---

## ✨ Features

### Team Management System

- **Visual Team Canvas**: Create organizational structures with an interactive React Flow canvas
- **Role Management**: Define roles with purposes, metrics, and user assignments
- **Dynamic Connections**: Link roles to show reporting relationships and workflows
- **Real-time Sync**: Auto-save canvas changes with optimistic updates
- **Color Coding**: Visual organization with customizable role colors

### Workflow Builder

- **Visual Workflow Editor**: Build complex workflows using drag-and-drop nodes
- **Multiple Node Types**: Initial, Transform, Branch, Join, and Output nodes
- **Auto Layout**: ELK.js-powered automatic graph layout
- **Workflow Execution**: Run workflows with visual execution feedback
- **Custom Edges**: Interactive edge buttons for adding/removing connections

### Metrics & Analytics

- **KPI Tracking**: Define and track organizational metrics
- **Multiple Metric Types**: Percentage, number, duration, and rate metrics
- **Role Association**: Link metrics to specific roles
- **Mock Data Generation**: AI-powered mock data for testing and demos
- **Performance Monitoring**: Track current vs target values

### Integration Platform

- **Nango Integration**: OAuth-based connections to external services
- **Webhook Support**: Real-time sync with external platforms
- **API Management**: Manage integrations through intuitive UI

### Documentation System

- **MDX-Powered Docs**: Interactive documentation with live code examples
- **Mermaid Diagrams**: Visual architecture and flow diagrams
- **Live Code Snippets**: Syntax-highlighted code with copy functionality
- **Architecture Guides**: Comprehensive guides on concepts and patterns

---

## 🛠️ Tech Stack

### Core Framework

- **[Next.js 15.5](https://nextjs.org)** - React framework with App Router and Server Components
- **[React 19](https://react.dev)** - Latest React with concurrent features
- **[TypeScript 5.9](https://www.typescriptlang.org/)** - Full type safety across the stack

### Backend

- **[tRPC 11](https://trpc.io)** - End-to-end typesafe APIs without code generation
- **[Prisma 6](https://prisma.io)** - Type-safe ORM with PostgreSQL
- **[Zod](https://zod.dev)** - Runtime type validation

### Frontend & UI

- **[Tailwind CSS 4](https://tailwindcss.com)** - Utility-first CSS framework
- **[shadcn/ui](https://ui.shadcn.com)** - High-quality component library
- **[Radix UI](https://www.radix-ui.com/)** - Accessible component primitives
- **[Lucide Icons](https://lucide.dev)** - Beautiful & consistent icons

### Data Fetching & State

- **[TanStack Query 5](https://tanstack.com/query)** - Powerful data fetching and caching
- **[Zustand](https://zustand-demo.pmnd.rs/)** - Lightweight state management
- **[React Hook Form](https://react-hook-form.com/)** - Performant form handling

### Visualization & Animation

- **[React Flow](https://reactflow.dev)** - Node-based workflow and diagram builder
- **[ELK.js](https://eclipse.dev/elk/)** - Automatic graph layout
- **[GSAP](https://greensock.com/gsap/)** - Professional-grade animations
- **[Mermaid](https://mermaid.js.org/)** - Diagram and flowchart generation

### Authentication & Authorization

- **[WorkOS AuthKit](https://workos.com/authkit)** - Enterprise-grade authentication
- **[Iron Session](https://github.com/vvo/iron-session)** - Secure session management

### Integrations

- **[Nango](https://www.nango.dev/)** - OAuth and API integration platform

### Developer Experience

- **[ESLint 9](https://eslint.org/)** - Code linting with TypeScript support
- **[Prettier](https://prettier.io/)** - Code formatting
- **[Husky](https://typicode.github.io/husky/)** - Git hooks
- **[Playwright](https://playwright.dev/)** - End-to-end testing

### Documentation

- **[MDX](https://mdxjs.com/)** - Markdown with JSX components
- **[Rehype](https://github.com/rehypejs/rehype)** - HTML processor for rich code blocks
- **[Shiki](https://shiki.matsu.io/)** - Syntax highlighting

---

## 🚀 Getting Started

### Prerequisites

Before you begin, ensure you have the following installed:

- **Node.js 18+** ([Download](https://nodejs.org/))
- **pnpm 9+** (Install via `npm install -g pnpm`)
- **PostgreSQL 14+** ([Download](https://www.postgresql.org/download/))
- **WorkOS Account** ([Sign up](https://workos.com/))

### Installation

#### 1. Clone the Repository

```bash
git clone https://github.com/drifter089/orgOS.git
cd orgOS
```

#### 2. Install Dependencies

```bash
pnpm install
```

#### 3. Set Up Environment Variables

Copy the example environment file:

```bash
cp .env.example .env
```

Edit `.env` and configure the following variables:

##### Database Configuration

```env
# PostgreSQL connection string
# Format: postgresql://username:password@host:port/database
DATABASE_URL="postgresql://postgres:password@localhost:5432/org_os"
```

##### WorkOS Authentication (Required)

Create a WorkOS account and get your credentials:

1. Sign up at [workos.com](https://workos.com/)
2. Create a new application
3. Get your API key and Client ID from the dashboard

```env
# WorkOS API Key (starts with sk_test_ or sk_live_)
WORKOS_API_KEY="sk_test_..."

# WorkOS Client ID (starts with client_)
WORKOS_CLIENT_ID="client_..."

# Cookie encryption key (generate with: openssl rand -base64 32)
WORKOS_COOKIE_PASSWORD="your-32-character-secret-key-here"

# OAuth redirect URI (must match WorkOS dashboard settings)
NEXT_PUBLIC_WORKOS_REDIRECT_URI="http://localhost:3000/api/callback"
```

##### Nango Integration Platform (Optional)

For OAuth integrations with external services:

1. Sign up at [nango.dev](https://www.nango.dev/)
2. Get your secret key from Environment Settings

```env
# Nango Secret Key
NANGO_SECRET_KEY_DEV="nango_secret_key_..."

# Nango Webhook Secret (optional, for production)
# NANGO_WEBHOOK_SECRET="your_webhook_secret_here"
```

##### Test User Credentials (For Testing)

Create a test user in WorkOS Dashboard and add credentials:

```env
TEST_USER_EMAIL="test-user@example.com"
TEST_USER_PASSWORD="test-password"
```

##### WorkOS Directory Sync (Optional)

Only needed for SSO-based organizations:

```env
# WORKOS_DIR_ID="directory_..."
```

#### 4. Set Up the Database

Generate Prisma client and push schema to database:

```bash
# Generate Prisma client
pnpm db:generate

# Push schema to database (development)
pnpm db:push

# Or run migrations (production)
pnpm db:migrate
```

#### 5. Seed the Database (Optional)

Populate with sample metrics:

```bash
pnpm db:seed
```

#### 6. Start the Development Server

```bash
pnpm dev
```

The application will be available at [http://localhost:3000](http://localhost:3000)

---

## 📦 Development Workflow

### Available Commands

#### Development

```bash
pnpm dev              # Start development server with Turbo
pnpm build            # Build for production
pnpm start            # Start production server
pnpm preview          # Build and preview production
```

#### Code Quality

```bash
pnpm check            # Run lint + typecheck together
pnpm lint             # Run ESLint
pnpm lint:fix         # Auto-fix ESLint issues
pnpm typecheck        # Run TypeScript checks
pnpm format:check     # Check code formatting
pnpm format:write     # Format code with Prettier
```

#### Database

```bash
pnpm db:generate      # Generate Prisma client
pnpm db:push          # Push schema changes (dev)
pnpm db:migrate       # Deploy migrations (prod)
pnpm db:studio        # Open Prisma Studio GUI
pnpm db:seed          # Seed sample data
```

#### Testing

```bash
# Run all tests
pnpm exec playwright test

# Run specific test file
pnpm exec playwright test tests/auth-authenticated.spec.ts

# Run in specific browser
pnpm exec playwright test --project=chromium

# Interactive UI mode
pnpm exec playwright test --ui

# Debug mode
pnpm exec playwright test --debug

# View test report
pnpm exec playwright show-report

# Generate test code
pnpm exec playwright codegen
```

#### Documentation

```bash
pnpm sync:docs        # Validate documentation
pnpm sync:docs:fix    # Auto-fix version numbers
pnpm ai-sync:docs     # AI-powered doc sync
```

### Git Workflow

The project uses Husky for git hooks:

- **Pre-commit**: Auto-format and lint staged files
- **Commit**: Validates commit messages
- **Pre-push**: Runs type checks

---

## 📂 Project Structure

```
orgOS/
├── prisma/
│   ├── schema.prisma          # Database schema
│   └── seed.ts                # Database seeding
├── public/                    # Static assets
├── scripts/                   # Build and sync scripts
├── src/
│   ├── app/                   # Next.js app directory
│   │   ├── api/              # API routes (WorkOS callbacks)
│   │   ├── docs/             # MDX documentation
│   │   ├── teams/            # Team management pages
│   │   │   └── [teamId]/    # Team canvas & role management
│   │   ├── workflow/         # Visual workflow builder
│   │   ├── metric/           # Metrics dashboard
│   │   ├── org/              # Organization settings
│   │   └── layout.tsx        # Root layout
│   ├── components/           # Shared React components
│   │   ├── ui/              # shadcn/ui components
│   │   └── navbar/          # Navigation components
│   ├── hooks/                # Custom React hooks
│   ├── lib/                  # Utility functions
│   ├── providers/            # React context providers
│   ├── server/               # Server-side code
│   │   ├── api/             # tRPC routers
│   │   └── db.ts            # Prisma client
│   ├── styles/               # Global styles
│   ├── trpc/                 # tRPC client setup
│   ├── env.js                # Environment validation
│   └── middleware.ts         # Auth middleware
├── tests/                     # E2E tests
├── .env.example              # Environment template
├── CLAUDE.md                 # AI assistant guide
└── README.md                 # This file
```

### Key Directories

- **`src/app/teams/[teamId]/`**: Team canvas with React Flow integration
  - `_components/`: Role nodes, edges, dialogs
  - `store/`: Zustand state management
  - `hooks/`: Auto-save and layout hooks
  - `utils/`: Canvas serialization utilities

- **`src/app/workflow/`**: Visual workflow builder
  - `components/nodes/`: Node type implementations
  - `components/edges/`: Edge components with buttons
  - `hooks/`: Layout and execution logic
  - `store/`: Workflow state management

- **`src/server/api/routers/`**: tRPC API routes
  - `team.ts`: Team CRUD operations
  - `role.ts`: Role management
  - `metric.ts`: Metrics and KPIs
  - `integration.ts`: Nango integrations

---

## 🧪 Testing

### End-to-End Testing with Playwright

The project uses Playwright for comprehensive E2E testing:

#### Test Setup

1. Ensure test user is created in WorkOS Dashboard
2. Add credentials to `.env`:

```env
TEST_USER_EMAIL="test-user@example.com"
TEST_USER_PASSWORD="test-password"
```

#### Running Tests

```bash
# Run all tests
pnpm exec playwright test

# Run with UI
pnpm exec playwright test --ui

# Run specific test
pnpm exec playwright test tests/auth-authenticated.spec.ts

# Debug tests
pnpm exec playwright test --debug
```

#### Test Files

- `tests/auth-authenticated.spec.ts`: Authenticated user flows
- `tests/global-setup.ts`: Authentication setup
- `tests/fixtures/`: Custom test fixtures

---

## 📚 Documentation

### In-App Documentation

Visit `/docs` in the running application for comprehensive documentation:

- **Architecture Concepts**: Server/Client components, TanStack Query, tRPC patterns
- **Integration Patterns**: Server prefetching, cache strategies, auth flow
- **Changelog**: Feature updates and changes
- **Roadmap**: Planned features and improvements

### Key Documentation Files

- **`CLAUDE.md`**: Developer guidance for AI assistants
- **`README.md`**: This file
- **`scripts/README.md`**: Documentation sync system guide

---

## 🏗️ Architecture

### Authentication Flow

```
User Request → Next.js Middleware → WorkOS AuthKit
    ↓
Protected Routes → tRPC Context → Protected Procedures
    ↓
Organization Validation → Database Query → Response
```

### Data Flow

```
Server Component → tRPC Server Caller (direct)
    ↓
Prefetch Data → Dehydrate State → Client
    ↓
Client Component → TanStack Query → Background Refetch
```

### Multi-Tenancy

- Organization-based isolation via WorkOS
- All queries filtered by organization ID
- Helper utilities for access control
- Team-level permissions

---

## 🎨 UI Components

### Design System

- **Components**: shadcn/ui with Radix UI primitives
- **Styling**: Tailwind CSS 4 with custom design tokens
- **Icons**: Lucide React for consistent iconography
- **Animations**: GSAP for complex animations
- **Themes**: Dark/Light mode with next-themes

### Key UI Features

- Responsive layouts with mobile support
- Accessible components (WCAG compliant)
- Toast notifications via Sonner
- Dialog and modal systems
- Form validation with Zod
- Auto-complete and search

---

## 🔒 Security

- **Authentication**: WorkOS enterprise auth with MFA support
- **Authorization**: Organization-based access control
- **Session Management**: Encrypted iron-session cookies
- **Input Validation**: Zod schemas on client and server
- **SQL Injection**: Protected via Prisma ORM
- **XSS Protection**: React's built-in sanitization
- **CSRF**: SameSite cookie policies

---

## 🌐 Deployment

### Vercel (Recommended)

1. Push code to GitHub
2. Import project in Vercel
3. Add environment variables
4. Deploy

### Docker

```bash
# Build image
docker build -t org-os .

# Run container
docker run -p 3000:3000 --env-file .env org-os
```

### Environment Checklist

- ✅ Set `DATABASE_URL` to production database
- ✅ Configure WorkOS production keys
- ✅ Set secure `WORKOS_COOKIE_PASSWORD`
- ✅ Update `NEXT_PUBLIC_WORKOS_REDIRECT_URI`
- ✅ Configure Nango production keys (if using)
- ✅ Set up database migrations

---

## 🤝 Contributing

We welcome contributions! Here's how to get started:

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Make your changes
4. Run tests and linting (`pnpm check`)
5. Commit your changes (`git commit -m 'Add amazing feature'`)
6. Push to your branch (`git push origin feature/amazing-feature`)
7. Open a Pull Request

### Contribution Guidelines

- Follow the existing code style
- Write meaningful commit messages
- Add tests for new features
- Update documentation as needed
- Ensure all checks pass

---

## 🐛 Troubleshooting

### Common Issues

**Database connection fails**

```bash
# Check PostgreSQL is running
sudo service postgresql status

# Verify DATABASE_URL format
postgresql://username:password@host:port/database
```

**WorkOS authentication errors**

- Verify API keys in `.env`
- Check redirect URI matches WorkOS dashboard
- Ensure cookie password is set

**Build errors**

```bash
# Clear cache and reinstall
rm -rf node_modules .next
pnpm install
pnpm build
```

**Prisma errors**

```bash
# Regenerate Prisma client
pnpm db:generate

# Reset database (⚠️ destroys data)
pnpm prisma migrate reset
```

---

## 📄 License

This project is open source and available under the [MIT License](LICENSE).

---

## 🙏 Acknowledgments

- [T3 Stack](https://create.t3.gg/) for the amazing foundation
- [shadcn](https://twitter.com/shadcn) for the beautiful UI components
- [WorkOS](https://workos.com/) for enterprise authentication
- [Vercel](https://vercel.com/) for hosting and deployment
- All our contributors and supporters

---

## 📞 Support & Links

- **GitHub**: [github.com/drifter089/orgOS](https://github.com/drifter089/orgOS)
- **Issues**: [Report a bug](https://github.com/drifter089/orgOS/issues)
- **Discussions**: [Join the conversation](https://github.com/drifter089/orgOS/discussions)

---

<div align="center">
  <p>Built with ❤️ using the T3 Stack</p>
  <p>
    <a href="https://create.t3.gg/">T3 Stack</a> •
    <a href="https://nextjs.org/">Next.js</a> •
    <a href="https://trpc.io/">tRPC</a> •
    <a href="https://prisma.io/">Prisma</a>
  </p>
</div>
