# Getting Started

This guide will help you get started with the project and understand the basics.

## Installation

First, install the dependencies:

```bash
pnpm install
```

## Development

Start the development server:

```bash
pnpm dev
```

Your app will be available at `http://localhost:3000`.

## Project Structure

The project follows a standard Next.js 15 App Router structure:

```
├── src/
│   ├── app/           # App router pages and layouts
│   ├── components/    # Reusable components
│   ├── lib/           # Utility functions
│   └── styles/        # Global styles
├── docs/              # Documentation (this site!)
│   └── app/           # Docs pages
└── public/            # Static assets
```

## Key Features

- **Next.js 15** - Latest version with App Router
- **TypeScript** - Type-safe development
- **Tailwind CSS 4.0** - Utility-first CSS
- **Shadcn/ui** - Beautiful component library
- **tRPC** - End-to-end type safety
- **WorkOS** - Authentication
- **Prisma** - Database ORM

## Next Steps

1. Explore the [Components](/docs/components) documentation
2. Check out [Examples](/docs/examples) for common patterns
3. Read the API reference for detailed information

## Code Quality & Linting

The project uses automated code quality tools to maintain consistency:

**Current Setup:**

- **ESLint** - TypeScript-aware linting with Next.js rules and type-checking
- **Prettier** - Code formatting with Tailwind CSS and import sorting plugins
- **Husky + lint-staged** - Automatic linting/formatting on commit

**How it works:**
When you commit code, Husky runs lint-staged which automatically:

1. Fixes ESLint issues and formats code for `.ts/.tsx/.js/.jsx` files
2. Formats `.json/.md/.mdx/.css` files with Prettier

**Manual commands:**

```bash
pnpm lint          # Check for linting issues
pnpm lint:fix      # Auto-fix linting issues
pnpm format:check  # Check code formatting
pnpm format:write  # Auto-format code
```

**Upgrading over time:**
To increase code quality standards:

- Add stricter ESLint rules in `eslint.config.js` (eslint.config.js:21)
- Enable more TypeScript-ESLint rules from `strict` or `strictTypeChecked` configs
- Add custom rules for project-specific patterns
- Configure Prettier options in `prettier.config.js` (prettier.config.js:2)

The linting setup uses Prettier for all formatting (including import order) to avoid conflicts with ESLint.

## Need Help?

If you run into any issues:

- Check the documentation
- Review the examples
- Reach out to the team
