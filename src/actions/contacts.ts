"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import { sanitizeSearchInput } from "@/lib/utils";
import { z } from "zod";
import type { ContactRoleType, Database } from "@/types/database";

type ContactRow = Database["public"]["Tables"]["contacts"]["Row"];
type CompanyRow = Database["public"]["Tables"]["companies"]["Row"];

type ContactWithCompany = ContactRow & {
  companies: Pick<CompanyRow, "name"> | null;
};

type ContactDetailWithCompany = ContactRow & {
  companies: Pick<CompanyRow, "name" | "industry" | "website"> | null;
};

async function getAuthUser() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Unauthorized");
  return { supabase, user };
}

export async function getContacts(filters?: {
  company_id?: string;
  role_type?: string;
  search?: string;
  limit?: number;
}) {
  const { supabase, user } = await getAuthUser();

  let query = supabase
    .from("contacts")
    .select("*, companies(name)", { count: "exact" })
    .eq("user_id", user.id)
    .order("created_at", { ascending: false });

  if (filters?.company_id) query = query.eq("company_id", filters.company_id);
  if (filters?.role_type) query = query.eq("role_type", filters.role_type as ContactRoleType);
  if (filters?.search) {
    const search = sanitizeSearchInput(filters.search);
    query = query.or(
      `first_name.ilike.%${search}%,last_name.ilike.%${search}%,email.ilike.%${search}%`
    );
  }
  if (filters?.limit) query = query.limit(filters.limit);

  const { data, error, count } = await query;
  if (error) throw error;
  return { contacts: (data || []) as ContactWithCompany[], total: count || 0 };
}

export async function getContact(id: string) {
  const { supabase, user } = await getAuthUser();
  const { data, error } = await supabase
    .from("contacts")
    .select("*, companies(name, industry, website)")
    .eq("id", id)
    .eq("user_id", user.id)
    .single();
  if (error) throw error;
  return data as unknown as ContactDetailWithCompany;
}

const createContactSchema = z.object({
  first_name: z.string().min(1),
  last_name: z.string().min(1),
  email: z.string().email().nullish(),
  phone: z.string().nullish(),
  title: z.string().nullish(),
  company_id: z.string().uuid().nullish(),
  linkedin_url: z.string().url().nullish(),
  role_type: z.enum(["owner", "cfo", "broker", "intermediary", "other"] as const satisfies readonly ContactRoleType[]).optional(),
  relationship_score: z.number().int().min(0).max(100).nullish(),
  ai_notes: z.string().nullish(),
  tags: z.array(z.string()).optional(),
});

const updateContactSchema = createContactSchema.partial();

export async function createContact(contact: Record<string, any>) {
  const parsed = createContactSchema.parse(contact);
  const { supabase, user } = await getAuthUser();

  const { data, error } = await supabase
    .from("contacts")
    .insert({ ...parsed, user_id: user.id })
    .select()
    .single();
  if (error) throw error;
  revalidatePath("/relationships");
  return data;
}

export async function updateContact(id: string, updates: Record<string, any>) {
  const parsed = updateContactSchema.parse(updates);
  const { supabase, user } = await getAuthUser();
  const { data, error } = await supabase
    .from("contacts")
    .update(parsed)
    .eq("id", id)
    .eq("user_id", user.id)
    .select()
    .single();
  if (error) throw error;
  revalidatePath("/relationships");
  return data;
}

export async function deleteContact(id: string) {
  const { supabase, user } = await getAuthUser();
  const { error } = await supabase.from("contacts").delete().eq("id", id).eq("user_id", user.id);
  if (error) throw error;
  revalidatePath("/relationships");
}
