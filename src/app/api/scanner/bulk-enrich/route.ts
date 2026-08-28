import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getAnthropicClient, AI_MODEL, parseAIJson, isAnthropicConfigured } from "@/lib/ai/client";
import { scrapeWebsiteText } from "@/lib/scanner/website-scraper";
import { lookupPublicRecords } from "@/lib/scanner/public-records";
import { hunterDomainSearch } from "@/lib/scanner/hunter";
import { apolloSearchContacts } from "@/lib/scanner/apollo";
import { parseStateFromAddress, parseCityFromAddress } from "@/lib/scanner/google-places";
import { runWithConcurrency } from "@/lib/scanner/concurrency";

export const maxDuration = 120;

const CONCURRENCY = 3;
const SAFETY_TIMEOUT_MS = 100_000;

export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const body = await req.json();
    const scanId = typeof body?.scanId === "string" && body.scanId.length > 0 ? body.scanId : null;
    if (!scanId) return NextResponse.json({ error: "scanId is required" }, { status: 400 });

    const { data: scan, error: scanError } = await supabase
      .from("scans")
      .select("id, user_id, status")
      .eq("id", scanId)
      .single();

    if (scanError || !scan) return NextResponse.json({ error: "Scan not found" }, { status: 404 });
    const scanRecord = scan as unknown as { id: string; user_id: string; status: string };
    if (scanRecord.user_id !== user.id) return NextResponse.json({ error: "Unauthorized" }, { status: 403 });

    const { data: results, error: resultsError } = await supabase
      .from("scan_results")
      .select("*")
      .eq("scan_id", scanId)
      .order("icp_score", { ascending: false, nullsFirst: false });

    if (resultsError || !results) {
      return NextResponse.json({ error: "Failed to fetch results" }, { status: 500 });
    }

    const unenriched = results.filter(
      (r: any) => !r.enrichment_data?.bulk_enriched
    );

    if (unenriched.length === 0) {
      return NextResponse.json({ enriched: 0, failed: 0, total: 0, message: "All results already enriched" });
    }

    await supabase
      .from("scans")
      .update({ status: "running" })
      .eq("id", scanId);

    const hasAI = isAnthropicConfigured();
    const anthropic = hasAI ? getAnthropicClient() : null;
    let enrichedCount = 0;
    let failedCount = 0;

    const tasks = unenriched.map((result: any) => async () => {
      const businessData = result.business_data || {};
      const website = businessData.website;
      const businessName = result.business_name || businessData.name || "";
      // Apollo results carry location_city/location_state from the search
      // criteria; older Places-sourced rows still have a formatted address.
      const address = businessData.formatted_address || "";
      const stateCode = businessData.location_state || parseStateFromAddress(address);
      const city = businessData.location_city || parseCityFromAddress(address);
      const locationStr = city && stateCode ? `${city}, ${stateCode}` : city || stateCode || "";

      console.log(`[Enrich] Starting: ${businessName} | website: ${website || "none"}`);

      // ── Step 1: Gather data from ALL sources in parallel ──
      const [hunterResult, apolloResult, websiteText, publicRecords] = await Promise.all([
        website ? hunterDomainSearch(website) : Promise.resolve(null),
        apolloSearchContacts(businessName, locationStr),
        website ? scrapeWebsiteText(website) : Promise.resolve(null),
        lookupPublicRecords(businessName, stateCode),
      ]);

      console.log(
        `[Enrich] ${businessName} | hunter: ${hunterResult ? `${hunterResult.contacts.length} contacts` : "none"} | apollo: ${apolloResult ? `${apolloResult.contacts.length} contacts` : "none"} | website: ${websiteText ? `${websiteText.length} chars` : "none"} | publicRecords: ${publicRecords ? "found" : "none"}`
      );

      let contactData: any = result.contact_data || {};
      const enrichmentSources: string[] = [];

      // ── Step 2: Merge data from structured sources first (Hunter + Apollo) ──

      // Hunter.io — most reliable for emails
      if (hunterResult && hunterResult.contacts.length > 0) {
        enrichmentSources.push("hunter");
        // Pick the best contact: prefer personal with highest confidence
        const personal = hunterResult.contacts
          .filter((c) => c.type === "personal")
          .sort((a, b) => b.confidence - a.confidence);
        const best = personal[0] || hunterResult.contacts[0];

        contactData = {
          ...contactData,
          email: best.email || contactData.email || null,
          first_name: best.first_name || contactData.first_name || null,
          last_name: best.last_name || contactData.last_name || null,
          title: best.position || contactData.title || null,
          linkedin_url: best.linkedin || contactData.linkedin_url || null,
          phone: best.phone_number || contactData.phone || businessData.phone || null,
          confidence: best.confidence >= 80 ? "high" : best.confidence >= 50 ? "medium" : "low",
        };

        // Store all Hunter contacts
        contactData.hunter_contacts = hunterResult.contacts;
      }

      // Apollo.io — best for owner names and titles
      if (apolloResult && apolloResult.contacts.length > 0) {
        enrichmentSources.push("apollo");
        const apolloBest = apolloResult.contacts[0];

        // Apollo data fills in gaps — doesn't overwrite Hunter data
        contactData = {
          ...contactData,
          first_name: contactData.first_name || apolloBest.first_name || null,
          last_name: contactData.last_name || apolloBest.last_name || null,
          email: contactData.email || apolloBest.email || null,
          phone: contactData.phone || apolloBest.phone || businessData.phone || null,
          title: contactData.title || apolloBest.title || null,
          linkedin_url: contactData.linkedin_url || apolloBest.linkedin_url || null,
          confidence: contactData.confidence || apolloBest.confidence || "medium",
        };

        contactData.apollo_contacts = apolloResult.contacts;
      }

      // ── Step 3: If structured sources found contacts, we're done ──
      const hasStructuredContacts = !!(contactData.first_name || contactData.email);

      // ── Step 4: If no structured contacts, fall back to AI extraction from website ──
      if (!hasStructuredContacts && (websiteText || publicRecords) && anthropic) {
        if (websiteText) enrichmentSources.push("website");
        if (publicRecords) enrichmentSources.push("public_records");

        let dataSection = "";
        if (websiteText) dataSection += `## Website Content\n${websiteText}\n\n`;
        if (publicRecords) dataSection += `## Public Records\n${JSON.stringify(publicRecords, null, 2)}\n\n`;

        const prompt = `Extract business owner and contact information for "${businessName}" from these sources.

${dataSection}

Look for owner, founder, CEO, or principal names, emails, phone numbers, titles, and LinkedIn profiles.

Respond with raw JSON only (no markdown, no code blocks, no explanation):
{
  "contacts": [
    {
      "first_name": "<string or null>",
      "last_name": "<string or null>",
      "email": "<string or null>",
      "phone": "<string or null>",
      "title": "<string or null>",
      "linkedin_url": "<string or null>",
      "confidence": "<high|medium|low>"
    }
  ]
}

If no contact information is found, return: {"contacts": []}`;

        try {
          enrichmentSources.push("ai");
          const response = await anthropic.messages.create({
            model: AI_MODEL,
            max_tokens: 1024,
            messages: [{ role: "user", content: prompt }],
          });

          const text = response.content[0].type === "text" ? response.content[0].text : "";
          const parsed = parseAIJson(text);

          console.log(`[Enrich] ${businessName} | AI found ${parsed.contacts?.length || 0} contacts`);

          if (parsed.contacts?.length > 0) {
            const primary = parsed.contacts[0];
            contactData = {
              ...contactData,
              first_name: contactData.first_name || primary.first_name || null,
              last_name: contactData.last_name || primary.last_name || null,
              email: contactData.email || primary.email || null,
              phone: contactData.phone || primary.phone || businessData.phone || null,
              title: contactData.title || primary.title || null,
              linkedin_url: contactData.linkedin_url || primary.linkedin_url || null,
              confidence: primary.confidence || "low",
              all_contacts: parsed.contacts,
            };
          }
        } catch (aiError: any) {
          console.error(`[Enrich] ${businessName} | AI failed: ${aiError.message}`);
        }
      } else if (websiteText) {
        enrichmentSources.push("website");
      }

      // ── Step 5: Fallback — public records officers ──
      if (!contactData.first_name && publicRecords && publicRecords.officers.length > 0) {
        if (!enrichmentSources.includes("public_records")) enrichmentSources.push("public_records");
        const officer = publicRecords.officers[0];
        const nameParts = officer.name.split(/\s+/);
        contactData = {
          ...contactData,
          first_name: nameParts[0] || null,
          last_name: nameParts.slice(1).join(" ") || null,
          title: officer.position || null,
          confidence: "low",
        };
      }

      // ── Step 6: Ensure phone is always stored ──
      if (!contactData.phone && businessData.phone) {
        contactData.phone = businessData.phone;
      }

      // Set combined source
      contactData.sources = enrichmentSources;
      contactData.source = enrichmentSources.join("+") || "google_places";

      // Update scan result
      await supabase
        .from("scan_results")
        .update({
          contact_data: contactData,
          enrichment_data: {
            ...(result.enrichment_data || {}),
            hunter_found: !!hunterResult,
            apollo_found: !!apolloResult,
            website_scraped: !!websiteText,
            website_text_length: websiteText?.length || 0,
            public_records: publicRecords || null,
            enrichment_sources: enrichmentSources,
            bulk_enriched: true,
            enriched_at: new Date().toISOString(),
          },
        })
        .eq("id", result.id);

      return { id: result.id, success: true, sources: enrichmentSources };
    });

    const taskResults = await runWithConcurrency(tasks, CONCURRENCY, {
      timeoutMs: SAFETY_TIMEOUT_MS,
      onProgress: (completed, total) => {
        console.log(`[Bulk Enrich] ${completed}/${total} completed for scan ${scanId}`);
      },
    });

    for (const r of taskResults) {
      if (r instanceof Error) {
        failedCount++;
        console.error(`[Bulk Enrich] Task failed: ${r.message}`);
      } else {
        enrichedCount++;
      }
    }

    const timedOut = taskResults.some(
      (r) => r instanceof Error && r.message.includes("timeout")
    );
    const finalStatus: "completed" | "failed" = timedOut ? "failed" : "completed";

    await supabase
      .from("scans")
      .update({ status: finalStatus })
      .eq("id", scanId);

    console.log(`[Bulk Enrich] Done: ${enrichedCount} enriched, ${failedCount} failed, status: ${finalStatus}`);

    return NextResponse.json({
      enriched: enrichedCount,
      failed: failedCount,
      total: unenriched.length,
      status: finalStatus,
    });
  } catch (error) {
    console.error("[Scanner.BulkEnrich]", error instanceof Error ? error.message : error);
    return NextResponse.json({ error: "Bulk enrichment failed. Please try again." }, { status: 500 });
  }
}
