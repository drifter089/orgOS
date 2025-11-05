# Testing

Comprehensive testing guide for the T3 Stack application using Playwright for end-to-end testing.

---

## Overview

Testing is essential for maintaining code quality and ensuring your application works as expected. This project uses **Playwright** for end-to-end (E2E) testing, providing a robust framework for testing user workflows across different browsers.

## Testing Stack

- **Playwright 1.51.1** - Modern E2E testing framework
- **TypeScript** - Type-safe test authoring
- **Test Runner** - Built-in parallel test execution
- **Trace Viewer** - Visual debugging for failed tests

---

## Getting Started

### Installation

Playwright is already configured in this project. To ensure browsers are installed:

```bash
pnpm exec playwright install
```

### Running Tests

```bash
# Run all tests
pnpm test:e2e

# Run tests in headed mode (see browser)
pnpm test:e2e --headed

# Run tests in debug mode
pnpm test:e2e --debug

# Run specific test file
pnpm test:e2e tests/auth.spec.ts

# Run tests in specific browser
pnpm test:e2e --project=chromium
pnpm test:e2e --project=firefox
pnpm test:e2e --project=webkit
```

### Viewing Test Reports

```bash
# Open last test report
pnpm playwright show-report

# View trace for failed tests
pnpm playwright show-trace
```

---

## Project Structure

```
tests/
├── e2e/
│   ├── auth.spec.ts          # Authentication flows
│   ├── navigation.spec.ts    # Navigation and routing
│   └── api.spec.ts           # API integration tests
├── fixtures/
│   ├── test-data.ts          # Test data fixtures
│   └── test-helpers.ts       # Shared test utilities
└── playwright.config.ts      # Playwright configuration
```

---

## Writing Tests

### Basic Test Structure

```typescript
import { expect, test } from "@playwright/test";

test.describe("Feature Name", () => {
  test.beforeEach(async ({ page }) => {
    // Setup: Navigate to page before each test
    await page.goto("/dashboard");
  });

  test("should display expected content", async ({ page }) => {
    // Arrange
    const heading = page.getByRole("heading", { name: "Dashboard" });

    // Act & Assert
    await expect(heading).toBeVisible();
  });
});
```

### Testing Server Components

Server Components render on the server, so test the rendered HTML:

```typescript
test("should render server component", async ({ page }) => {
  await page.goto("/");

  // Server Component content is in the initial HTML
  const content = await page.locator('[data-testid="server-content"]');
  await expect(content).toBeVisible();
  await expect(content).toHaveText("Server-rendered content");
});
```

### Testing Client Components

Client Components require JavaScript, so wait for hydration:

```typescript
test("should interact with client component", async ({ page }) => {
  await page.goto("/");

  // Wait for hydration
  await page.waitForLoadState("networkidle");

  // Now client interactions work
  const button = page.getByRole("button", { name: "Click Me" });
  await button.click();

  await expect(page.getByText("Clicked!")).toBeVisible();
});
```

### Testing tRPC Endpoints

```typescript
test("should call tRPC endpoint", async ({ page }) => {
  await page.goto("/dashboard");

  // Listen for tRPC API calls
  const responsePromise = page.waitForResponse(
    (response) =>
      response.url().includes("/api/trpc") && response.status() === 200,
  );

  // Trigger action that calls tRPC
  await page.getByRole("button", { name: "Load Data" }).click();

  const response = await responsePromise;
  const data = await response.json();

  expect(data.result.data).toBeDefined();
});
```

### Testing Authentication

```typescript
test.describe("Authentication", () => {
  test("should redirect unauthenticated users", async ({ page }) => {
    await page.goto("/dashboard");

    // Should redirect to login
    await expect(page).toHaveURL("/api/auth/signin");
  });

  test("should allow authenticated users", async ({ page, context }) => {
    // Mock authentication cookie
    await context.addCookies([
      {
        name: "auth_session",
        value: "test-session-token",
        domain: "localhost",
        path: "/",
      },
    ]);

    await page.goto("/dashboard");

    // Should stay on dashboard
    await expect(page).toHaveURL("/dashboard");
  });
});
```

---

## Best Practices

### 1. Use Locators Wisely

**Prefer accessible locators:**

```typescript
// ✅ Good - Uses accessibility roles
const button = page.getByRole('button', { name: 'Submit' });
const heading = page.getByRole('heading', { name: 'Welcome' });
const link = page.getByRole('link', { name: 'Documentation' });

// ❌ Avoid - Brittle selectors
const button = page.locator('button.btn-primary');
const heading = page.locator('h1');
```

### 2. Wait for Right Conditions

```typescript
// ✅ Good - Wait for specific element
await expect(page.getByText("Success")).toBeVisible();

// ✅ Good - Wait for network idle
await page.waitForLoadState("networkidle");

// ❌ Avoid - Arbitrary timeouts
await page.waitForTimeout(3000);
```

### 3. Use Test Data Fixtures

