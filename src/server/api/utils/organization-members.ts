import { workos } from "@/server/workos";

/**
 * Member type - represents a user from WorkOS (org membership or directory sync)
 */
export type Member = {
  id: string;
  email: string;
  firstName: string | null;
  lastName: string | null;
  profilePictureUrl: string | null;
  jobTitle?: string | null;
  groups?: Array<{ id: string; name: string }>;
  source: "membership" | "directory" | "both";
  canLogin: boolean;
};

/**
 * Fetch all organization members - combines directory users + org members.
 * Single source: WorkOS. Deduplicates by email.
 *
 * @param organizationId - WorkOS organization ID
 * @param directoryId - Optional directory ID for directory sync users
 * @returns Array of members
 */
export async function fetchOrganizationMembers(
  organizationId: string,
  directoryId?: string | null,
): Promise<Member[]> {
  const memberMap = new Map<string, Member>();
  const orgMemberEmails = new Set<string>();

  const memberships = await workos.userManagement.listOrganizationMemberships({
    organizationId,
  });

  await Promise.all(
    memberships.data.map(async (m) => {
      const user = await workos.userManagement.getUser(m.userId);
      const emailLower = user.email.toLowerCase();
      orgMemberEmails.add(emailLower);
      memberMap.set(emailLower, {
        id: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        profilePictureUrl: user.profilePictureUrl,
        source: "membership",
        canLogin: true,
      });
    }),
  );

  if (directoryId) {
    let after: string | undefined;
    do {
      const response = await workos.directorySync.listUsers({
        directory: directoryId,
        limit: 100,
        after,
      });

      for (const dirUser of response.data) {
        if (dirUser.email) {
          const emailLower = dirUser.email.toLowerCase();
          const isOrgMember = orgMemberEmails.has(emailLower);
          // Intentionally overwrite with directory user ID - this is the ID used for role assignment
          // when directory sync is enabled (see validateUserAssignable in authorization.ts)
          memberMap.set(emailLower, {
            id: dirUser.id,
            email: dirUser.email,
            firstName: dirUser.firstName,
            lastName: dirUser.lastName,
            profilePictureUrl: null,
            jobTitle: dirUser.jobTitle,
            groups: dirUser.groups,
            source: isOrgMember ? "both" : "directory",
            canLogin: isOrgMember,
          });
        }
      }

      after = response.listMetadata?.after;
    } while (after);
  }

  return Array.from(memberMap.values());
}

/**
 * Build a Map of userId → display name for quick lookups.
 * Useful for enriching roles with user names.
 *
 * @param members - Array of members from fetchOrganizationMembers
 * @returns Map of userId → display name
 */
export function buildMemberNameMap(members: Member[]): Map<string, string> {
  const nameMap = new Map<string, string>();

  for (const member of members) {
    const displayName =
      [member.firstName, member.lastName].filter(Boolean).join(" ") ||
      member.email;
    nameMap.set(member.id, displayName);
  }

  return nameMap;
}

/**
 * Get directory ID for an organization (if directory sync is enabled).
 * Used by public views that don't have workspace context.
 *
 * @param organizationId - WorkOS organization ID
 * @returns Directory ID or null
 */
export async function getOrganizationDirectoryId(
  organizationId: string,
): Promise<string | null> {
  try {
    const directories = await workos.directorySync.listDirectories({
      organizationId,
    });
    return directories.data[0]?.id ?? null;
  } catch {
    return null;
  }
}
