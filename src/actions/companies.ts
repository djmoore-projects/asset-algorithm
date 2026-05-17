"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import { sanitizeSearchInput } from "@/lib/utils";
import { z } from "zod";
import type { CompanyStatus, Database } from "@/types/database";

type CompanyRow = Database["public"]["Tables"]["companies"]["Row"];

async function getAuthUser() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Unauthorized");
  return { supabase, user };
}

export async function getCompanies(filters?: {
  status?: string;
  industry?: string;
  search?: string;
  limit?: number;
}) {
  const { supabase, user } = await getAuthUser();

  let query = supabase
    .from("companies")
    .select("*", { count: "exact" })
    .eq("user_id", user.id)
    .order("created_at", { ascending: false });

  if (filters?.status) query = query.eq("status", filters.status as CompanyStatus);
  if (filters?.industry) query = query.eq("industry", filters.industry);
  if (filters?.search) {
    const search = sanitizeSearchInput(filters.search);
    query = query.ilike("name", `%${search}%`);
  }
  if (filters?.limit) query = query.limit(filters.limit);

  const { data, error, count } = await query;
  if (error) throw error;
  return { companies: (data || []) as CompanyRow[], total: count || 0 };
}

export async function getCompany(id: string) {
  const { supabase, user } = await getAuthUser();
  const { data, error } = await supabase
    .from("companies")
    .select("*")
    .eq("id", id)
    .eq("user_id", user.id)
    .single();
  if (error) throw error;
  return data as unknown as CompanyRow;
}

const createCompanySchema = z.object({
  name: z.string().min(1),
  industry: z.string().nullish(),
  sub_industry: z.string().nullish(),
  revenue_range: z.string().nullish(),
  ebitda_range: z.string().nullish(),
  employee_count: z.number().int().nonnegative().nullish(),
  location_city: z.string().nullish(),
  location_state: z.string().nullish(),
  website: z.string().url().nullish(),
  description: z.string().nullish(),
  source: z.enum(["manual", "import", "scraped"]).optional(),
  source_url: z.string().url().nullish(),
  icp_score: z.number().min(0).max(100).nullish(),
  ai_summary: z.string().nullish(),
  tags: z.array(z.string()).optional(),
  status: z.enum(["new", "researching", "qualified", "contacted", "disqualified"] as const satisfies readonly CompanyStatus[]).optional(),
});

const updateCompanySchema = createCompanySchema.partial();

export async function createCompany(company: Record<string, any>): Promise<CompanyRow> {
  const parsed = createCompanySchema.parse(company);
  const { supabase, user } = await getAuthUser();

  const { data, error } = await supabase
    .from("companies")
    .insert({ ...parsed, user_id: user.id })
    .select()
    .single();
  if (error) throw error;
  revalidatePath("/sourcing");
  return data as unknown as CompanyRow;
}

export async function updateCompany(id: string, updates: Record<string, any>) {
  const parsed = updateCompanySchema.parse(updates);
  const { supabase, user } = await getAuthUser();
  const { data, error } = await supabase
    .from("companies")
    .update(parsed)
    .eq("id", id)
    .eq("user_id", user.id)
    .select()
    .single();
  if (error) throw error;
  revalidatePath("/sourcing");
  return data;
}

export async function deleteCompany(id: string) {
  const { supabase, user } = await getAuthUser();
  const { error } = await supabase.from("companies").delete().eq("id", id).eq("user_id", user.id);
  if (error) throw error;
  revalidatePath("/sourcing");
}
