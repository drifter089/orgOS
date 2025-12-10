import { createOpenRouter } from "@openrouter/ai-sdk-provider";
import { TRPCError } from "@trpc/server";
import { generateText } from "ai";
import { z } from "zod";

import { env } from "@/env";
import { createTRPCRouter, publicProcedure } from "@/server/api/trpc";

async function generateFeedbackTitle(
  message: string,
): Promise<{ title: string; description: string }> {
  if (!env.OPENROUTER_API_KEY) {
    return {
      title: "User Feedback",
      description: message,
    };
  }

  try {
    const openrouter = createOpenRouter({
      apiKey: env.OPENROUTER_API_KEY,
    });

    const result = await generateText({
      model: openrouter("anthropic/claude-sonnet-4"),
      system: `You are a concise issue title generator. Given user feedback, generate a brief, descriptive title (max 60 chars) and optionally clean up the description.

IMPORTANT RULES:
1. Keep the user's original wording in the description - do NOT heavily rewrite or add extra text
2. The title should be a concise summary (like a bug report or feature request title)
3. Only fix obvious typos or formatting issues in the description, keep the user's voice
4. Do NOT add technical jargon or corporate speak the user didn't use

You MUST respond with ONLY a valid JSON object in this exact format:
{
  "title": "Brief descriptive title",
  "description": "The user's feedback with minimal cleanup"
}`,
      prompt: `Generate a title and cleaned description for this user feedback:\n\n${message}`,
      temperature: 0.3,
      maxOutputTokens: 300,
    });

    let cleaned = result.text.trim();
    if (cleaned.startsWith("```json")) {
      cleaned = cleaned.slice(7);
    } else if (cleaned.startsWith("```")) {
      cleaned = cleaned.slice(3);
    }
    if (cleaned.endsWith("```")) {
      cleaned = cleaned.slice(0, -3);
    }
    cleaned = cleaned.trim();

    const parsed = JSON.parse(cleaned) as {
      title: string;
      description: string;
    };
    return {
      title: parsed.title || "User Feedback",
      description: parsed.description || message,
    };
  } catch (error) {
    console.error("[Feedback] AI title generation failed:", error);
    return {
      title: "User Feedback",
      description: message,
    };
  }
}

export const feedbackRouter = createTRPCRouter({
  submit: publicProcedure
    .input(
      z.object({
        message: z.string().min(1, "Feedback message is required").max(5000),
        priority: z.number().min(0).max(4).optional().default(0),
        pageUrl: z.string().optional(),
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
        const { title, description } = await generateFeedbackTitle(
          input.message,
        );

        const fullDescription = input.pageUrl
          ? `${description}\n\n---\n**Page:** ${input.pageUrl}`
          : description;

        const mutation = `
          mutation IssueCreate($title: String!, $teamId: String!, $description: String, $priority: Int) {
            issueCreate(input: {
              title: $title
              description: $description
              teamId: $teamId
              priority: $priority
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
          title,
          teamId: env.LINEAR_TEAM_ID,
          description: fullDescription,
          priority: input.priority,
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
