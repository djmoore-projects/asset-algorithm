import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getAnthropicClient, AI_MODEL, MAX_TOKENS } from "@/lib/ai/client";
import { SYSTEM_PROMPT } from "@/lib/ai/prompts/system";
import { AI_TOOLS } from "@/lib/ai/tools/definitions";
import { handleToolCall } from "@/lib/ai/tools/handlers";
import { rateLimit, RATE_LIMITS } from "@/lib/rate-limit";

export const maxDuration = 60;

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      return new Response("Unauthorized", { status: 401 });
    }

    const { success, remaining } = rateLimit(`ai:${user.id}`, RATE_LIMITS.ai);
    if (!success) {
      return NextResponse.json(
        { error: "Rate limit exceeded. Please try again shortly." },
        { status: 429, headers: { "Retry-After": "60" } }
      );
    }

    const { messages } = await request.json();
    const anthropic = getAnthropicClient();

    const conversationMessages = messages.map(
      (m: { role: string; content: string }) => ({
        role: m.role as "user" | "assistant",
        content: m.content,
      })
    );

    // Agentic loop with tool use
    let currentMessages = [...conversationMessages];
    let finalResponse = "";
    let iterations = 0;
    const maxIterations = 5;

    while (iterations < maxIterations) {
      iterations++;

      const response = await anthropic.messages.create({
        model: AI_MODEL,
        max_tokens: MAX_TOKENS,
        system: SYSTEM_PROMPT,
        tools: AI_TOOLS,
        messages: currentMessages,
      });

      const toolUseBlocks = response.content.filter((b) => b.type === "tool_use");
      const textBlocks = response.content.filter((b) => b.type === "text");

      if (toolUseBlocks.length === 0) {
        finalResponse = textBlocks
          .map((b) => ("text" in b ? b.text : ""))
          .join("");
        break;
      }

      // Process tool calls
      currentMessages.push({
        role: "assistant" as const,
        content: response.content,
      });

      const toolResults = await Promise.all(
        toolUseBlocks.map(async (toolBlock) => {
          if (toolBlock.type !== "tool_use") return null;
          const result = await handleToolCall(
            toolBlock.name,
            toolBlock.input as Record<string, unknown>,
            user.id
          );
          return {
            type: "tool_result" as const,
            tool_use_id: toolBlock.id,
            content: result,
          };
        })
      );

      currentMessages.push({
        role: "user" as const,
        content: toolResults.filter(Boolean) as Array<{
          type: "tool_result";
          tool_use_id: string;
          content: string;
        }>,
      });

      if (textBlocks.length > 0) {
        finalResponse += textBlocks
          .map((b) => ("text" in b ? b.text : ""))
          .join("");
      }
    }

    // Stream the response
    const encoder = new TextEncoder();
    const stream = new ReadableStream({
      start(controller) {
        controller.enqueue(encoder.encode(finalResponse));
        controller.close();
      },
    });

    return new Response(stream, {
      headers: {
        "Content-Type": "text/plain; charset=utf-8",
        "Cache-Control": "no-cache",
      },
    });
  } catch (error) {
    console.error("AI chat error:", error);
    return new Response("Internal Server Error", { status: 500 });
  }
}
