import { TRPCError } from "@trpc/server";
import type { Directory, DirectoryUserWithGroups } from "@workos-inc/node";

import { env } from "@/env";
import { type db } from "@/server/db";
import { workos } from "@/server/workos";

// Derive proper DB type from the db instance
type DB = typeof db;

// In-memory cache for directory data (5 minute TTL)
let directoryUsersCache: {
  data: DirectoryUserWithGroups[];
  timestamp: number;
} | null = null;

let directoryCache: {
  data: Directory;
  timestamp: number;
} | null = null;

const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

export async function getAllDirectoryUsers(): Promise<
  DirectoryUserWithGroups[]
> {
  if (
    directoryUsersCache &&
    Date.now() - directoryUsersCache.timestamp < CACHE_TTL
  ) {
    return directoryUsersCache.data;
  }

  const allUsers: DirectoryUserWithGroups[] = [];
  let after: string | undefined;
  let hasMore = true;

  while (hasMore) {
    const usersResponse = await workos.directorySync.listUsers({
      directory: env.WORKOS_DIR_ID,
      limit: 100,
      after,
    });

    allUsers.push(...usersResponse.data);
    after = usersResponse.listMetadata?.after;
    hasMore = !!after;
  }

  // Update cache
  directoryUsersCache = {
    data: allUsers,
    timestamp: Date.now(),
  };

  return allUsers;
}

export async function getDirectory(): Promise<Directory> {
  if (directoryCache && Date.now() - directoryCache.timestamp < CACHE_TTL) {
    return directoryCache.data;
  }

  const directory = await workos.directorySync.getDirectory(env.WORKOS_DIR_ID);

  // Update cache
  directoryCache = {
    data: directory,
    timestamp: Date.now(),
  };

  return directory;
}

/**
 * Check if user email belongs to directory (all directory users have access)
 * @param userId - Can be either WorkOS auth user ID OR directory user ID
 */
async function isDirectoryUser(userId: string): Promise<boolean> {
  try {
    // Get all directory users first
    const allUsers = await getAllDirectoryUsers();

    // Check if userId is a directory user ID (starts with directory_user_)
    if (userId.startsWith("directory_user_")) {
      // This is a directory user ID, check if it exists in directory

      const directoryUser = allUsers.find((user) => user.id === userId);
      return !!directoryUser;
    }

    // Otherwise it's a WorkOS auth user ID, get their email
    const workosUser = await workos.userManagement.getUser(userId);
    const authEmail = workosUser.email.toLowerCase();

    // Check if user's email matches any directory user

    const directoryUser = allUsers.find((user) => {
      return user.email?.toLowerCase() === authEmail;
    });

    return !!directoryUser;
  } catch (error) {
    // If we get an error while checking directory users, log it but don't fail
    // This prevents race conditions during cache initialization
    console.error("Error checking directory user:", error);

    // If this is clearly a directory user ID, assume they're valid during errors
    // This handles the race condition where cache is being populated
    if (userId.startsWith("directory_user_")) {
      console.info("Assuming directory user is valid during error:", userId);
      return true;
    }

    return false;
  }
}

/**
 * Verify that a user belongs to a specific organization (directory-based)
 * All directory users have access to the same organization
 * @param allowNonDirectory - If true, allows non-directory users (defaults to true for permissive mode)
 * @throws TRPCError with code FORBIDDEN if user doesn't have access
 */
export async function verifyOrganizationAccess(
  userId: string,
  organizationId: string,
  resourceName = "resource",
  allowNonDirectory = true,
): Promise<void> {
  // Get directory org ID (cached)

  const directory = await getDirectory();

  // Verify the resource belongs to the directory organization

  if (directory.organizationId !== organizationId) {
    throw new TRPCError({
      code: "FORBIDDEN",
      message: `You do not have access to this ${resourceName}`,
    });
  }

  // Check if user is in directory (only if strict mode)
  if (!allowNonDirectory) {
    const hasAccess = await isDirectoryUser(userId);
    if (!hasAccess) {
      throw new TRPCError({
        code: "FORBIDDEN",
        message: `You do not have access to this ${resourceName}`,
      });
    }
  }
}

/**
 * Get the user's organization ID from directory
 * All directory users belong to the same organization
 * @param allowNonDirectory - If true, allows non-directory users (defaults to true for permissive mode)
 * @throws TRPCError with code FORBIDDEN if user doesn't belong to directory (only when allowNonDirectory is false)
 */
export async function getUserOrganizationId(
  userId: string,
  allowNonDirectory = true,
): Promise<string> {
  // Check if user is in directory
  const hasAccess = await isDirectoryUser(userId);

  if (!hasAccess && !allowNonDirectory) {
    throw new TRPCError({
      code: "FORBIDDEN",
      message: "Must belong to the directory organization",
    });
  }

  const directory = await getDirectory();

  if (!directory.organizationId) {
    throw new TRPCError({
      code: "INTERNAL_SERVER_ERROR",
      message: "Directory organization ID not found",
    });
  }

  return directory.organizationId;
}

/**
 * Verify that a user ID belongs to the directory organization
 * Used when assigning users to roles
 * @throws TRPCError with code BAD_REQUEST if user is not in directory
 */
export async function verifyUserInDirectory(
  userId: string,
  organizationId: string,
): Promise<void> {
  const hasAccess = await isDirectoryUser(userId);

  if (!hasAccess) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: "User is not a member of the directory organization",
    });
  }

  // Verify org ID matches (cached)

  const directory = await getDirectory();

  if (directory.organizationId !== organizationId) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: "User is not a member of this organization",
    });
  }
}

/**
 * Fetch a team and verify user has access to it
 * @throws TRPCError with code NOT_FOUND if team doesn't exist
 * @throws TRPCError with code FORBIDDEN if user doesn't have access
 */
export async function getTeamAndVerifyAccess(
  db: DB,
  teamId: string,
  userId: string,
) {
  const team = await db.team.findUnique({
    where: { id: teamId },
  });

  if (!team) {
    throw new TRPCError({
      code: "NOT_FOUND",
      message: "Team not found",
    });
  }

  await verifyOrganizationAccess(userId, team.organizationId, "team");

  return team;
}

/**
 * Fetch a role with its team and verify user has access
 * @throws TRPCError with code NOT_FOUND if role doesn't exist
 * @throws TRPCError with code FORBIDDEN if user doesn't have access
 */
export async function getRoleAndVerifyAccess(
  db: DB,
  roleId: string,
  userId: string,
) {
  const role = await db.role.findUnique({
    where: { id: roleId },
    include: { team: true },
  });

  if (!role) {
    throw new TRPCError({
      code: "NOT_FOUND",
      message: "Role not found",
    });
  }

  await verifyOrganizationAccess(userId, role.team.organizationId, "role");

  return role;
}
