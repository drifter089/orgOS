import { workos } from "@/server/workos";

/**
 * Look up user's display name from WorkOS.
 * Returns null if user not found or on error.
 * This function uses the server-side WorkOS API key, so it works without user authentication.
 *
 * NOTE: This only works for user management IDs, not directory sync user IDs.
 * For directory users, use resolveUserDisplayName() instead.
 */
export async function getUserDisplayName(
  userId: string | null | undefined,
): Promise<string | null> {
  if (!userId) return null;
  try {
    const user = await workos.userManagement.getUser(userId);
    return (
      [user.firstName, user.lastName].filter(Boolean).join(" ") || user.email
    );
  } catch {
    return null;
  }
}

/**
 * Robustly resolve a user's display name for public views.
 * Handles both user management IDs and directory sync user IDs.
 *
 * Resolution order:
 * 1. Try direct WorkOS user management lookup
 * 2. Try organization members lookup (handles directory users)
 * 3. Fall back to "User <partial-id>" string
 *
 * @param userId - WorkOS user ID or directory user ID
 * @param organizationId - Organization ID for fallback member lookup
 * @returns Display name or fallback string (never null for valid userId)
 */
export async function resolveUserDisplayName(
  userId: string | null | undefined,
  organizationId: string,
): Promise<string | null> {
  if (!userId) return null;

  // Strategy 1: Try direct user management lookup (works for org members)
  try {
    const user = await workos.userManagement.getUser(userId);
    return (
      [user.firstName, user.lastName].filter(Boolean).join(" ") || user.email
    );
  } catch {
    // User not found in user management - might be a directory user
  }

  // Strategy 2: Try to find in organization members (handles directory sync users)
  try {
    // Check if this is a directory user by looking up directory users
    const orgDetails =
      await workos.organizations.getOrganization(organizationId);

    // If org exists, try to look up directory user directly
    if (orgDetails) {
      try {
        // Try to get the user directly from directory sync
        const dirUser = await workos.directorySync.getUser(userId);
        if (dirUser) {
          return (
            [dirUser.firstName, dirUser.lastName].filter(Boolean).join(" ") ||
            dirUser.email ||
            `User ${userId.substring(0, 8)}`
          );
        }
      } catch {
        // User not found in directory sync
      }
    }
  } catch {
    // Organization lookup failed
  }

  // Strategy 3: Return fallback with partial user ID (matches private view behavior)
  return `User ${userId.substring(0, 8)}`;
}
