/**
 * AI Role Generator Service
 *
 * Uses OpenRouter (Claude) to generate role suggestions for teams.
 * - Pre-generated roles based on team context
 * - Real-time title/purpose enhancements as user types
 */
import { createOpenRouter } from "@openrouter/ai-sdk-provider";
import { generateText } from "ai";
import { z } from "zod";

import { env } from "@/env";
import { ROLE_COLORS } from "@/lib/utils";

// =============================================================================
// Types
// =============================================================================

export interface SuggestedRole {
  title: string;
  purpose: string;
  accountabilities: string;
  category: "professional" | "creative";
  color: string;
}

export interface RoleEnhancement {
  titleSuggestions: string[];
  purposeSuggestion?: string;
  accountabilitiesSuggestion?: string;
}

// =============================================================================
// Schemas for Validation
// =============================================================================

const suggestedRoleSchema = z.object({
  title: z.string(),
  purpose: z.string(),
  accountabilities: z.string(),
  category: z.enum(["professional", "creative"]),
});

const suggestionsResponseSchema = z.object({
  roles: z.array(suggestedRoleSchema),
});

const enhancementResponseSchema = z.object({
  titleSuggestions: z.array(z.string()),
  purposeSuggestion: z.string().optional(),
  accountabilitiesSuggestion: z.string().optional(),
});

// =============================================================================
// Prompts
// =============================================================================

const ROLE_GENERATION_SYSTEM_PROMPT = `You are a creative organizational designer who helps teams define clear, impactful roles.

Your task is to suggest roles for a team. Generate a mix of:
- **Professional roles**: Industry-standard titles with clear responsibilities (e.g., "Technical Lead", "Product Owner")
- **Creative roles**: Fun, memorable titles that still have real responsibilities (e.g., "Bug Whisperer", "Sprint Shepherd")

Guidelines:
- Each role should have a clear, distinct purpose (2-3 sentences)
- Accountabilities should be specific and actionable (3-5 bullet points as a single string, separated by newlines)
- Don't duplicate existing role titles
- Creative roles should be fun but functional

You MUST respond with ONLY a valid JSON object in this exact format, no other text:
{
  "roles": [
    {
      "title": "Role Title",
      "purpose": "2-3 sentences describing the role's core purpose.",
      "accountabilities": "- First accountability\\n- Second accountability\\n- Third accountability",
      "category": "professional"
    }
  ]
}

The category must be either "professional" or "creative".`;

const ENHANCEMENT_SYSTEM_PROMPT = `You are a helpful assistant that improves role definitions.

Given a partial role title or description, suggest:
1. Better/catchier title alternatives (mix of professional and fun options)
2. A clearer, more compelling purpose statement
3. Well-defined accountabilities

You MUST respond with ONLY a valid JSON object in this exact format, no other text:
{
  "titleSuggestions": ["Title 1", "Title 2", "Title 3"],
  "purposeSuggestion": "Enhanced purpose description",
  "accountabilitiesSuggestion": "- First accountability\\n- Second accountability"
}`;

// =============================================================================
// Helper Functions
// =============================================================================

function getOpenRouterClient() {
  if (!env.OPENROUTER_API_KEY) {
    throw new Error("OPENROUTER_API_KEY is not configured");
  }
  return createOpenRouter({
    apiKey: env.OPENROUTER_API_KEY,
  });
}

/**
 * Extract JSON from a response that might have markdown code blocks
 */
function extractJSON(text: string): string {
  // Remove markdown code blocks if present
  let cleaned = text.trim();

  if (cleaned.startsWith("```json")) {
    cleaned = cleaned.slice(7);
  } else if (cleaned.startsWith("```")) {
    cleaned = cleaned.slice(3);
  }

  if (cleaned.endsWith("```")) {
    cleaned = cleaned.slice(0, -3);
  }

  return cleaned.trim();
}

// =============================================================================
// AI Generator Functions
// =============================================================================

/**
 * Generate pre-loaded role suggestions for a team
 */
export async function generateRoleSuggestions(input: {
  teamName: string;
  existingRoleTitles: string[];
}): Promise<SuggestedRole[]> {
  const openrouter = getOpenRouterClient();

  const userPrompt = `Team: "${input.teamName}"

Existing roles in this team:
${input.existingRoleTitles.length > 0 ? input.existingRoleTitles.map((t) => `- ${t}`).join("\n") : "- (No roles yet)"}

Generate 4-5 role suggestions for this team. Include a mix of professional and creative roles.
DO NOT suggest any role that duplicates or closely resembles the existing roles listed above.

Remember: Respond with ONLY valid JSON, no markdown, no explanations.`;

  const result = await generateText({
    model: openrouter("anthropic/claude-sonnet-4"),
    system: ROLE_GENERATION_SYSTEM_PROMPT,
    prompt: userPrompt,
    temperature: 0.7,
    maxOutputTokens: 2000,
  });

  const jsonText = extractJSON(result.text);

  let parsed: unknown;
  try {
    parsed = JSON.parse(jsonText);
  } catch {
    console.error("Failed to parse AI response as JSON:", result.text);
    throw new Error("AI returned invalid JSON response");
  }

  const validated = suggestionsResponseSchema.parse(parsed);

  // Assign colors to roles
  return validated.roles.map((role, index) => ({
    ...role,
    color: ROLE_COLORS[index % ROLE_COLORS.length]!,
  }));
}

/**
 * Enhance partial role input with suggestions
 */
export async function enhanceRoleInput(input: {
  partialTitle?: string;
  partialPurpose?: string;
  existingRoleTitles: string[];
}): Promise<RoleEnhancement> {
  const openrouter = getOpenRouterClient();

  const userPrompt = `Current input:
${input.partialTitle ? `Title: "${input.partialTitle}"` : "Title: (not provided)"}
${input.partialPurpose ? `Purpose: "${input.partialPurpose}"` : "Purpose: (not provided)"}

Existing roles in this team (avoid similar suggestions):
${input.existingRoleTitles.length > 0 ? input.existingRoleTitles.map((t) => `- ${t}`).join("\n") : "- (No roles yet)"}

Suggest improvements and alternatives. If a title is provided, suggest creative variations.
If purpose is provided, enhance it. If nothing is provided, suggest general role ideas.

Remember: Respond with ONLY valid JSON, no markdown, no explanations.`;

  const result = await generateText({
    model: openrouter("anthropic/claude-sonnet-4"),
    system: ENHANCEMENT_SYSTEM_PROMPT,
    prompt: userPrompt,
    temperature: 0.7,
    maxOutputTokens: 1000,
  });

  const jsonText = extractJSON(result.text);

  let parsed: unknown;
  try {
    parsed = JSON.parse(jsonText);
  } catch {
    console.error("Failed to parse AI response as JSON:", result.text);
    throw new Error("AI returned invalid JSON response");
  }

  return enhancementResponseSchema.parse(parsed);
}
