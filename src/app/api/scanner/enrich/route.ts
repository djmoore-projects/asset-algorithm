import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getAnthropicClient, AI_MODEL, parseAIJson } from "@/lib/ai/client";
import { WEBSITE_CONTACT_EXTRACTION_PROMPT } from "@/lib/ai/prompts/scanner";
import { scrapeWebsiteText } from "@/lib/scanner/website-scraper";

export const maxDuration = 30;

export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { resultId } = await req.json();
    if (!resultId) return NextResponse.json({ error: "resultId is required" }, { status: 400 });

    // API key check handled by getAnthropicClient() with .env.local fallback

    // Fetch the scan result (verify ownership via scan → user_id)
    const { data: result, error } = await supabase
      .from("scan_results")
      .select("*, scans!inner(user_id)")
      .eq("id", resultId)
      .single();

    if (error || !result) return NextResponse.json({ error: "Result not found" }, { status: 404 });
    const resultWithJoin = result as unknown as {
      id: string;
      business_data: Record<string, any> | null;
      contact_data: Record<string, any> | null;
      enrichment_data: Record<string, any> | null;
      scans: { user_id: string };
    };
    if (resultWithJoin.scans.user_id !== user.id) return NextResponse.json({ error: "Unauthorized" }, { status: 403 });

    const website = resultWithJoin.business_data?.website;
    if (!website) {
      return NextResponse.json({ error: "No website URL available for this business" }, { status: 400 });
    }

    // Scrape website
    const websiteText = await scrapeWebsiteText(website);
    if (!websiteText) {
      return NextResponse.json({ error: "Could not fetch website content" }, { status: 502 });
    }

    // Extract contacts using AI
    const client = getAnthropicClient();
    const prompt = WEBSITE_CONTACT_EXTRACTION_PROMPT.replace("{website_text}", websiteText);

    const response = await client.messages.create({
      model: AI_MODEL,
      max_tokens: 1024,
      messages: [{ role: "user", content: prompt }],
    });

    const text = response.content[0].type === "text" ? response.content[0].text : "";
    let contactData: any = resultWithJoin.contact_data || {};

    try {
      const parsed = parseAIJson(text);
      if (parsed.contacts?.length > 0) {
        const primary = parsed.contacts[0];
        contactData = {
          ...contactData,
          first_name: primary.first_name || null,
          last_name: primary.last_name || null,
          email: primary.email || contactData.email || null,
          phone: primary.phone || contactData.phone || null,
          title: primary.title || null,
          linkedin_url: primary.linkedin_url || null,
          confidence: primary.confidence || "low",
          all_contacts: parsed.contacts,
          source: "website_scrape",
        };
      }
    } catch {
      // Parse failed — keep existing contact data
    }

    // Update scan result
    await supabase
      .from("scan_results")
      .update({
        contact_data: contactData,
        enrichment_data: {
          ...(resultWithJoin.enrichment_data || {}),
          website_scraped: true,
          website_text_length: websiteText.length,
        },
      })
      .eq("id", resultId);

    return NextResponse.json({ contact_data: contactData });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
