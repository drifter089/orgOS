import { workos } from "@/server/workos";

/**
 * Look up user's display name from WorkOS user management.
 * Returns null if user not found or on error.
 *
 * NOTE: This only works for user management IDs (authenticated org members).
 * For comprehensive member lookup (including directory sync users), use
 * fetchOrganizationMembers() from organization-members.ts instead.
 *
 * Used by role create/update where we know the assignedUserId is always
 * a user management ID (from validateUserAssignable check).
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
