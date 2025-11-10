import { z } from "zod";

import { createTRPCRouter, protectedProcedure } from "@/server/api/trpc";
import {
  getAllDirectoryUsers,
  getDirectory,
} from "@/server/api/utils/authorization";
import { workos } from "@/server/workos";

export const organizationRouter = createTRPCRouter({
  /**
   * Get the current user's organization data from Directory
   * Matches user by email to directory, returns directory organization
   */
  getCurrent: protectedProcedure.query(async ({ ctx }) => {
    try {
      // Get auth user
      const workosUser = await workos.userManagement.getUser(ctx.user.id);
      const authEmail = workosUser.email.toLowerCase();

      // Get directory details (cached)

      const directory = await getDirectory();

      // Get all directory users (cached)

      const allUsers = await getAllDirectoryUsers();

      // Find matched directory user

      const directoryUser = allUsers.find((user) => {
        return user.email?.toLowerCase() === authEmail;
      });

      if (!directoryUser) {
        return null;
      }

      // Return in the same format as before for frontend compatibility
      return {
        organization: {
          id: directory.organizationId,

          name: directory.name,
          object: "organization",
          // Map directory fields to organization structure

          createdAt: directory.createdAt,

          updatedAt: directory.updatedAt,
        },
        membership: {
          id: directoryUser.id,
          userId: ctx.user.id,

          organizationId: directory.organizationId,
          role: {
            // eslint-disable-next-line @typescript-eslint/prefer-nullish-coalescing
            slug: directoryUser.role?.slug || "member",
          },

          status: directoryUser.state,
        },

        directoryUser, // Include full directory user data
      };
    } catch (error) {
      console.error("Error fetching organization:", error);
      throw new Error("Failed to fetch organization data");
    }
  }),

  /**
   * Get all organizations the current user belongs to
   */
  getAll: protectedProcedure.query(async ({ ctx }) => {
    try {
      const memberships =
        await workos.userManagement.listOrganizationMemberships({
          userId: ctx.user.id,
        });

      if (!memberships.data || memberships.data.length === 0) {
        return [];
      }

      // Fetch full organization details for each membership
      const organizationsWithMemberships = await Promise.all(
        memberships.data.map(async (membership) => {
          const organization = await workos.organizations.getOrganization(
            membership.organizationId,
          );
          return {
            organization,
            membership,
          };
        }),
      );

      return organizationsWithMemberships;
    } catch (error) {
      console.error("Error fetching organizations:", error);
      throw new Error("Failed to fetch organizations");
    }
  }),

  /**
   * Get all members in a specific organization
   */
  getMembers: protectedProcedure
    .input(
      z.object({
        organizationId: z.string(),
      }),
    )
    .query(async ({ ctx, input }) => {
      try {
        // First verify that the current user is a member of this organization
        const userMemberships =
          await workos.userManagement.listOrganizationMemberships({
            userId: ctx.user.id,
            organizationId: input.organizationId,
          });

        if (!userMemberships.data || userMemberships.data.length === 0) {
          throw new Error(
            "You do not have permission to view members of this organization",
          );
        }

        // Get all members of the organization
        const allMemberships =
          await workos.userManagement.listOrganizationMemberships({
            organizationId: input.organizationId,
          });

        // Fetch user details for each membership
        const membersWithDetails = await Promise.all(
          allMemberships.data.map(async (membership) => {
            const user = await workos.userManagement.getUser(membership.userId);
            return {
              membership,
              user,
            };
          }),
        );

        return membersWithDetails;
      } catch (error) {
        console.error("Error fetching organization members:", error);
        if (error instanceof Error) {
          throw new Error(error.message);
        }
        throw new Error("Failed to fetch organization members");
      }
    }),

  /**
   * Get members in the current user's organization from Directory
   * Returns all directory users as organization members
   */
  getCurrentOrgMembers: protectedProcedure.query(async ({ ctx }) => {
    try {
      // Get directory details (cached)

      const directory = await getDirectory();

      // Get all directory users (cached)

      const allUsers = await getAllDirectoryUsers();

      // Transform directory users to match the expected format
      // This keeps the frontend compatible

      const membersWithDetails = allUsers.map((directoryUser) => {
        return {
          membership: {
            id: directoryUser.id, // Use directory user id as membership id

            userId: directoryUser.id,

            organizationId: directory.organizationId,
            role: {
              // eslint-disable-next-line @typescript-eslint/prefer-nullish-coalescing
              slug: directoryUser.role?.slug || "member",
            },

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

          directoryUser, // Include full directory user data
        };
      });

      return membersWithDetails;
    } catch (error) {
      console.error("Error fetching current organization members:", error);
      throw new Error("Failed to fetch organization members");
    }
  }),
});
