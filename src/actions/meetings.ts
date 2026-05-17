"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import type { MeetingType, MeetingStatus, Database } from "@/types/database";

type MeetingRow = Database["public"]["Tables"]["meetings"]["Row"];
type ContactRow = Database["public"]["Tables"]["contacts"]["Row"];
type CompanyRow = Database["public"]["Tables"]["companies"]["Row"];
type DealRow = Database["public"]["Tables"]["deals"]["Row"];

type MeetingWithJoins = MeetingRow & {
  contacts: Pick<ContactRow, "first_name" | "last_name" | "email"> | null;
  companies: Pick<CompanyRow, "name"> | null;
  deals: Pick<DealRow, "title"> | null;
};

type MeetingDetailWithJoins = MeetingRow & {
  contacts: ContactRow | null;
  companies: CompanyRow | null;
  deals: DealRow | null;
};

async function getAuthUser() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Unauthorized");
  return { supabase, user };
}

export async function getMeetings(filters?: {
  status?: string;
  upcoming?: boolean;
}) {
  const { supabase, user } = await getAuthUser();

  let query = supabase
    .from("meetings")
    .select("*, contacts(first_name, last_name, email), companies(name), deals(title)")
    .eq("user_id", user.id)
    .order("scheduled_at", { ascending: true });

  if (filters?.status) query = query.eq("status", filters.status as MeetingStatus);
  if (filters?.upcoming)
    query = query.gte("scheduled_at", new Date().toISOString());

  const { data, error } = await query;
  if (error) throw error;
  return (data || []) as MeetingWithJoins[];
}

export async function getMeeting(id: string) {
  const { supabase, user } = await getAuthUser();
  const { data, error } = await supabase
    .from("meetings")
    .select("*, contacts(*), companies(*), deals(*)")
    .eq("id", id)
    .eq("user_id", user.id)
    .single();
  if (error) throw error;
  return data as unknown as MeetingDetailWithJoins;
}

const meetingTypes = ["intro", "deep_dive", "diligence", "negotiation", "closing", "other"] as const satisfies readonly MeetingType[];
const meetingStatuses = ["scheduled", "confirmed", "completed", "cancelled", "no_show"] as const satisfies readonly MeetingStatus[];

const createMeetingSchema = z.object({
  contact_id: z.string().uuid(),
  company_id: z.string().uuid().nullish(),
  deal_id: z.string().uuid().nullish(),
  title: z.string().min(1),
  description: z.string().nullish(),
  meeting_type: z.enum(meetingTypes).optional(),
  location: z.string().nullish(),
  meeting_url: z.string().url().nullish(),
  scheduled_at: z.string().min(1),
  duration_minutes: z.number().int().positive().optional(),
  status: z.enum(meetingStatuses).optional(),
  outcome: z.string().nullish(),
});

const updateMeetingSchema = createMeetingSchema.partial();

export async function createMeeting(meeting: Record<string, any>) {
  const parsed = createMeetingSchema.parse(meeting);
  const { supabase, user } = await getAuthUser();

  const { data, error } = await supabase
    .from("meetings")
    .insert({ ...parsed, user_id: user.id })
    .select()
    .single();
  if (error) throw error;
  revalidatePath("/meetings");
  return data;
}

export async function updateMeeting(id: string, updates: Record<string, any>) {
  const parsed = updateMeetingSchema.parse(updates);
  const { supabase, user } = await getAuthUser();
  const { data, error } = await supabase
    .from("meetings")
    .update(parsed)
    .eq("id", id)
    .eq("user_id", user.id)
    .select()
    .single();
  if (error) throw error;
  revalidatePath("/meetings");
  return data;
}

export async function deleteMeeting(id: string) {
  const { supabase, user } = await getAuthUser();
  const { error } = await supabase.from("meetings").delete().eq("id", id).eq("user_id", user.id);
  if (error) throw error;
  revalidatePath("/meetings");
}
