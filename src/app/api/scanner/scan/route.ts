import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { searchPlaces, mapPlaceToBusinessData, inferIndustryFromTypes } from "@/lib/scanner/google-places";
import { getAnthropicClient, AI_MODEL, isAnthropicConfigured, parseAIJson } from "@/lib/ai/client";
import { SCANNER_ENRICHMENT_PROMPT } from "@/lib/ai/prompts/scanner";
import { rateLimit, RATE_LIMITS } from "@/lib/rate-limit";
import type { ScanCriteria } from "@/lib/scanner/google-places";

export const maxDuration = 120;

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
    if (!criteria.query || !criteria.location) {
      return NextResponse.json({ error: "query and location are required" }, { status: 400 });
    }

    if (!process.env.GOOGLE_PLACES_API_KEY) {
      return NextResponse.json({
        error: "GOOGLE_PLACES_API_KEY not configured",
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

    // Search Google Places
    let places;
    try {
      places = await searchPlaces(criteria);
    } catch (apiError: any) {
      await supabase
        .from("scans")
        .update({ status: "failed" })
        .eq("id", scanRecord.id);
      return NextResponse.json({ error: apiError.message }, { status: 502 });
    }

    if (!places.length) {
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

    // Process each place into scan results
    const results = [];
    const hasAI = isAnthropicConfigured();

    for (const place of places) {
      const businessData = mapPlaceToBusinessData(place);
      let icpScore = null;
      let aiSummary = null;
      let enrichmentData: any = {};

      // AI enrichment (if Anthropic key is available)
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
            icpScore = parsed.icp_score || null;
            aiSummary = parsed.summary || null;
            enrichmentData = parsed.inferred_contact || {};
            if (parsed.acquisition_signals) {
              enrichmentData.acquisition_signals = parsed.acquisition_signals;
            }
          } catch {
            // If JSON parsing still fails, extract any plain text summary
            const cleaned = text.replace(/```[\s\S]*?```/g, "").trim();
            aiSummary = cleaned.slice(0, 500) || text.slice(0, 500);
          }
        } catch {
          // AI enrichment failed silently - continue without it
        }
      }

      const { data: result, error: resultError } = await supabase
        .from("scan_results")
        .insert({
          scan_id: scanRecord.id,
          user_id: user.id,
          business_name: businessData.name,
          business_data: businessData,
          contact_data: {
            phone: businessData.phone,
          },
          enrichment_data: enrichmentData,
          icp_score: icpScore,
          ai_summary: aiSummary,
        })
        .select()
        .single();

      if (!resultError && result) {
        results.push(result);
      }
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
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
