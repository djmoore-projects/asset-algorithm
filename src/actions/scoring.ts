"use server";

import { createClient } from "@/lib/supabase/server";
import { getAnthropicClient, AI_MODEL, isAnthropicConfigured } from "@/lib/ai/client";
import { runWithConcurrency } from "@/lib/scanner/concurrency";
import type { Database } from "@/types/database";

type CompanyRow = Database["public"]["Tables"]["companies"]["Row"];

export async function scoreCompanyICP(companyId: string) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Unauthorized");

  // Get company data
  const { data: company } = await supabase.from("companies").select("*").eq("id", companyId).single() as { data: CompanyRow | null };
  if (!company) throw new Error("Company not found");

  // Get ICP config
  const { data: profile } = await supabase.from("profiles").select("icp_config").eq("id", user.id).single();
  const icpConfig = profile?.icp_config;
  if (!icpConfig) return null; // No ICP configured

  if (!isAnthropicConfigured()) return null;

  const client = getAnthropicClient();
  const response = await client.messages.create({
    model: AI_MODEL,
    max_tokens: 512,
    messages: [{
      role: "user",
      content: `Score this company against the Ideal Customer Profile (ICP) criteria. Return ONLY a JSON object with { "score": <0-100>, "summary": "<2 sentences>" }.

Company: ${JSON.stringify({ name: company.name, industry: company.industry, revenue_range: company.revenue_range, location_city: company.location_city, location_state: company.location_state, employee_count: company.employee_count, description: company.description })}

ICP Criteria: ${JSON.stringify(icpConfig)}`
    }],
  });

  const text = response.content[0].type === "text" ? response.content[0].text : "";
  try {
    const match = text.match(/\{[\s\S]*\}/);
    if (match) {
      const parsed = JSON.parse(match[0]);
      await supabase.from("companies").update({ icp_score: parsed.score, ai_summary: parsed.summary }).eq("id", companyId);
      return parsed;
    }
  } catch {}
  return null;
}

export async function scoreCompaniesInBulk(companyIds: string[]) {
  const tasks = companyIds.map((id) => async () => {
    const result = await scoreCompanyICP(id);
    return { id, ...result };
  });

  const rawResults = await runWithConcurrency(tasks, 5);

  return rawResults.map((r, i) =>
    r instanceof Error ? { id: companyIds[i], error: true } : r
  );
}
