import { WorkOS } from "@workos-inc/node";
import { sealData } from "iron-session";

/**
 * Test user definition with credentials and role
 */
export interface TestUser {
  email: string;
  password: string;
  role?: "user" | "admin" | "paid";
}

/**
 * Test users for authentication
 * Credentials are loaded from environment variables for security
 * Future: Add admin and paid users when those features are implemented
 */
export const TEST_USERS = {
  standard: {
    email: process.env.TEST_USER_EMAIL || "",
    password: process.env.TEST_USER_PASSWORD || "",
    role: "user" as const,
  },
  // Future users (placeholder):
  // admin: {
  //   email: process.env.TEST_ADMIN_EMAIL || "",
  //   password: process.env.TEST_ADMIN_PASSWORD || "",
  //   role: "admin" as const,
  // },
  // paid: {
  //   email: process.env.TEST_PAID_EMAIL || "",
  //   password: process.env.TEST_PAID_PASSWORD || "",
  //   role: "paid" as const,
  // },
} as const;

/**
 * Cookie configuration for WorkOS session
 */
interface SessionCookie {
  name: string;
  value: string;
  domain: string;
  path: string;
  httpOnly: boolean;
  secure: boolean;
  sameSite: "Strict" | "Lax" | "None";
}

/**
 * Result of authenticating a user
 */
interface AuthenticationResult {
  user: {
    id: string;
    email: string;
    firstName: string | null;
    lastName: string | null;
    emailVerified: boolean;
    profilePictureUrl: string | null;
    createdAt: string;
    updatedAt: string;
  };
  cookie: SessionCookie;
}

/**
 * Authenticates a user with WorkOS and returns session cookie
 *
 * This function:
 * 1. Uses WorkOS SDK to authenticate with email/password
 * 2. Creates an encrypted session cookie compatible with AuthKit Next.js
 * 3. Returns user info and cookie ready for Playwright browser context
 *
 * @param user - Test user with email and password
 * @returns Authentication result with user info and session cookie
 * @throws Error if authentication fails or environment variables are missing
 */
export async function authenticateUser(
  user: TestUser,
): Promise<AuthenticationResult> {
  // Validate environment variables
  const apiKey = process.env.WORKOS_API_KEY;
  const clientId = process.env.WORKOS_CLIENT_ID;
  const cookiePassword = process.env.WORKOS_COOKIE_PASSWORD;

  if (!apiKey) {
    throw new Error(
      "WORKOS_API_KEY environment variable is required for authentication",
    );
  }
  if (!clientId) {
    throw new Error(
      "WORKOS_CLIENT_ID environment variable is required for authentication",
    );
  }
  if (!cookiePassword) {
    throw new Error(
      "WORKOS_COOKIE_PASSWORD environment variable is required for cookie encryption",
    );
  }

  // Validate test user credentials
  if (!user.email || !user.password) {
    throw new Error(
      "Test user credentials (TEST_USER_EMAIL and TEST_USER_PASSWORD) must be set in .env file",
    );
  }

  // Initialize WorkOS SDK
  const workos = new WorkOS(apiKey);

  try {
    // Authenticate with WorkOS using email and password
    console.log(`[Auth] Authenticating user: ${user.email}`);
    const authResponse = await workos.userManagement.authenticateWithPassword({
      clientId,
      email: user.email,
      password: user.password,
    });

    console.log(
      `[Auth] Successfully authenticated: ${authResponse.user.email}`,
    );

    // Create session data matching AuthKit Next.js structure
    const sessionData = {
      accessToken: authResponse.accessToken,
      refreshToken: authResponse.refreshToken,
      user: authResponse.user,
      impersonator: authResponse.impersonator,
    };

    // Seal the session using iron-session (same as AuthKit Next.js)
    // This creates an encrypted cookie value compatible with the application
    const sealedSession = await sealData(sessionData, {
      password: cookiePassword,
      ttl: 60 * 60 * 24 * 15, // 15 days (same as AuthKit default)
    });

    console.log(`[Auth] Created encrypted session cookie`);

    // Return authentication result
    return {
      user: authResponse.user,
      cookie: {
        name: "wos-session", // Confirmed cookie name from browser DevTools
        value: sealedSession,
        domain: "localhost",
        path: "/",
        httpOnly: true,
        secure: false, // Set to true in production/HTTPS
        sameSite: "Lax",
      },
    };
  } catch (error) {
    console.error(`[Auth] Authentication failed for ${user.email}:`, error);
    throw new Error(
      `Failed to authenticate user ${user.email}: ${error instanceof Error ? error.message : String(error)}`,
    );
  }
}
