import { chromium, type FullConfig } from "@playwright/test";
import { authenticateUser, TEST_USERS } from "./helpers/auth";
import path from "path";
import fs from "fs";
import { fileURLToPath } from "url";

// Get __dirname equivalent in ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * Global setup for Playwright tests
 *
 * This function runs once before all tests and:
 * 1. Authenticates test users with WorkOS
 * 2. Creates browser contexts with authentication cookies
 * 3. Verifies authentication works
 * 4. Saves authenticated states for reuse in test files
 *
 * The saved authentication states are stored in tests/.auth/ and
 * can be reused across test files via fixtures.
 */
async function globalSetup(config: FullConfig) {
  console.log("\n[Global Setup] Starting authentication setup...\n");

  // Get base URL from config
  const baseURL =
    config.projects[0]?.use?.baseURL ?? "http://localhost:3000";

  // Create auth states directory
  const authDir = path.join(__dirname, ".auth");
  if (!fs.existsSync(authDir)) {
    fs.mkdirSync(authDir, { recursive: true });
    console.log(`[Global Setup] Created auth directory: ${authDir}`);
  }

  // Launch browser for authentication verification
  const browser = await chromium.launch();

  try {
    // ========================================
    // Authenticate Standard User
    // ========================================
    console.log("\n[Global Setup] Authenticating standard user...");
    const { user, cookie } = await authenticateUser(TEST_USERS.standard);

    // Create browser context and set authentication cookie
    const context = await browser.newContext();
    await context.addCookies([
      {
        name: cookie.name,
        value: cookie.value,
        domain: cookie.domain,
        path: cookie.path,
        httpOnly: cookie.httpOnly,
        secure: cookie.secure,
        sameSite: cookie.sameSite,
      },
    ]);

    // Navigate to app to ensure cookie works
    const page = await context.newPage();
    await page.goto(baseURL);

    // Verify authentication by checking for sign-out button
    try {
      await page.waitForLoadState("networkidle");
      const isAuthenticated = await page
        .locator('text="Sign out"')
        .isVisible({ timeout: 10000 });

      if (!isAuthenticated) {
        throw new Error(
          "Authentication verification failed: 'Sign out' button not found",
        );
      }

      console.log(`[Global Setup] ✓ Verified authentication for: ${user.email}`);
    } catch (error) {
      console.error("[Global Setup] Authentication verification failed");
      console.error("Page URL:", page.url());
      console.error("Error:", error);
      throw error;
    }

    // Save authenticated state
    const userStatePath = path.join(authDir, "user.json");
    await context.storageState({ path: userStatePath });
    console.log(`[Global Setup] ✓ Saved auth state to: ${userStatePath}`);

    await context.close();

    // ========================================
    // Future: Authenticate Admin User
    // ========================================
    // When admin features are implemented, uncomment this:
    //
    // console.log("\n[Global Setup] Authenticating admin user...");
    // const adminAuth = await authenticateUser(TEST_USERS.admin);
    // const adminContext = await browser.newContext();
    // await adminContext.addCookies([{
    //   name: adminAuth.cookie.name,
    //   value: adminAuth.cookie.value,
    //   domain: adminAuth.cookie.domain,
    //   path: adminAuth.cookie.path,
    //   httpOnly: adminAuth.cookie.httpOnly,
    //   secure: adminAuth.cookie.secure,
    //   sameSite: adminAuth.cookie.sameSite,
    // }]);
    // const adminPage = await adminContext.newPage();
    // await adminPage.goto(baseURL);
    // await adminPage.waitForLoadState("networkidle");
    // const adminStatePath = path.join(authDir, "admin.json");
    // await adminContext.storageState({ path: adminStatePath });
    // console.log(`[Global Setup] ✓ Saved admin state to: ${adminStatePath}`);
    // await adminContext.close();

    // ========================================
    // Future: Authenticate Paid User
    // ========================================
    // When paid features are implemented, uncomment this:
    //
    // console.log("\n[Global Setup] Authenticating paid user...");
    // const paidAuth = await authenticateUser(TEST_USERS.paid);
    // const paidContext = await browser.newContext();
    // await paidContext.addCookies([{
    //   name: paidAuth.cookie.name,
    //   value: paidAuth.cookie.value,
    //   domain: paidAuth.cookie.domain,
    //   path: paidAuth.cookie.path,
    //   httpOnly: paidAuth.cookie.httpOnly,
    //   secure: paidAuth.cookie.secure,
    //   sameSite: paidAuth.cookie.sameSite,
    // }]);
    // const paidPage = await paidContext.newPage();
    // await paidPage.goto(baseURL);
    // await paidPage.waitForLoadState("networkidle");
    // const paidStatePath = path.join(authDir, "paid.json");
    // await paidContext.storageState({ path: paidStatePath });
    // console.log(`[Global Setup] ✓ Saved paid state to: ${paidStatePath}`);
    // await paidContext.close();

    console.log("\n[Global Setup] ✓ Authentication setup completed successfully\n");
  } catch (error) {
    console.error("\n[Global Setup] ✗ Setup failed:", error);
    throw error;
  } finally {
    await browser.close();
  }
}

export default globalSetup;
