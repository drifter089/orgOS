import { z } from "zod";

import { createTRPCRouter, workspaceProcedure } from "@/server/api/trpc";
import { getDirectoryData } from "@/server/api/utils/authorization";
import { workos } from "@/server/workos";

export const organizationRouter = createTRPCRouter({
  getCurrent: workspaceProcedure.query(async ({ ctx }) => {
    if (ctx.workspace.type === "directory") {
      const { directory, users } = await getDirectoryData();

      const workosUser = await workos.userManagement.getUser(ctx.user.id);
      const userEmail = workosUser.email.toLowerCase();
      const directoryUser = users.find(
        (u) => u.email?.toLowerCase() === userEmail,
      );

      return {
        organization: {
          id: directory.organizationId,
          name: directory.name,
          object: "organization" as const,
          createdAt: directory.createdAt,
          updatedAt: directory.updatedAt,
        },
        membership: {
          id: directoryUser?.id ?? ctx.user.id,
          userId: ctx.user.id,
          organizationId: directory.organizationId,
          role: { slug: directoryUser?.role?.slug ?? "member" },
          status: directoryUser?.state ?? "active",
        },
        directoryUser,
      };
    }

    if (ctx.workspace.type === "organization") {
      const memberships =
        await workos.userManagement.listOrganizationMemberships({
          userId: ctx.user.id,
          organizationId: ctx.workspace.organizationId,
        });

      if (!memberships.data[0]) return null;

      const organization = await workos.organizations.getOrganization(
        ctx.workspace.organizationId,
      );

      return {
        organization,
        membership: memberships.data[0],
      };
    }

    return {
      organization: {
        id: ctx.workspace.organizationId,
        name: "Personal Workspace",
        object: "organization" as const,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
      membership: {
        id: ctx.user.id,
        userId: ctx.user.id,
        organizationId: ctx.workspace.organizationId,
        role: { slug: "owner" },
        status: "active",
      },
    };
  }),

  getCurrentOrgMembers: workspaceProcedure.query(async ({ ctx }) => {
    if (ctx.workspace.type === "directory") {
      const { directory, users } = await getDirectoryData();

      return users.map((directoryUser) => ({
        membership: {
          id: directoryUser.id,
          userId: directoryUser.id,
          organizationId: directory.organizationId,
          role: { slug: directoryUser.role?.slug ?? "member" },
          status: directoryUser.state,
          createdAt: directoryUser.createdAt,
          updatedAt: directoryUser.updatedAt,
        },
        user: {
          id: directoryUser.id,
          email: directoryUser.email,
          firstName: directoryUser.firstName,
          lastName: directoryUser.lastName,
          emailVerified: directoryUser.state === "active",
          profilePictureUrl:
            (directoryUser as unknown as Record<string, unknown>).avatarUrl ??
            null,
          jobTitle: directoryUser.jobTitle,
          groups: directoryUser.groups,
          customAttributes: directoryUser.customAttributes,
        },
        directoryUser,
      }));
    }

    if (ctx.workspace.type === "organization") {
      const memberships =
        await workos.userManagement.listOrganizationMemberships({
          organizationId: ctx.workspace.organizationId,
        });

      const membersWithDetails = await Promise.all(
        memberships.data.map(async (membership) => {
          const user = await workos.userManagement.getUser(membership.userId);
          return { membership, user };
        }),
      );

      return membersWithDetails;
    }

    const currentUser = await workos.userManagement.getUser(ctx.user.id);

    return [
      {
        membership: {
          id: ctx.user.id,
          userId: ctx.user.id,
          organizationId: ctx.workspace.organizationId,
          role: { slug: "owner" },
          status: "active",
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        },
        user: currentUser,
      },
    ];
  }),

  getOrganization: workspaceProcedure
    .input(z.object({ id: z.string() }))
    .query(async ({ ctx, input }) => {
      if (input.id !== ctx.workspace.organizationId) {
        return null;
      }

      if (ctx.workspace.type === "directory") {
        const { directory } = await getDirectoryData();
        return {
          id: directory.organizationId,
          name: directory.name,
          object: "organization" as const,
          createdAt: directory.createdAt,
          updatedAt: directory.updatedAt,
        };
      }

      if (ctx.workspace.type === "organization") {
        return workos.organizations.getOrganization(input.id);
      }

      return {
        id: ctx.workspace.organizationId,
        name: "Personal Workspace",
        object: "organization" as const,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
    }),

  getOrganizationMembers: workspaceProcedure
    .input(z.object({ organizationId: z.string() }))
    .query(async ({ ctx, input }) => {
      if (input.organizationId !== ctx.workspace.organizationId) {
        return [];
      }

      if (ctx.workspace.type === "directory") {
        const { directory, users } = await getDirectoryData();

        return users.map((directoryUser) => ({
          id: directoryUser.id,
          userId: directoryUser.id,
          organizationId: directory.organizationId,
          role: { slug: directoryUser.role?.slug ?? "member" },
          status: directoryUser.state,
          createdAt: directoryUser.createdAt,
          updatedAt: directoryUser.updatedAt,
        }));
      }

      if (ctx.workspace.type === "organization") {
        const memberships =
          await workos.userManagement.listOrganizationMemberships({
            organizationId: input.organizationId,
          });
        return memberships.data;
      }

      return [
        {
          id: ctx.user.id,
          userId: ctx.user.id,
          organizationId: ctx.workspace.organizationId,
          role: { slug: "owner" },
          status: "active",
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        },
      ];
    }),
});
