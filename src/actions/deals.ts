"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import { sanitizeSearchInput } from "@/lib/utils";
import { z } from "zod";
import type { DealStage, Priority, Database } from "@/types/database";

type DealRow = Database["public"]["Tables"]["deals"]["Row"];
type CompanyRow = Database["public"]["Tables"]["companies"]["Row"];
type ContactRow = Database["public"]["Tables"]["contacts"]["Row"];

type DealWithJoins = DealRow & {
  companies: Pick<CompanyRow, "name" | "industry" | "location_city" | "location_state"> | null;
  contacts: Pick<ContactRow, "first_name" | "last_name" | "email"> | null;
};

type DealDetailWithJoins = DealRow & {
  companies: CompanyRow | null;
  contacts: ContactRow | null;
};

async function getAuthUser() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Unauthorized");
  return { supabase, user };
}

export async function getDeals(filters?: {
  stage?: DealStage;
  priority?: string;
  search?: string;
  company_id?: string;
}) {
  const { supabase, user } = await getAuthUser();

  let query = supabase
    .from("deals")
    .select(
      "*, companies(name, industry, location_city, location_state), contacts:primary_contact_id(first_name, last_name, email)"
    )
    .eq("user_id", user.id)
    .order("created_at", { ascending: false });

  if (filters?.stage) query = query.eq("stage", filters.stage);
  if (filters?.priority) query = query.eq("priority", filters.priority as Priority);
  if (filters?.search) {
    const search = sanitizeSearchInput(filters.search);
    query = query.ilike("title", `%${search}%`);
  }
  if (filters?.company_id) query = query.eq("company_id", filters.company_id);

  const { data, error } = await query;
  if (error) throw error;
  return (data || []) as DealWithJoins[];
}

export async function getDeal(id: string) {
  const { supabase, user } = await getAuthUser();
  const { data, error } = await supabase
    .from("deals")
    .select("*, companies(*), contacts:primary_contact_id(*)")
    .eq("id", id)
    .eq("user_id", user.id)
    .single();
  if (error) throw error;
  return data as unknown as DealDetailWithJoins;
}

const dealStages = ["lead", "initial_contact", "nda_signed", "info_received", "loi_submitted", "loi_accepted", "diligence", "closing", "closed", "dead"] as const satisfies readonly DealStage[];
const priorities = ["low", "medium", "high", "critical"] as const satisfies readonly Priority[];

const createDealSchema = z.object({
  company_id: z.string().uuid(),
  primary_contact_id: z.string().uuid().nullish(),
  title: z.string().min(1),
  stage: z.enum(dealStages).optional(),
  asking_price: z.number().nonnegative().nullish(),
  estimated_value: z.number().nonnegative().nullish(),
  revenue: z.number().nullish(),
  ebitda: z.number().nullish(),
  deal_score: z.number().min(0).max(100).nullish(),
  deal_thesis: z.string().nullish(),
  notes: z.string().nullish(),
  priority: z.enum(priorities).optional(),
  expected_close_date: z.string().nullish(),
});

const updateDealSchema = createDealSchema.partial();

export async function createDeal(deal: Record<string, any>) {
  const parsed = createDealSchema.parse(deal);
  const { supabase, user } = await getAuthUser();

  const { data, error } = await supabase
    .from("deals")
    .insert({ ...parsed, user_id: user.id })
    .select("*, companies(name, industry)")
    .single() as { data: DealRow & { companies: Pick<CompanyRow, "name" | "industry"> | null } | null; error: any };
  if (error) throw error;

  if (parsed.company_id) {
    const { data: company } = await supabase
      .from("companies")
      .select("status")
      .eq("id", parsed.company_id)
      .eq("user_id", user.id)
      .single();

    if (company && (company.status === "new" || company.status === "researching")) {
      await supabase
        .from("companies")
        .update({ status: "qualified" })
        .eq("id", parsed.company_id)
        .eq("user_id", user.id);
    }
  }

  revalidatePath("/pipeline");
  revalidatePath("/sourcing");
  revalidatePath("/dashboard");
  return data;
}

export async function updateDeal(id: string, updates: Record<string, any>) {
  const parsed = updateDealSchema.parse(updates);
  const { supabase, user } = await getAuthUser();
  const { data, error } = await supabase
    .from("deals")
    .update(parsed)
    .eq("id", id)
    .eq("user_id", user.id)
    .select("*, companies(name, industry)")
    .single() as { data: DealRow & { companies: Pick<CompanyRow, "name" | "industry"> | null } | null; error: any };
  if (error) throw error;
  revalidatePath("/pipeline");
  revalidatePath(`/pipeline/${id}`);
  revalidatePath("/dashboard");
  return data;
}

export async function updateDealStage(id: string, stage: DealStage) {
  return updateDeal(id, { stage });
}

export async function deleteDeal(id: string) {
  const { supabase, user } = await getAuthUser();
  const { error } = await supabase.from("deals").delete().eq("id", id).eq("user_id", user.id);
  if (error) throw error;
  revalidatePath("/pipeline");
  revalidatePath("/dashboard");
}
