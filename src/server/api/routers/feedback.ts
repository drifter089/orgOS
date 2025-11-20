import { TRPCError } from "@trpc/server";
import { z } from "zod";

import { env } from "@/env";
import { createTRPCRouter, publicProcedure } from "@/server/api/trpc";

export const feedbackRouter = createTRPCRouter({
  submit: publicProcedure
    .input(
      z.object({
        message: z.string().min(1, "Feedback message is required").max(5000),
      }),
    )
    .mutation(async ({ input }) => {
      if (!env.LINEAR_API_KEY || !env.LINEAR_TEAM_ID) {
        console.error("[Feedback] Linear API credentials not configured");
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Feedback system is not configured",
        });
      }

      try {
        const mutation = `
          mutation IssueCreate($title: String!, $teamId: String!, $description: String) {
            issueCreate(input: {
              title: $title
              description: $description
              teamId: $teamId
            }) {
              success
              issue {
                id
                identifier
                title
                url
              }
            }
          }
        `;

        const variables = {
          title: "User Feedback",
          teamId: env.LINEAR_TEAM_ID,
          description: input.message,
        };

        const response = await fetch("https://api.linear.app/graphql", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: env.LINEAR_API_KEY,
          },
          body: JSON.stringify({
            query: mutation,
            variables,
          }),
        });

        const data = (await response.json()) as {
          data?: {
            issueCreate?: {
              success: boolean;
              issue?: { id: string; identifier: string; title: string };
            };
          };
          errors?: Array<{ message: string; extensions?: unknown }>;
        };

        if (!response.ok) {
          console.error(
            "[Feedback] Linear API HTTP error:",
            response.status,
            response.statusText,
          );
          console.error(
            "[Feedback] Response body:",
            JSON.stringify(data, null, 2),
          );
          throw new TRPCError({
            code: "INTERNAL_SERVER_ERROR",
            message: "Failed to submit feedback",
          });
        }

        if (data.errors) {
          console.error(
            "[Feedback] Linear GraphQL errors:",
            JSON.stringify(data.errors, null, 2),
          );
          throw new TRPCError({
            code: "INTERNAL_SERVER_ERROR",
            message: `Failed to submit feedback: ${data.errors[0]?.message ?? "Unknown error"}`,
          });
        }

        if (!data.data?.issueCreate?.success) {
          console.error("[Feedback] Linear issue creation failed");
          throw new TRPCError({
            code: "INTERNAL_SERVER_ERROR",
            message: "Failed to submit feedback",
          });
        }

        return {
          success: true,
          issueId: data.data.issueCreate.issue?.identifier,
        };
      } catch (error) {
        if (error instanceof TRPCError) {
          throw error;
        }
        console.error("[Feedback] Unexpected error:", error);
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to submit feedback",
        });
      }
    }),
});
