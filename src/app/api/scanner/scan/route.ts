import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { searchCompanies, mapOrganizationToBusinessData } from "@/lib/scanner/apollo";
import { getAnthropicClient, AI_MODEL, isAnthropicConfigured, parseAIJson } from "@/lib/ai/client";
import { SCANNER_ENRICHMENT_PROMPT } from "@/lib/ai/prompts/scanner";
import { rateLimit, RATE_LIMITS } from "@/lib/rate-limit";
import { runWithConcurrency } from "@/lib/scanner/concurrency";
import type { ScanCriteria } from "@/lib/scanner/apollo";

export const maxDuration = 120;

/** Parallel AI scoring calls. Anthropic tolerates this comfortably. */
const SCORING_CONCURRENCY = 6;
/** Stop scoring with time left to write results and close out the scan. */
const SCORING_BUDGET_MS = 40_000;

export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { success, remaining } = rateLimit(`scanner:${user.id}`, RATE_LIMITS.scanner);
    if (!success) {
      return NextResponse.json(
        { error: "Rate limit exceeded. Please try again shortly." },
        { status: 429, headers: { "Retry-After": "60" } }
      );
    }

    const criteria: ScanCriteria = await req.json();
    if (!criteria.query || typeof criteria.query !== "string" || !criteria.location || typeof criteria.location !== "string") {
      return NextResponse.json({ error: "query and location are required" }, { status: 400 });
    }

    if (!process.env.APOLLO_API_KEY) {
      return NextResponse.json({
        error: "APOLLO_API_KEY not configured",
        setup_required: true,
      }, { status: 400 });
    }

    // Create scan record
    const { data: scan, error: scanError } = await supabase
      .from("scans")
      .insert({
        user_id: user.id,
        name: `${criteria.query} in ${criteria.location}`,
        criteria: criteria as unknown as import("@/types/database").Json,
        status: "running",
      })
      .select()
      .single();

    if (scanError || !scan) throw scanError || new Error("Failed to create scan");
    const scanRecord = scan as unknown as { id: string };

    // Search Apollo for acquisition targets
    let organizations;
    try {
      organizations = await searchCompanies(criteria);
    } catch (apiError: any) {
      await supabase
        .from("scans")
        .update({ status: "failed", error_message: apiError.message })
        .eq("id", scanRecord.id);
      return NextResponse.json({ error: apiError.message }, { status: 502 });
    }

    if (!organizations.length) {
      await supabase
        .from("scans")
        .update({ status: "completed", results_count: 0 })
        .eq("id", scanRecord.id);
      return NextResponse.json({ scan_id: scanRecord.id, results: [], total: 0 });
    }

    // Load ICP config for AI scoring
    let icpCriteria = "No ICP criteria configured - use general acquisition target scoring.";
    try {
      const { data: profile } = await supabase
        .from("profiles")
        .select("icp_config")
        .eq("id", user.id)
        .single();
      if (profile?.icp_config) {
        icpCriteria = JSON.stringify(profile.icp_config, null, 2);
      }
    } catch {}

    // Process each organization into scan results.
    //
    // Scoring runs concurrently. One AI call per business, done sequentially,
    // exceeded the serverless function ceiling well before 25 businesses were
    // scored, and the run died before writing a single row. The budget below
    // leaves headroom to still record results and mark the scan finished.
    const hasAI = isAnthropicConfigured();

    const tasks = organizations.map((org) => async () => {
      const businessData = mapOrganizationToBusinessData(org, criteria.location);
      let icpScore: number | null = null;
      let aiSummary: string | null = null;
      let enrichmentData: any = {};

      if (hasAI) {
        try {
          const client = getAnthropicClient();
          const prompt = SCANNER_ENRICHMENT_PROMPT
            .replace("{business_data}", JSON.stringify(businessData, null, 2))
            .replace("{icp_criteria}", icpCriteria);

          const response = await client.messages.create({
            model: AI_MODEL,
            max_tokens: 1024,
            messages: [{ role: "user", content: prompt }],
          });

          const text = response.content[0].type === "text" ? response.content[0].text : "";
          try {
            const parsed = parseAIJson(text);
            icpScore = parsed.icp_score ?? null;
            aiSummary = parsed.summary ?? null;
            enrichmentData = parsed.inferred_contact || {};
            if (parsed.acquisition_signals) {
              enrichmentData.acquisition_signals = parsed.acquisition_signals;
            }
          } catch {
            const cleaned = text.replace(/```[\s\S]*?```/g, "").trim();
            aiSummary = (cleaned || text).slice(0, 500);
          }
        } catch {
          // Scoring is best effort. A business with no score still gets saved.
        }
      }

      // scan_results has no user_id column. Ownership is derived through
      // scan_id, which is how the RLS policies on this table resolve it.
      const { data: result, error: resultError } = await supabase
        .from("scan_results")
        .insert({
          scan_id: scanRecord.id,
          business_name: businessData.name,
          business_data: businessData,
          contact_data: { phone: businessData.phone },
          enrichment_data: enrichmentData,
          icp_score: icpScore,
          ai_summary: aiSummary,
        })
        .select()
        .single();

      if (resultError) throw new Error(resultError.message);
      return result;
    });

    const settled = await runWithConcurrency(tasks, SCORING_CONCURRENCY, {
      timeoutMs: SCORING_BUDGET_MS,
    });

    const results = settled.filter((r): r is Exclude<typeof r, Error> => !(r instanceof Error));
    const failed = settled.length - results.length;
    if (failed > 0) {
      const firstErr = settled.find((r) => r instanceof Error) as Error | undefined;
      console.error(
        `[Scanner.Scan] ${failed}/${settled.length} results failed. First: ${firstErr?.message}`
      );
    }

    // Update scan status
    await supabase
      .from("scans")
      .update({ status: "completed", results_count: results.length })
      .eq("id", scanRecord.id);

    return NextResponse.json({
      scan_id: scanRecord.id,
      results,
      total: results.length,
    });
  } catch (error) {
    console.error("[Scanner.Scan]", error instanceof Error ? error.message : error);
    return NextResponse.json({ error: "Scan failed. Please try again." }, { status: 500 });
  }
}
