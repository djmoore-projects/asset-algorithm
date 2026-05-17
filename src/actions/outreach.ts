"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import type { OutreachChannel, CampaignStatus, MessageStatus, Database } from "@/types/database";

type CampaignRow = Database["public"]["Tables"]["outreach_campaigns"]["Row"];
type MessageRow = Database["public"]["Tables"]["outreach_messages"]["Row"];
type ContactRow = Database["public"]["Tables"]["contacts"]["Row"];
type CompanyRow = Database["public"]["Tables"]["companies"]["Row"];

type MessageWithJoins = MessageRow & {
  contacts: Pick<ContactRow, "first_name" | "last_name" | "email"> | null;
  companies: Pick<CompanyRow, "name"> | null;
};

async function getAuthUser() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Unauthorized");
  return { supabase, user };
}

export async function getCampaigns(filters?: { status?: string }) {
  const { supabase, user } = await getAuthUser();

  let query = supabase
    .from("outreach_campaigns")
    .select("*")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false });

  if (filters?.status) query = query.eq("status", filters.status as CampaignStatus);
  const { data, error } = await query;
  if (error) throw error;
  return data || [];
}

export async function getCampaign(id: string) {
  const { supabase, user } = await getAuthUser();
  const { data, error } = await supabase
    .from("outreach_campaigns")
    .select("*")
    .eq("id", id)
    .eq("user_id", user.id)
    .single();
  if (error) throw error;
  return data;
}

const outreachChannels = ["email", "sms", "linkedin", "call"] as const satisfies readonly OutreachChannel[];
const campaignStatuses = ["draft", "active", "paused", "completed"] as const satisfies readonly CampaignStatus[];

const createCampaignSchema = z.object({
  name: z.string().min(1),
  description: z.string().nullish(),
  channels: z.array(z.enum(outreachChannels)).optional(),
  status: z.enum(campaignStatuses).optional(),
  target_company_ids: z.array(z.string().uuid()).optional(),
  target_contact_ids: z.array(z.string().uuid()).optional(),
});

const updateCampaignSchema = createCampaignSchema.partial();

export async function createCampaign(campaign: Record<string, any>): Promise<CampaignRow> {
  const parsed = createCampaignSchema.parse(campaign);
  const { supabase, user } = await getAuthUser();

  const { data, error } = await supabase
    .from("outreach_campaigns")
    .insert({ ...parsed, user_id: user.id })
    .select()
    .single();
  if (error) throw error;
  revalidatePath("/outreach");
  return data as unknown as CampaignRow;
}

export async function updateCampaign(id: string, updates: Record<string, any>) {
  const parsed = updateCampaignSchema.parse(updates);
  const { supabase, user } = await getAuthUser();
  const { data, error } = await supabase
    .from("outreach_campaigns")
    .update(parsed)
    .eq("id", id)
    .eq("user_id", user.id)
    .select()
    .single();
  if (error) throw error;
  revalidatePath("/outreach");
  return data;
}

export async function getSequences(campaignId: string) {
  const { supabase, user } = await getAuthUser();
  // Verify campaign ownership before fetching sequences
  const { data: campaign, error: campError } = await supabase
    .from("outreach_campaigns")
    .select("id")
    .eq("id", campaignId)
    .eq("user_id", user.id)
    .single();
  if (campError || !campaign) throw new Error("Campaign not found");

  const { data, error } = await supabase
    .from("outreach_sequences")
    .select("*")
    .eq("campaign_id", campaignId)
    .order("step_number");
  if (error) throw error;
  return data || [];
}

const createSequenceStepSchema = z.object({
  campaign_id: z.string().uuid(),
  step_number: z.number().int().nonnegative(),
  channel: z.enum(outreachChannels),
  delay_days: z.number().int().nonnegative().optional(),
  subject_template: z.string().nullish(),
  body_template: z.string().nullish(),
  ai_generated: z.boolean().optional(),
});

export async function createSequenceStep(step: Record<string, any>) {
  const parsed = createSequenceStepSchema.parse(step);
  const { supabase, user } = await getAuthUser();
  // Verify campaign ownership
  const { data: campaign, error: campError } = await supabase
    .from("outreach_campaigns")
    .select("id")
    .eq("id", parsed.campaign_id)
    .eq("user_id", user.id)
    .single();
  if (campError || !campaign) throw new Error("Campaign not found");

  const { data, error } = await supabase
    .from("outreach_sequences")
    .insert(parsed)
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function getMessages(filters?: {
  campaign_id?: string;
  contact_id?: string;
  status?: string;
  channel?: string;
}) {
  const { supabase, user } = await getAuthUser();
  let query = supabase
    .from("outreach_messages")
    .select("*, contacts(first_name, last_name, email), companies(name)")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false });

  if (filters?.campaign_id) query = query.eq("campaign_id", filters.campaign_id);
  if (filters?.contact_id) query = query.eq("contact_id", filters.contact_id);
  if (filters?.status) query = query.eq("status", filters.status as MessageStatus);
  if (filters?.channel) query = query.eq("channel", filters.channel as OutreachChannel);

  const { data, error } = await query;
  if (error) throw error;
  return (data || []) as MessageWithJoins[];
}

const messageStatuses = ["pending", "sent", "delivered", "opened", "replied", "bounced", "failed"] as const satisfies readonly MessageStatus[];

const createMessageSchema = z.object({
  sequence_id: z.string().uuid().nullish(),
  contact_id: z.string().uuid(),
  company_id: z.string().uuid().nullish(),
  campaign_id: z.string().uuid().nullish(),
  channel: z.enum(outreachChannels),
  status: z.enum(messageStatuses).optional(),
  scheduled_at: z.string().nullish(),
  subject: z.string().nullish(),
  body: z.string().min(1),
});

export async function createMessage(message: Record<string, any>) {
  const parsed = createMessageSchema.parse(message);
  const { supabase, user } = await getAuthUser();
  const { data, error } = await supabase
    .from("outreach_messages")
    .insert({ ...parsed, user_id: user.id })
    .select()
    .single();
  if (error) throw error;
  return data;
}
