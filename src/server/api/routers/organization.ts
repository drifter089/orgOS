import { z } from "zod";

import {
  createTRPCRouter,
  protectedProcedure,
  workspaceProcedure,
} from "@/server/api/trpc";
import {
  createOrganizationForUser,
  getWorkspaceContext,
} from "@/server/api/utils/authorization";
import { workos } from "@/server/workos";

type Member = {
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

export const organizationRouter = createTRPCRouter({
  /**
   * Get current organization info and user.
   * Returns null if user has no organization.
   */
  getCurrent: protectedProcedure.query(async ({ ctx }) => {
    const workspace = await getWorkspaceContext(ctx.user.id);

    if (!workspace) {
      return null;
    }

    const currentUser = await workos.userManagement.getUser(ctx.user.id);

    return {
      organization: workspace.organization,
      organizationId: workspace.organizationId,
      directory: workspace.directory ?? null,
      hasDirectorySync: !!workspace.directory,
      currentUser,
    };
  }),

  /**
   * Create a new organization for the current user.
   */
  create: protectedProcedure
    .input(z.object({ name: z.string().min(1).max(100) }))
    .mutation(async ({ ctx, input }) => {
      const existing = await getWorkspaceContext(ctx.user.id);
      if (existing) {
        return existing;
      }
      return createOrganizationForUser(ctx.user.id, input.name);
    }),

  /**
   * Get all members - combines directory users + org members.
   * Single source: WorkOS. Deduplicates by email.
   */
  getMembers: workspaceProcedure.query(async ({ ctx }) => {
    const memberMap = new Map<string, Member>();
    const orgMemberEmails = new Set<string>();

    const memberships = await workos.userManagement.listOrganizationMemberships(
      {
        organizationId: ctx.workspace.organizationId,
      },
    );

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

    if (ctx.workspace.directory) {
      let after: string | undefined;
      do {
        const response = await workos.directorySync.listUsers({
          directory: ctx.workspace.directory.id,
          limit: 100,
          after,
        });

        for (const dirUser of response.data) {
          if (dirUser.email) {
            const emailLower = dirUser.email.toLowerCase();
            const isOrgMember = orgMemberEmails.has(emailLower);
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
  }),
});
