import { createOpenRouter } from "@openrouter/ai-sdk-provider";
import { type CoreMessage, streamText } from "ai";

import { env } from "@/env";

export async function POST(req: Request) {
  try {
    const { messages } = (await req.json()) as { messages: CoreMessage[] };

    const openrouter = createOpenRouter({
      apiKey: env.OPENROUTER_API_KEY,
    });

    const result = streamText({
      model: openrouter("anthropic/claude-3.5-sonnet"),
      messages,
    });

    return result.toTextStreamResponse();
  } catch (error) {
    console.error("OpenRouter API error:", error);
    return new Response(
      JSON.stringify({ error: "Failed to process request" }),
      {
        status: 500,
        headers: { "Content-Type": "application/json" },
      },
    );
  }
}
