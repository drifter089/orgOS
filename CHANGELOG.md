# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

---

## [Unreleased]

### Added

- PostHog analytics integration for tracking user behavior and product metrics (#334)
- WorkOS profile pictures for members with initials fallback when unavailable (#341)
- Version update notification toast to alert users of new releases (#333)
- Team canvas link to member page for improved navigation (#331)
- Enhanced edge action buttons UX with improved interaction and zoom controls (#330)
- Automatic canvas edge syncing with drawer role-metric assignments (#329)
- Claude Code GitHub workflow for AI-assisted code reviews and development (#313)
- Daily automated changelog update workflow (#314)
- "Check-in" action on metric cards for quick navigation to metric check-in page (#307)

### Changed

- Role dialog enhanced with member dropdown showing role count and effort points for each member (#351)
- Role card styling unified across canvas, sidebar, dashboard drawer, and member page with consistent colored header and layout (#350)
- Consolidated role cards and dialogs into shared reusable components, reducing code duplication (#348)
- Member page sidebar replaced with slide-out sheet component for consistent navigation pattern (#346)
- Metric settings drawer converted to dialog with horizontal tabs (Goal, Roles, Settings) (#338)
- Organization page redesigned with consistent typography, 8px-based spacing, and improved responsiveness (#337)
- Canvas sidebar UI styling and responsiveness improved with compact layout and better mobile support (#342)
- Worktree command enhanced to create 3 worktrees with creative names and auto-open terminals (#339)
- Default metric poll frequency changed from frequent (15m) to hourly (#326)
- Enhanced radar chart UI with semi-transparent tooltip and improved legend (#317)
- Increased chart heights from 320px to 380px for better visibility (#317)
- Standardized button variants from `ghost` to `outline` for consistent border styling across UI (#311)
- Unified icon usage: `Briefcase` for roles, `Users` for members, `Target` for goals, `Gauge` for effort points (#311)
- Consolidated MembersList component into shared component at `src/components/member/member-list.tsx` (#308, #310)
- Widened sidebar panel from 24rem to 28rem for better content display (#310)
- Manual metric dialog made more responsive by removing fixed width constraint (#307)

### Fixed

- Role data disappearing after mutations by removing TanStack cache invalidations that overwrote correct data with stale responses (#374)
- Blank flash when creating role in canvas by reordering cache updates before node updates (#373)
- Double border issue on chart nodes in team canvas (#349)
- Chart node dimensions now preserved in public canvas preview (#347)
- Dark mode shadow visibility by using pure black with higher opacity values (#344)
- Sidebar and member card UI with improved responsive design, consistent badge styling, and better button layouts (#343)
- Auto-creating role nodes from KPI chart edge drops on team canvas (#340)
- Team canvas UX improvements with resizable charts and keyboard shortcuts (#332)
- Chart Y-axis scaling to properly include goal line in view (#328)
- Drawer height increased for better visibility on smaller screens (#327)
- Metric drawer responsiveness across all screen sizes (#325)
- Dashboard context made optional for canvas chart nodes and drawer components (#322, #323)
- Radar chart grid line visibility and tooltip transparency issues (#319)
- GitHub Actions workflow permissions for Claude Code to allow PR comments and file editing (#316)
- Radar chart polygon rendering by adding PolarRadiusAxis with explicit domain [0, 100] (#315)
- Processing badge disappearing on metric refresh by removing premature cache invalidation (#309)
- Calendar input overflow in manual metric dialog for daily/weekly/monthly tracking periods (#307)

### Reverted

- Dashboard context optimization changes due to compatibility issues (#324, reverted #320)

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
