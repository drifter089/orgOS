import { TRPCError } from "@trpc/server";
import type {
  Directory,
  Organization as WorkOSOrganization,
} from "@workos-inc/node";

import { type db } from "@/server/db";
import { workos } from "@/server/workos";

type DB = typeof db;

/**
 * Workspace context - all data from WorkOS, no local DB.
 */
export type WorkspaceContext = {
  organizationId: string;
  organization: WorkOSOrganization;
  directory?: Directory;
};

/**
 * Gets workspace context for a user.
 * Returns null if user has no organization (needs to create one).
 */
export async function getWorkspaceContext(
  userId: string,
): Promise<WorkspaceContext | null> {
  const memberships = await workos.userManagement.listOrganizationMemberships({
    userId,
    limit: 1,
  });

  if (memberships.data.length === 0) {
    return null;
  }

  const organizationId = memberships.data[0]!.organizationId;

  const [organization, directories] = await Promise.all([
    workos.organizations.getOrganization(organizationId),
    workos.directorySync.listDirectories({ organizationId }),
  ]);

  return {
    organizationId,
    organization,
    directory: directories.data[0], // undefined if no directory
  };
}

/**
 * Creates a new organization for a user.
 */
export async function createOrganizationForUser(
  userId: string,
  orgName: string,
): Promise<WorkspaceContext> {
  const organization = await workos.organizations.createOrganization({
    name: orgName,
  });

  await workos.userManagement.createOrganizationMembership({
    userId,
    organizationId: organization.id,
    roleSlug: "admin",
  });

  return { organizationId: organization.id, organization };
}

/**
 * Validates that a user can be assigned within an organization.
 * Checks directory users if SCIM configured, else org memberships.
 */
export async function validateUserAssignable(
  workspace: WorkspaceContext,
  userId: string,
): Promise<void> {
  if (workspace.directory) {
    const dirUsers = await workos.directorySync.listUsers({
      directory: workspace.directory.id,
      limit: 100,
    });
    const isAssignable = dirUsers.data.some((u) => u.id === userId);
    if (!isAssignable) {
      throw new TRPCError({
        code: "BAD_REQUEST",
        message: "User cannot be assigned to this role",
      });
    }
  } else {
    const memberships = await workos.userManagement.listOrganizationMemberships(
      {
        organizationId: workspace.organizationId,
        userId,
        limit: 1,
      },
    );
    if (memberships.data.length === 0) {
      throw new TRPCError({
        code: "BAD_REQUEST",
        message: "User cannot be assigned to this role",
      });
    }
  }
}

export async function verifyResourceAccess(
  db: DB,
  userId: string,
  resourceOrganizationId: string,
  resourceType: string,
  workspaceContext?: WorkspaceContext,
): Promise<void> {
  const workspace = workspaceContext ?? (await getWorkspaceContext(userId));

  if (!workspace) {
    throw new TRPCError({
      code: "PRECONDITION_FAILED",
      message: "No organization found. Please create one first.",
    });
  }

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
  workspaceContext?: WorkspaceContext,
) {
  const team = await db.team.findUnique({
    where: { id: teamId },
  });

  if (!team) {
    throw new TRPCError({ code: "NOT_FOUND", message: "Team not found" });
  }

  await verifyResourceAccess(
    db,
    userId,
    team.organizationId,
    "team",
    workspaceContext,
  );
  return team;
}

export async function getRoleAndVerifyAccess(
  db: DB,
  roleId: string,
  userId: string,
  workspaceContext?: WorkspaceContext,
) {
  const role = await db.role.findUnique({
    where: { id: roleId },
    include: { team: true },
  });

  if (!role) {
    throw new TRPCError({ code: "NOT_FOUND", message: "Role not found" });
  }

  await verifyResourceAccess(
    db,
    userId,
    role.team.organizationId,
    "role",
    workspaceContext,
  );
  return role;
}

export async function getIntegrationAndVerifyAccess(
  db: DB,
  connectionId: string,
  userId: string,
  workspaceContext?: WorkspaceContext,
) {
  const integration = await db.integration.findUnique({
    where: { connectionId },
  });

  if (!integration) {
    throw new TRPCError({
      code: "NOT_FOUND",
      message: "Integration not found",
    });
  }

  await verifyResourceAccess(
    db,
    userId,
    integration.organizationId,
    "integration",
    workspaceContext,
  );
  return integration;
}

/**
 * Get DashboardChart and verify organization ownership.
 * Throws TRPC errors if not found or access denied.
 */
export async function getDashboardChartAndVerifyAccess(
  database: DB,
  dashboardChartId: string,
  organizationId: string,
) {
  const dashboardChart = await database.dashboardChart.findUnique({
    where: { id: dashboardChartId },
  });

  if (!dashboardChart) {
    throw new TRPCError({
      code: "NOT_FOUND",
      message: "DashboardChart not found",
    });
  }

  if (dashboardChart.organizationId !== organizationId) {
    throw new TRPCError({
      code: "FORBIDDEN",
      message: "You do not have access to this dashboard chart",
    });
  }

  return dashboardChart;
}
