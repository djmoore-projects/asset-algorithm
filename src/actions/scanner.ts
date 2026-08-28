"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import type { Database } from "@/types/database";

type ScanResultRow = Database["public"]["Tables"]["scan_results"]["Row"];
type ScanResultWithJoin = ScanResultRow & { scans: { user_id: string } };
type CompanyRow = Database["public"]["Tables"]["companies"]["Row"];

export async function getScans() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Unauthorized");

  const { data, error } = await supabase
    .from("scans")
    .select("*")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false });

  if (error) throw error;
  return data || [];
}

export async function getScanResults(scanId: string, filters?: { imported?: boolean }) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Unauthorized");

  let query = supabase
    .from("scan_results")
    .select("*, scans!inner(user_id)")
    .eq("scan_id", scanId)
    .eq("scans.user_id", user.id)
    .order("icp_score", { ascending: false, nullsFirst: false });

  if (filters?.imported !== undefined) {
    query = query.eq("imported", filters.imported);
  }

  const { data, error } = await query;
  if (error) throw error;
  return (data || []) as ScanResultWithJoin[];
}

export async function importScanResults(resultIds: string[]) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Unauthorized");

  let imported = 0;
  const errors: string[] = [];

  for (const resultId of resultIds) {
    try {
      // Fetch the scan result
      const { data: result, error: fetchError } = await supabase
        .from("scan_results")
        .select("*, scans!inner(user_id)")
        .eq("id", resultId)
        .single() as { data: ScanResultWithJoin | null; error: any };

      if (fetchError || !result || result.scans.user_id !== user.id) {
        errors.push(`Result ${resultId}: not found or unauthorized`);
        continue;
      }

      if (result.imported) {
        errors.push(`${result.business_name}: already imported`);
        continue;
      }

      const bd = (result.business_data || {}) as Record<string, any>;
      const cd = (result.contact_data || {}) as Record<string, any>;

      // Skip anything already in the pipeline. Domain is the reliable key —
      // matching on name alone would collide across franchises and DBAs.
      const domain = bd.domain || null;
      if (domain) {
        const { data: existing } = await supabase
          .from("companies")
          .select("id, name")
          .eq("user_id", user.id)
          .ilike("website", `%${domain}%`)
          .limit(1)
          .maybeSingle();

        if (existing) {
          await supabase
            .from("scan_results")
            .update({ imported: true, company_id: (existing as { id: string }).id })
            .eq("id", resultId);
          errors.push(`${result.business_name}: already in pipeline`);
          continue;
        }
      }

      // Apollo rows carry location resolved at scan time. Fall back to
      // parsing a Places-style address for rows scanned before the switch.
      let locationCity = bd.location_city || null;
      let locationState = bd.location_state || null;
      if (!locationState && bd.formatted_address) {
        const parts = String(bd.formatted_address).split(",").map((s: string) => s.trim());
        if (parts.length >= 3) locationCity = parts[parts.length - 3];
        const stateMatch = String(bd.formatted_address).match(/,\s*([A-Z]{2})\s+\d{5}/);
        if (stateMatch) locationState = stateMatch[1];
      }

      const ed = (result.enrichment_data || {}) as Record<string, any>;
      const industry = bd.industry || ed?.industry_classification || null;

      // Create company
      const { data: company, error: companyError } = await (supabase
        .from("companies")
        .insert({
          user_id: user.id,
          name: result.business_name,
          industry,
          location_city: locationCity,
          location_state: locationState,
          website: bd.website || null,
          description: bd.description || null,
          source: "scraped",
          source_url: bd.linkedin_url || bd.website || null,
          employee_count: bd.employee_count || null,
          enrichment_data: {
            ...bd,
            scanner_enrichment: ed,
          },
          icp_score: result.icp_score || null,
          ai_summary: result.ai_summary || null,
          revenue_range: bd.revenue_printed || ed?.estimated_revenue_range || null,
          tags: ["scanner"],
          status: "new",
        })
        .select()
        .single()) as { data: CompanyRow | null; error: any };

      if (companyError) {
        errors.push(`${result.business_name}: ${companyError.message}`);
        continue;
      }

      // Create contact if we have contact data
      const hasContact = cd.first_name || cd.email || cd.phone;
      if (hasContact && company) {
        await supabase
          .from("contacts")
          .insert({
            user_id: user.id,
            company_id: company.id,
            first_name: cd.first_name || "Unknown",
            last_name: cd.last_name || "",
            email: cd.email || null,
            phone: cd.phone || bd.phone || null,
            title: cd.title || "Owner",
            role_type: "owner",
            tags: ["scanner"],
          });
      } else if (bd.phone && company) {
        // At minimum create a contact with the business phone
        await supabase
          .from("contacts")
          .insert({
            user_id: user.id,
            company_id: company.id,
            first_name: result.business_name.split(" ")[0] || "Unknown",
            last_name: "",
            phone: bd.phone,
            title: "Business",
            role_type: "owner",
            tags: ["scanner"],
          });
      }

      // Mark result as imported
      await supabase
        .from("scan_results")
        .update({ imported: true, company_id: company!.id })
        .eq("id", resultId);

      imported++;
    } catch (e: any) {
      errors.push(`${resultId}: ${e.message}`);
    }
  }

  // Update scan imported count
  if (imported > 0) {
    const { data: firstResult } = await supabase
      .from("scan_results")
      .select("scan_id")
      .eq("id", resultIds[0])
      .single();

    if (firstResult) {
      const { data: scan } = await supabase
        .from("scans")
        .select("imported_count")
        .eq("id", firstResult.scan_id)
        .single();

      await supabase
        .from("scans")
        .update({ imported_count: (scan?.imported_count || 0) + imported })
        .eq("id", firstResult.scan_id);
    }

    revalidatePath("/sourcing");
    revalidatePath("/relationships");
    revalidatePath("/scanner");
  }

  return { imported, errors };
}

export async function deleteScan(scanId: string) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Unauthorized");

  const { error } = await supabase
    .from("scans")
    .delete()
    .eq("id", scanId)
    .eq("user_id", user.id);

  if (error) throw error;
  revalidatePath("/scanner");
}
