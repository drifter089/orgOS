import { TRPCError } from "@trpc/server";
import type { Directory, DirectoryUserWithGroups } from "@workos-inc/node";

import { env } from "@/env";
import { type db } from "@/server/db";
import { workos } from "@/server/workos";

type DB = typeof db;

const CACHE_TTL = 5 * 60 * 1000;

let directoryUsersCache: {
  data: DirectoryUserWithGroups[];
  timestamp: number;
} | null = null;

let directoryCache: {
  data: Directory;
  timestamp: number;
} | null = null;

export type WorkspaceContext =
  | {
      type: "personal";
      organizationId: string;
      assignableUserIds: string[];
    }
  | {
      type: "organization";
      organizationId: string;
      assignableUserIds: string[];
    }
  | {
      type: "directory";
      organizationId: string;
      assignableUserIds: string[];
      directoryId: string;
    };

async function fetchDirectoryUsers(): Promise<DirectoryUserWithGroups[]> {
  if (!env.WORKOS_DIR_ID) {
    throw new Error("WORKOS_DIR_ID not configured");
  }

  const allUsers: DirectoryUserWithGroups[] = [];
  let after: string | undefined;
  let hasMore = true;

  while (hasMore) {
    const response = await workos.directorySync.listUsers({
      directory: env.WORKOS_DIR_ID,
      limit: 100,
      after,
    });
    allUsers.push(...response.data);
    after = response.listMetadata?.after;
    hasMore = !!after;
  }

  return allUsers;
}

async function getDirectoryUsers(): Promise<DirectoryUserWithGroups[]> {
  if (
    directoryUsersCache &&
    Date.now() - directoryUsersCache.timestamp < CACHE_TTL
  ) {
    return directoryUsersCache.data;
  }

  const users = await fetchDirectoryUsers();
  directoryUsersCache = { data: users, timestamp: Date.now() };
  return users;
}

async function getDirectory(): Promise<Directory> {
  if (!env.WORKOS_DIR_ID) {
    throw new Error("WORKOS_DIR_ID not configured");
  }

  if (directoryCache && Date.now() - directoryCache.timestamp < CACHE_TTL) {
    return directoryCache.data;
  }

  const directory = await workos.directorySync.getDirectory(env.WORKOS_DIR_ID);
  directoryCache = { data: directory, timestamp: Date.now() };
  return directory;
}

async function checkDirectoryMembership(
  userId: string,
): Promise<{ isMember: boolean; directoryUser?: DirectoryUserWithGroups }> {
  try {
    const directoryUsers = await getDirectoryUsers();

    if (userId.startsWith("directory_user_")) {
      const directoryUser = directoryUsers.find((u) => u.id === userId);
      return { isMember: !!directoryUser, directoryUser };
    }

    const workosUser = await workos.userManagement.getUser(userId);
    const userEmail = workosUser.email.toLowerCase();
    const directoryUser = directoryUsers.find(
      (u) => u.email?.toLowerCase() === userEmail,
    );

    return { isMember: !!directoryUser, directoryUser };
  } catch (error) {
    console.error("[AUTH] Directory membership check failed:", error);
    return { isMember: false };
  }
}

async function checkOrganizationMembership(userId: string): Promise<{
  isMember: boolean;
  organizationId?: string;
  memberIds?: string[];
}> {
  try {
    const memberships = await workos.userManagement.listOrganizationMemberships(
      { userId, limit: 1 },
    );

    if (!memberships.data.length) {
      return { isMember: false };
    }

    const organizationId = memberships.data[0]!.organizationId;
    const allMemberships =
      await workos.userManagement.listOrganizationMemberships({
        organizationId,
      });

    const memberIds = allMemberships.data.map((m) => m.userId);

    return { isMember: true, organizationId, memberIds };
  } catch (error) {
    console.error("[AUTH] Organization membership check failed:", error);
    return { isMember: false };
  }
}

export async function getWorkspaceContext(
  userId: string,
): Promise<WorkspaceContext> {
  const directoryCheck = await checkDirectoryMembership(userId);

  if (directoryCheck.isMember) {
    try {
      const directory = await getDirectory();

      if (!directory.organizationId) {
        console.error("[AUTH] Directory missing organizationId");
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Service configuration error",
        });
      }

      const directoryUsers = await getDirectoryUsers();
      const assignableUserIds = directoryUsers.map((u) => u.id);

      if (!env.WORKOS_DIR_ID) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Service configuration error",
        });
      }

      return {
        type: "directory",
        organizationId: directory.organizationId,
        assignableUserIds,
        directoryId: env.WORKOS_DIR_ID,
      };
    } catch (error) {
      console.error("[AUTH] Failed to load directory context:", error);
      throw new TRPCError({
        code: "INTERNAL_SERVER_ERROR",
        message: "Failed to load workspace",
      });
    }
  }

  const orgCheck = await checkOrganizationMembership(userId);

  if (orgCheck.isMember && orgCheck.organizationId) {
    return {
      type: "organization",
      organizationId: orgCheck.organizationId,
      assignableUserIds: orgCheck.memberIds ?? [userId],
    };
  }

  return {
    type: "personal",
    organizationId: `user:${userId}`,
    assignableUserIds: [userId],
  };
}

export async function verifyResourceAccess(
  db: DB,
  userId: string,
  resourceOrganizationId: string,
  resourceType: string,
): Promise<void> {
  const workspace = await getWorkspaceContext(userId);

  if (workspace.organizationId !== resourceOrganizationId) {
    throw new TRPCError({
      code: "FORBIDDEN",
      message: `Access denied to ${resourceType}`,
    });
  }
}

export async function getTeamAndVerifyAccess(
  db: DB,
  teamId: string,
  userId: string,
) {
  const team = await db.team.findUnique({ where: { id: teamId } });

  if (!team) {
    throw new TRPCError({ code: "NOT_FOUND", message: "Team not found" });
  }

  await verifyResourceAccess(db, userId, team.organizationId, "team");
  return team;
}

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
    throw new TRPCError({ code: "NOT_FOUND", message: "Role not found" });
  }

  await verifyResourceAccess(db, userId, role.team.organizationId, "role");
  return role;
}

export async function getDirectoryData() {
  try {
    const directory = await getDirectory();
    const users = await getDirectoryUsers();
    return { directory, users };
  } catch (error) {
    console.error("[AUTH] Failed to fetch directory data:", error);
    throw new TRPCError({
      code: "INTERNAL_SERVER_ERROR",
      message: "Failed to load directory",
    });
  }
}
