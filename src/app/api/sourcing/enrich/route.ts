import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getAnthropicClient, AI_MODEL } from "@/lib/ai/client";
import { LEAD_SCORING_PROMPT } from "@/lib/ai/prompts/scoring";
import { z } from "zod";
import { authenticateAndLimit, validateBody, handleApiError } from "@/lib/api-utils";
import { RATE_LIMITS } from "@/lib/rate-limit";

const EnrichSchema = z.object({
  companyId: z.string().uuid(),
});

export async function POST(req: NextRequest) {
  try {
    const auth = await authenticateAndLimit(req, "ai", RATE_LIMITS.ai);
    if (auth.error) return auth.error;

    const raw = await req.json();
    const validation = validateBody(raw, EnrichSchema);
    if (validation.error) return validation.error;

    const { companyId } = validation.data;
    const supabase = await createClient();

    const { data: company, error } = await supabase.from("companies").select("*").eq("id", companyId).eq("user_id", auth.user.id).single();
    if (error || !company) return NextResponse.json({ error: "Company not found" }, { status: 404 });

    const client = getAnthropicClient();
    const response = await client.messages.create({
      model: AI_MODEL, max_tokens: 2048, system: LEAD_SCORING_PROMPT,
      messages: [{ role: "user", content: `Score and analyze this company:\n\n${JSON.stringify(company, null, 2)}` }],
    });

    const content = response.content[0];
    const text = content.type === "text" ? content.text : "";
    let score = null;
    let summary = text;
    try { const parsed = JSON.parse(text); score = parsed.score || parsed.icp_score; summary = parsed.summary || parsed.analysis || text; } catch {}

    const updates: any = { ai_summary: summary };
    if (score) updates.icp_score = score;
    await supabase.from("companies").update(updates).eq("id", companyId);

    return NextResponse.json({ score, summary });
  } catch (error) {
    return handleApiError(error, "Sourcing.Enrich");
  }
}