```typescript
// tests/fixtures/test-data.ts
export const testUsers = {
  admin: {
    email: 'admin@test.com',
    password: 'admin123',
  },
  user: {
    email: 'user@test.com',
    password: 'user123',
  },
};

// In tests
import { testUsers } from '../fixtures/test-data';

test('should login as admin', async ({ page }) => {
  await page.fill('[name="email"]', testUsers.admin.email);
  await page.fill('[name="password"]', testUsers.admin.password);
  await page.click('button[type="submit"]');
});
```

### 4. Group Related Tests

```typescript
test.describe("User Dashboard", () => {
  test.beforeEach(async ({ page }) => {
    // Shared setup
    await page.goto("/dashboard");
  });

  test.describe("Navigation", () => {
    test("should navigate to profile", async ({ page }) => {
      // Test navigation
    });

    test("should navigate to settings", async ({ page }) => {
      // Test navigation
    });
  });

  test.describe("Data Display", () => {
    test("should show user stats", async ({ page }) => {
      // Test data display
    });
  });
});
```

### 5. Test Error States

```typescript
test("should handle API errors gracefully", async ({ page }) => {
  // Mock API error
  await page.route("**/api/trpc/**", (route) => {
    route.fulfill({
      status: 500,
      body: JSON.stringify({ error: "Internal Server Error" }),
    });
  });

  await page.goto("/dashboard");
  await page.getByRole("button", { name: "Load Data" }).click();

  // Verify error message is shown
  await expect(page.getByText("Failed to load data")).toBeVisible();
});
```

---

## Testing TanStack Query Cache

### Testing Prefetched Data

```typescript
test("should display prefetched data instantly", async ({ page }) => {
  await page.goto("/posts");

  // Data should be visible immediately (no loading spinner)
  const posts = page.locator('[data-testid="post-item"]');
  await expect(posts).toHaveCount(3, { timeout: 100 });
});
```

### Testing Mutations

```typescript
test("should update cache after mutation", async ({ page }) => {
  await page.goto("/posts");

  // Initial state
  await expect(page.getByText("Post Title 1")).toBeVisible();

  // Trigger mutation
  await page.getByRole("button", { name: "Edit Post" }).click();
  await page.fill('[name="title"]', "Updated Title");
  await page.getByRole("button", { name: "Save" }).click();

  // Cache should update
  await expect(page.getByText("Updated Title")).toBeVisible();
  await expect(page.getByText("Post Title 1")).not.toBeVisible();
});
```

### Testing Optimistic Updates

```typescript
test("should show optimistic update", async ({ page }) => {
  await page.goto("/posts");

  // Click like button
  await page.getByRole("button", { name: "Like" }).click();

  // UI should update immediately
  await expect(page.getByText("1 like")).toBeVisible({ timeout: 100 });

  // Wait for server confirmation
  await page.waitForResponse((response) =>
    response.url().includes("/api/trpc/post.like"),
  );

  // UI should still show updated state
  await expect(page.getByText("1 like")).toBeVisible();
});
```

---

## CI/CD Integration

### GitHub Actions

The project includes a GitHub Actions workflow for running tests on every pull request. Tests run in parallel across multiple browsers.

```yaml
# .github/workflows/playwright.yml
name: Playwright Tests
on:
  pull_request:
    branches: [main, develop]
jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: pnpm/action-setup@v2
      - uses: actions/setup-node@v4
        with:
          node-version: 20
          cache: "pnpm"
      - run: pnpm install
      - run: pnpm exec playwright install --with-deps
      - run: pnpm test:e2e
      - uses: actions/upload-artifact@v4
        if: always()
        with:
          name: playwright-report
          path: playwright-report/
```

---

## Debugging Tests

### Visual Debugging

```bash
# Run in headed mode
pnpm test:e2e --headed

# Run in debug mode (step through)
pnpm test:e2e --debug

# Run with Playwright Inspector
PWDEBUG=1 pnpm test:e2e
```

### Trace Viewer

When tests fail in CI, traces are automatically captured:

```bash
# View trace file
pnpm playwright show-trace trace.zip
```

The trace viewer shows:

- Screenshots at each step
- Network requests
- Console logs
- DOM snapshots

### Screenshots and Videos

```typescript
// Playwright config
export default defineConfig({
  use: {
    screenshot: "only-on-failure",
    video: "retain-on-failure",
    trace: "retain-on-failure",
  },
});
```

---

## Common Patterns

### Page Object Model

```typescript
// tests/pages/dashboard.page.ts
import { Page } from '@playwright/test';

export class DashboardPage {
  constructor(private page: Page) {}

  async goto() {
    await this.page.goto('/dashboard');
  }

  async clickNewPost() {
    await this.page.getByRole('button', { name: 'New Post' }).click();
  }

  async getPostCount() {
    return await this.page.locator('[data-testid="post-item"]').count();
  }
}

// In tests
import { DashboardPage } from './pages/dashboard.page';

test('should create new post', async ({ page }) => {
  const dashboard = new DashboardPage(page);
  await dashboard.goto();
  await dashboard.clickNewPost();
  // ...
});
```

---

## Resources

- [Playwright Documentation](https://playwright.dev)
- [Playwright Best Practices](https://playwright.dev/docs/best-practices)
- [Testing Next.js Applications](https://nextjs.org/docs/app/building-your-application/testing/playwright)
- [Testing tRPC Applications](https://trpc.io/docs/testing)
