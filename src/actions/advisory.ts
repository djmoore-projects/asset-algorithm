"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import type { AnalysisType, Database } from "@/types/database";

type AnalysisInsert = Database["public"]["Tables"]["advisory_analyses"]["Insert"];
type DiligenceInsert = Database["public"]["Tables"]["diligence_items"]["Insert"];

async function getAuthUser() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Unauthorized");
  return { supabase, user };
}

export async function getAnalyses(dealId: string, type?: AnalysisType) {
  const { supabase, user } = await getAuthUser();
  // Verify deal ownership
  const { data: deal, error: dealError } = await supabase
    .from("deals")
    .select("id")
    .eq("id", dealId)
    .eq("user_id", user.id)
    .single();
  if (dealError || !deal) throw new Error("Deal not found");

  let query = supabase
    .from("advisory_analyses")
    .select("*")
    .eq("deal_id", dealId)
    .order("created_at", { ascending: false });

  if (type) query = query.eq("analysis_type", type);
  const { data, error } = await query;
  if (error) throw error;
  return data || [];
}

export async function createAnalysis(analysis: Record<string, any>) {
  const { supabase, user } = await getAuthUser();

  const { data, error } = await supabase
    .from("advisory_analyses")
    .insert({ ...analysis, user_id: user.id } as AnalysisInsert)
    .select()
    .single();
  if (error) throw error;
  revalidatePath("/advisory");
  return data;
}

export async function updateAnalysis(id: string, updates: Record<string, any>) {
  const { supabase, user } = await getAuthUser();
  const { data, error } = await supabase
    .from("advisory_analyses")
    .update(updates)
    .eq("id", id)
    .eq("user_id", user.id)
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function getDiligenceItems(dealId: string) {
  const { supabase, user } = await getAuthUser();
  // Verify deal ownership
  const { data: deal, error: dealError } = await supabase
    .from("deals")
    .select("id")
    .eq("id", dealId)
    .eq("user_id", user.id)
    .single();
  if (dealError || !deal) throw new Error("Deal not found");

  const { data, error } = await supabase
    .from("diligence_items")
    .select("*")
    .eq("deal_id", dealId)
    .order("category")
    .order("created_at");
  if (error) throw error;
  return data || [];
}

export async function createDiligenceItem(item: Record<string, any>) {
  const { supabase, user } = await getAuthUser();
  // Verify deal ownership
  const { data: deal, error: dealError } = await supabase
    .from("deals")
    .select("id")
    .eq("id", item.deal_id)
    .eq("user_id", user.id)
    .single();
  if (dealError || !deal) throw new Error("Deal not found");

  const { data, error } = await supabase
    .from("diligence_items")
    .insert(item as DiligenceInsert)
    .select()
    .single();
  if (error) throw error;
  revalidatePath("/advisory/diligence");
  return data;
}

export async function updateDiligenceItem(id: string, updates: Record<string, any>) {
  const { supabase, user } = await getAuthUser();
  // Verify the item belongs to a deal owned by this user
  const { data: item, error: itemError } = await supabase
    .from("diligence_items")
    .select("deal_id")
    .eq("id", id)
    .single();
  if (itemError || !item) throw new Error("Item not found");

  const { data: deal, error: dealError } = await supabase
    .from("deals")
    .select("id")
    .eq("id", item.deal_id)
    .eq("user_id", user.id)
    .single();
  if (dealError || !deal) throw new Error("Unauthorized");

  const { data, error } = await supabase
    .from("diligence_items")
    .update(updates)
    .eq("id", id)
    .select()
    .single();
  if (error) throw error;
  revalidatePath("/advisory/diligence");
  return data;
}
