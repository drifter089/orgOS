import { test as base, type Page } from "@playwright/test";
import path from "path";
import { fileURLToPath } from "url";

// Get __dirname equivalent in ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * Authentication fixtures for Playwright tests
 *
 * These fixtures provide pre-authenticated browser contexts for different user types.
 * Each fixture loads saved authentication state from the global setup.
 *
 * Usage:
 *   import { test, expect } from './fixtures/auth.fixture';
 *
 *   test('my authenticated test', async ({ authenticatedPage }) => {
 *     await authenticatedPage.goto('/protected-route');
 *     // User is already authenticated
 *   });
 */

/**
 * Custom fixtures type definition
 */
type AuthFixtures = {
  /**
   * Page with authenticated standard user session
   * Use this for tests that require a logged-in user
   */
  authenticatedPage: Page;

  /**
   * Page with no authentication (explicit)
   * Use this for tests that explicitly need unauthenticated state
   */
  unauthenticatedPage: Page;

  // Future fixtures (when admin/paid users are implemented):
  // adminPage: Page;
  // paidPage: Page;
};

/**
 * Extended test with authentication fixtures
 */
export const test = base.extend<AuthFixtures>({
  /**
   * Authenticated user fixture
   *
   * Creates a browser context with saved authentication state from global setup.
   * The user is already logged in and can access protected routes.
   */
  authenticatedPage: async ({ browser }, use) => {
    const context = await browser.newContext({
      storageState: path.join(__dirname, "../.auth/user.json"),
    });
    const page = await context.newPage();

    // Provide the page to the test
    await use(page);

    // Cleanup after test
    await context.close();
  },

  /**
   * Unauthenticated page fixture
   *
   * Creates a browser context with no saved state.
   * Use this for tests that need to verify behavior without authentication.
   */
  unauthenticatedPage: async ({ browser }, use) => {
    const context = await browser.newContext({
      storageState: undefined, // No saved authentication state
    });
    const page = await context.newPage();

    // Provide the page to the test
    await use(page);

    // Cleanup after test
    await context.close();
  },

  // ========================================
  // Future: Admin User Fixture
  // ========================================
  // When admin features are implemented, uncomment this:
  //
  // adminPage: async ({ browser }, use) => {
  //   const context = await browser.newContext({
  //     storageState: path.join(__dirname, "../.auth/admin.json"),
  //   });
  //   const page = await context.newPage();
  //   await use(page);
  //   await context.close();
  // },

  // ========================================
  // Future: Paid User Fixture
  // ========================================
  // When paid features are implemented, uncomment this:
  //
  // paidPage: async ({ browser }, use) => {
  //   const context = await browser.newContext({
  //     storageState: path.join(__dirname, "../.auth/paid.json"),
  //   });
  //   const page = await context.newPage();
  //   await use(page);
  //   await context.close();
  // },
});

/**
 * Re-export expect from Playwright for convenience
 */
export { expect } from "@playwright/test";
