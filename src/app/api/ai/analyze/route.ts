import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getAnthropicClient, AI_MODEL, MAX_TOKENS } from "@/lib/ai/client";
import { DEAL_ANALYSIS_PROMPT } from "@/lib/ai/prompts/analysis";
import { FINANCING_PROMPT, VALUATION_PROMPT, EXIT_STRATEGY_PROMPT } from "@/lib/ai/prompts/financing";
import { DILIGENCE_ANALYSIS_PROMPT } from "@/lib/ai/prompts/diligence";
import { INTEGRATION_PROMPT } from "@/lib/ai/prompts/integration";
import { SCALING_PROMPT } from "@/lib/ai/prompts/scaling";
import { rateLimit, RATE_LIMITS } from "@/lib/rate-limit";

export const maxDuration = 60;

const PROMPTS: Record<string, string> = {
  deal: DEAL_ANALYSIS_PROMPT,
  financing: FINANCING_PROMPT,
  valuation: VALUATION_PROMPT,
  diligence: DILIGENCE_ANALYSIS_PROMPT,
  exit: EXIT_STRATEGY_PROMPT,
  integration: INTEGRATION_PROMPT,
  scaling: SCALING_PROMPT,
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

    const { type, data } = await request.json();
    const systemPrompt = PROMPTS[type];
    if (!systemPrompt)
      return NextResponse.json(
        { error: "Invalid analysis type" },
        { status: 400 }
      );

    const anthropic = getAnthropicClient();
    const response = await anthropic.messages.create({
      model: AI_MODEL,
      max_tokens: MAX_TOKENS,
      system: systemPrompt,
      messages: [
        {
          role: "user",
          content: `Analyze the following data:\n\n${JSON.stringify(data, null, 2)}`,
        },
      ],
    });

    const text = response.content
      .filter((b) => b.type === "text")
      .map((b) => ("text" in b ? b.text : ""))
      .join("");

    return NextResponse.json({ analysis: text, usage: response.usage });
  } catch (error) {
    console.error("Analysis error:", error);
    return NextResponse.json({ error: "Analysis failed" }, { status: 500 });
  }
}
