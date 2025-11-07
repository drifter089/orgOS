import { WorkOS } from "@workos-inc/node";
import { z } from "zod";

import { createTRPCRouter, protectedProcedure } from "@/server/api/trpc";

// Initialize WorkOS client
const workos = new WorkOS(process.env.WORKOS_API_KEY);

export const organizationRouter = createTRPCRouter({
  /**
   * Get the current user's organization data
   * Returns the first organization the user belongs to
   */
  getCurrent: protectedProcedure.query(async ({ ctx }) => {
    try {
      // Get all organization memberships for the current user
      const memberships =
        await workos.userManagement.listOrganizationMemberships({
          userId: ctx.user.id,
          limit: 1, // Get the first organization
        });

      if (!memberships.data || memberships.data.length === 0) {
        return null;
      }

      const membership = memberships.data[0];
      if (!membership) {
        return null;
      }

      // Get full organization details using organizations API
      const organization = await workos.organizations.getOrganization(
        membership.organizationId,
      );

      return {
        organization,
        membership,
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
   * Get members in the current user's organization
   * Automatically uses the first organization the user belongs to
   */
  getCurrentOrgMembers: protectedProcedure.query(async ({ ctx }) => {
    try {
      // Get the user's first organization
      const memberships =
        await workos.userManagement.listOrganizationMemberships({
          userId: ctx.user.id,
          limit: 1,
        });

      if (!memberships.data || memberships.data.length === 0) {
        return [];
      }

      const firstMembership = memberships.data[0];
      if (!firstMembership) {
        return [];
      }

      const organizationId = firstMembership.organizationId;

      // Get all members of that organization
      const allMemberships =
        await workos.userManagement.listOrganizationMemberships({
          organizationId,
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
      console.error("Error fetching current organization members:", error);
      throw new Error("Failed to fetch organization members");
    }
  }),
});
