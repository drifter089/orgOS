import { TRPCError } from "@trpc/server";
import { z } from "zod";

import { env } from "@/env";
import { createTRPCRouter, workspaceProcedure } from "@/server/api/trpc";
import { getTeamAndVerifyAccess } from "@/server/api/utils/authorization";

import {
  type RoleEnhancement,
  type SuggestedRole,
  enhanceRoleInput,
  generateRoleSuggestions,
} from "../services/ai/role-generator";

export const aiRoleRouter = createTRPCRouter({
  /**
   * Generate pre-loaded role suggestions for a team
   * Call this on page load to have suggestions ready when dialog opens
   */
  generateSuggestions: workspaceProcedure
    .input(
      z.object({
        teamId: z.string(),
      }),
    )
    .query(
      async ({
        ctx,
        input,
      }): Promise<{
        roles: SuggestedRole[];
        generatedAt: Date;
      }> => {
        // Verify user has access to this team
        const team = await getTeamAndVerifyAccess(
          ctx.db,
          input.teamId,
          ctx.user.id,
          ctx.workspace,
        );

        // Check if OpenRouter is configured
        if (!env.OPENROUTER_API_KEY) {
          throw new TRPCError({
            code: "PRECONDITION_FAILED",
            message:
              "AI features are not configured. Please set OPENROUTER_API_KEY.",
          });
        }

        // Get existing role titles to avoid duplicates
        const existingRoles = await ctx.db.role.findMany({
          where: { teamId: input.teamId },
          select: { title: true },
        });

        const existingRoleTitles = existingRoles.map((r) => r.title);

        const roles = await generateRoleSuggestions({
          teamName: team.name,
          existingRoleTitles,
        });

        return {
          roles,
          generatedAt: new Date(),
        };
      },
    ),

  /**
   * Enhance partial role input with AI suggestions
   * Call this as user types for real-time suggestions
   */
  enhanceInput: workspaceProcedure
    .input(
      z.object({
        teamId: z.string(),
        partialTitle: z.string().optional(),
        partialPurpose: z.string().optional(),
      }),
    )
    .query(async ({ ctx, input }): Promise<RoleEnhancement> => {
      // Verify user has access to this team
      await getTeamAndVerifyAccess(
        ctx.db,
        input.teamId,
        ctx.user.id,
        ctx.workspace,
      );

      // Check if OpenRouter is configured
      if (!env.OPENROUTER_API_KEY) {
        throw new TRPCError({
          code: "PRECONDITION_FAILED",
          message:
            "AI features are not configured. Please set OPENROUTER_API_KEY.",
        });
      }

      // Get existing role titles to avoid suggesting duplicates
      const existingRoles = await ctx.db.role.findMany({
        where: { teamId: input.teamId },
        select: { title: true },
      });

      const existingRoleTitles = existingRoles.map((r) => r.title);

      return enhanceRoleInput({
        partialTitle: input.partialTitle,
        partialPurpose: input.partialPurpose,
        existingRoleTitles,
      });
    }),
});
