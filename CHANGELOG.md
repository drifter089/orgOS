# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

---

## [Unreleased]

### Added

- Claude Code GitHub workflow for AI-assisted code reviews and development (#313)
- Daily automated changelog update workflow (#314)
- "Check-in" action on metric cards for quick navigation to metric check-in page (#307)

### Changed

- Enhanced radar chart UI with semi-transparent tooltip and improved legend (#317)
- Increased chart heights from 320px to 380px for better visibility (#317)
- Standardized button variants from `ghost` to `outline` for consistent border styling across UI (#311)
- Unified icon usage: `Briefcase` for roles, `Users` for members, `Target` for goals, `Gauge` for effort points (#311)
- Consolidated MembersList component into shared component at `src/components/member/member-list.tsx` (#308, #310)
- Widened sidebar panel from 24rem to 28rem for better content display (#310)
- Manual metric dialog made more responsive by removing fixed width constraint (#307)

### Fixed

- GitHub Actions workflow permissions for Claude Code to allow PR comments and file editing (#316)
- Radar chart polygon rendering by adding PolarRadiusAxis with explicit domain [0, 100] (#315)
- Processing badge disappearing on metric refresh by removing premature cache invalidation (#309)
- Calendar input overflow in manual metric dialog for daily/weekly/monthly tracking periods (#307)

### Refactored

- Eliminated goals data duplication by moving transformation logic into GoalsRadarChart component (#315)
- Consolidated cache invalidation patterns into shared `invalidateDashboardCache()` utility (#312)
- Standardized user name functions: `getUserDisplayName()` (client), `fetchUserDisplayName()` (server) (#312)
- Simplified GoalsRadarChart API to accept `metricIds: string[]` instead of pre-transformed data (#315)

### In Progress

- Testing infrastructure with Playwright E2E tests
- Documentation sync automation system

### Planned

- React Flow integration for workflow visualizations
- Enhanced user dashboard with analytics
- Multi-tenant organization support

---

## [0.1.0] - 2025-11-05

### Added

- **Core Stack**: T3 Stack setup with Next.js 15.2.3, tRPC 11.0.0, Prisma 6.5.0, and TanStack Query 5.69.0
- **Authentication**: WorkOS AuthKit 2.10.0 integration with middleware protection
- **Documentation System**:
  - MDX-based documentation with custom components
  - Syntax highlighting with react-syntax-highlighter
  - Mermaid diagram support for architecture visualizations
  - Responsive sidebar navigation with table of contents
  - Comprehensive architecture documentation split into:
    - Overview page with tech stack and project structure
    - Fundamental Concepts (Server/Client Components, TanStack Query, tRPC)
    - Integration Patterns with real-world examples
- **UI Components**:
  - shadcn/ui component library (50+ components)
  - Radix UI primitives for accessibility
  - Dark mode support with next-themes
  - Custom theme switcher component
- **Database**:
  - PostgreSQL with Prisma ORM
  - Type-safe database queries
  - Migration system
- **Development Tools**:
  - ESLint with Next.js config and TypeScript rules
  - Prettier with import sorting
  - Husky pre-commit hooks
  - lint-staged for staged file checking
- **Testing**: Playwright 1.56.1 setup and configuration
- **Project Documentation**:
  - ROADMAP.md for feature planning
  - CHANGELOG.md (this file)
  - CLAUDE.md for AI-assisted development context
- **Documentation Pages**:
  - Getting Started guide
  - Architecture overview and patterns
  - Testing guide with Playwright
  - React Flow integration guide
  - AI & Dev Tools documentation
  - CI/CD pipeline documentation

### Changed

- Updated import alias from `~` to `@` in architecture documentation
- Restructured architecture/concepts into separate child pages:
  - Server & Client Components
  - TanStack Query
  - tRPC API Layer
- Enhanced sidebar navigation with nested structure for concepts

### Fixed

- Type error in `getTextFromChildren` function (docs TOC component)
- Import conventions documentation (corrected alias from `~` to `@`)

---

## [0.0.1] - 2025-10-15 (Initial Setup)

### Added

- Initial project scaffolding with create-t3-app
- Basic Next.js 15 configuration
- TypeScript setup
- Tailwind CSS configuration
- Basic folder structure

---

## Release Notes Guidelines

When adding entries to this changelog:

### Categories

- **Added**: New features
- **Changed**: Changes to existing functionality
- **Deprecated**: Soon-to-be removed features
- **Removed**: Removed features
- **Fixed**: Bug fixes
- **Security**: Security vulnerability fixes

### Format

```markdown
## [X.Y.Z] - YYYY-MM-DD

### Added

- Feature description with context
- Another feature

### Fixed

- Bug fix description
```

### Linking

- Link to relevant documentation pages
- Reference GitHub issues/PRs where applicable
- Use relative links for internal documentation

### Examples

**Good entries:**

```markdown
### Added

- User dashboard with real-time analytics and activity feed ([#123](link))
- Dark mode support across all components
```

**Avoid:**

```markdown
### Added

- Stuff
- Fixed things
```

---

**Maintained by:** Development Team
**Last Updated:** 2025-11-05
