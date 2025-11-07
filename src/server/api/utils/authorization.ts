import { TRPCError } from "@trpc/server";

import { type db as PrismaClient } from "@/server/db";
import { workos } from "@/server/workos";

/**
 * Verify that a user belongs to a specific organization
 * @throws TRPCError with code FORBIDDEN if user doesn't have access
 */
export async function verifyOrganizationAccess(
  userId: string,
  organizationId: string,
  resourceName = "resource",
): Promise<void> {
  const memberships = await workos.userManagement.listOrganizationMemberships({
    userId,
    organizationId,
  });

  if (!memberships.data.length) {
    throw new TRPCError({
      code: "FORBIDDEN",
      message: `You do not have access to this ${resourceName}`,
    });
  }
}

/**
 * Get the user's first organization ID
 * @throws TRPCError with code FORBIDDEN if user doesn't belong to any organization
 */
export async function getUserOrganizationId(userId: string): Promise<string> {
  const memberships = await workos.userManagement.listOrganizationMemberships({
    userId,
    limit: 1,
  });

  if (!memberships.data[0]) {
    throw new TRPCError({
      code: "FORBIDDEN",
      message: "Must belong to an organization",
    });
  }

  return memberships.data[0].organizationId;
}

/**
 * Fetch a team and verify user has access to it
 * @throws TRPCError with code NOT_FOUND if team doesn't exist
 * @throws TRPCError with code FORBIDDEN if user doesn't have access
 */
export async function getTeamAndVerifyAccess(
  db: typeof PrismaClient,
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
  db: typeof PrismaClient,
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
