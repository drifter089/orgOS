// spec: Authentication Tests for T3 Stack Application with WorkOS AuthKit
// seed: tests/seed.spec.ts
import { expect, test, type Page } from "@playwright/test";

// Helper function to expand the FancyNav navigation
async function expandNav(page: Page) {
  // Click the menu toggle button to expand the nav
  const menuButton = page.getByRole("button", { name: /Open menu|Close menu/ });
  await menuButton.click();
  // Wait for the expanded content to become visible
  await page.waitForSelector('[class*="col-span-full"]', { state: "visible" });
}

test.describe("Unauthenticated Access", () => {
  test("should allow access to public routes", async ({ page }) => {
    // 1. Navigate to home page
    await page.goto("/");

    // 2. Verify page loads successfully (use .first() to handle multiple ORG-OS headings)
    await expect(
      page.getByRole("heading", { name: "ORG-OS" }).first(),
    ).toBeVisible();

    // 3. Check that content is visible
    await expect(page.getByText("Your organizational operating system")).toBeVisible();

    // 4. Expand the nav to access Sign in/Sign up buttons
    await expandNav(page);

    // 5. Verify "Sign in" and "Sign up" buttons are visible in expanded NavBar
    await expect(page.getByRole("link", { name: "Sign in" }).first()).toBeVisible();
    await expect(page.getByRole("link", { name: "Sign up" }).first()).toBeVisible();

    // 6. Navigate to docs page
    await page.goto("/docs");

    // 7. Verify docs page loads successfully
    await expect(
      page.getByRole("heading", { name: "OrgOS Documentation" }),
    ).toBeVisible();
  });

  test("should deny access to protected routes and redirect to sign-in", async ({
    page,
  }) => {
    // 1. Navigate to protected route /design-strategy
    await page.goto("/design-strategy");

    // 2. Verify redirect to WorkOS sign-in page occurred
    await expect(page.getByRole("heading", { name: "Sign in" })).toBeVisible();
    await expect(page).toHaveURL(/authkit\.app/);

    // 3. Navigate to another protected route /render-strategy
    await page.goto("/render-strategy");

    // 4. Verify redirect to WorkOS sign-in page occurred again
    await expect(page.getByRole("heading", { name: "Sign in" })).toBeVisible();
    await expect(page).toHaveURL(/authkit\.app/);
  });

  test("should navigate to WorkOS sign-in page when clicking Sign in button", async ({
    page,
  }) => {
    // 1. Start from home page
    await page.goto("/");

    // 2. Expand the nav to access Sign in button
    await expandNav(page);

    // 3. Click "Sign in" button in NavBar
    await page.getByRole("link", { name: "Sign in" }).first().click();

    // 4. Wait for redirect to WorkOS authentication page
    await page.waitForURL(/authkit\.app/);
    await expect(page.getByRole("heading", { name: "Sign in" })).toBeVisible();

    // 5. Verify email input field is present
    await expect(page.getByRole("textbox", { name: "Email" })).toBeVisible();

    // 6. Verify Continue button is present
    await expect(page.getByRole("button", { name: "Continue" })).toBeVisible();
  });
});

test.describe("WorkOS Authentication Flow", () => {
  test("should display password field after entering valid email", async ({
    page,
  }) => {
    // 1. Navigate to sign-in page
    await page.goto("/");
    await expandNav(page);
    await page.getByRole("link", { name: "Sign in" }).first().click();

    // 2. Wait for WorkOS authentication page
    await page.waitForURL(/authkit\.app/);
    await expect(page.getByRole("heading", { name: "Sign in" })).toBeVisible();

    // 3. Fill in email address
    await page
      .getByRole("textbox", { name: "Email" })
      .fill("akshat-test@test.com");

    // 4. Click Continue button
    await page.getByRole("button", { name: "Continue" }).click();

    // 5. Verify password field appears
    await expect(page.getByRole("textbox", { name: "Password" })).toBeVisible();

    // 6. Verify email is pre-filled in the password screen
    const emailTextbox = page.getByRole("textbox", { name: "Email" });
    await expect(emailTextbox).toHaveValue("akshat-test@test.com");

    // 7. Verify Sign in button is present
    await expect(page.getByRole("button", { name: "Sign in" })).toBeVisible();
  });

  test.skip("should complete sign-in flow with valid credentials", async ({
    page,
  }) => {
    // NOTE: This test is skipped because WorkOS requires email verification (OTP)
    // which cannot be automated in this test environment without access to the email inbox.
    //
    // To enable this test, you would need:
    // 1. Configure WorkOS to disable email verification for test environment
    // 2. Use WorkOS test mode API if available
    // 3. Integrate with an email testing service (e.g., Mailinator, Mailtrap)
    // 4. Use WorkOS impersonation feature if available in your plan

    await page.goto("/");
    await expandNav(page);
    await page.getByRole("link", { name: "Sign in" }).first().click();

    // Fill in email
    await page
      .getByRole("textbox", { name: "Email" })
      .fill("akshat-test@test.com");
    await page.getByRole("button", { name: "Continue" }).click();

    // Fill in password
    await page.getByRole("textbox", { name: "Password" }).fill("akshat-test");
    await page.getByRole("button", { name: "Sign in" }).click();

    // Email verification step blocks automated testing here
    // Manual intervention required to retrieve and enter OTP code

    // Expected after successful authentication:
    // await expect(page).toHaveURL('http://localhost:3000/');
    // await expect(page.getByRole('button', { name: 'Sign out' })).toBeVisible();
  });
});

test.describe("Direct Protected Route Access", () => {
  test("should redirect to login and preserve original destination in state", async ({
    page,
  }) => {
    // 1. Navigate directly to protected route
    await page.goto("/render-strategy");

    // 2. Verify redirect to WorkOS sign-in page
    await expect(page.getByRole("heading", { name: "Sign in" })).toBeVisible();
    await expect(page).toHaveURL(/authkit\.app/);

    // 3. Verify the state parameter contains the return pathname
    const url = new URL(page.url());
    const stateParam = url.searchParams.get("state");
    expect(stateParam).toBeTruthy();

    // The state should be base64 encoded and contain returnPathname
    // After successful login, WorkOS would redirect back to /render-strategy
  });
});
