import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getAnthropicClient, AI_MODEL } from "@/lib/ai/client";
import {
  EMAIL_GENERATION_PROMPT,
  CALL_SCRIPT_PROMPT,
  SMS_GENERATION_PROMPT,
  LINKEDIN_DM_PROMPT,
} from "@/lib/ai/prompts/outreach";
import { rateLimit, RATE_LIMITS } from "@/lib/rate-limit";

export const maxDuration = 30;

const PROMPTS: Record<string, string> = {
  email: EMAIL_GENERATION_PROMPT,
  call_script: CALL_SCRIPT_PROMPT,
  sms: SMS_GENERATION_PROMPT,
  linkedin_dm: LINKEDIN_DM_PROMPT,
};

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user)
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { success, remaining } = rateLimit(`ai:${user.id}`, RATE_LIMITS.ai);
    if (!success) {
      return NextResponse.json(
        { error: "Rate limit exceeded. Please try again shortly." },
        { status: 429, headers: { "Retry-After": "60" } }
      );
    }

    const body = await request.json();
    const { type, context } = body;

    if (!type) return NextResponse.json({ error: "Missing 'type' field" }, { status: 400 });

    const systemPrompt = PROMPTS[type];
    if (!systemPrompt)
      return NextResponse.json(
        { error: `Invalid type "${type}". Valid types: ${Object.keys(PROMPTS).join(", ")}` },
        { status: 400 }
      );

    // Build a user message that makes step context explicit for the AI
    let userMessage = `Generate content for step ${context.step_number || 1} of an outreach sequence.\n\n`;
    if (context.previous_steps?.length > 0) {
      userMessage += `Previous steps in this sequence:\n${JSON.stringify(context.previous_steps, null, 2)}\n\n`;
    }
    userMessage += `Current step details:\n${JSON.stringify(context, null, 2)}`;

    const anthropic = getAnthropicClient();
    const response = await anthropic.messages.create({
      model: AI_MODEL,
      max_tokens: 2048,
      system: systemPrompt,
      messages: [
        {
          role: "user",
          content: userMessage,
        },
      ],
    });

    const text = response.content
      .filter((b) => b.type === "text")
      .map((b) => ("text" in b ? b.text : ""))
      .join("");

    return NextResponse.json({ content: text, usage: response.usage });
  } catch (error: any) {
    console.error("Generate error:", error);
    const message = error?.message || "Generation failed";
    const status = error?.status || 500;
    return NextResponse.json({ error: message }, { status });
  }
}
