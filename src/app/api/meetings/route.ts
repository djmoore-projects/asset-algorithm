import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { authenticateAndLimit, validateBody, handleApiError } from "@/lib/api-utils";
import { RATE_LIMITS } from "@/lib/rate-limit";
import { createClient } from "@/lib/supabase/server";
import type { MeetingType } from "@/types/database";

const MeetingSchema = z.object({
  title: z.string().min(1),
  description: z.string().optional(),
  meeting_type: z.enum(["intro", "deep_dive", "diligence", "negotiation", "closing", "other"]).default("intro"),
  scheduled_at: z.string().min(1),
  duration_minutes: z.number().min(5).max(480).default(30),
  location: z.string().optional(),
  meeting_url: z.string().url().optional().nullable(),
  contact_id: z.string().uuid().optional().nullable(),
  company_id: z.string().uuid().optional().nullable(),
  deal_id: z.string().uuid().optional().nullable(),
});

export async function POST(req: NextRequest) {
  try {
    const auth = await authenticateAndLimit(req, "meetings", RATE_LIMITS.general);
    if (auth.error) return auth.error;

    const body = await req.json();
    const validation = validateBody(body, MeetingSchema);
    if (validation.error) return validation.error;

    const supabase = await createClient();
    const d = validation.data;
    const { data: meeting, error } = await supabase.from("meetings").insert({
      user_id: auth.user.id,
      title: d.title,
      description: d.description || null,
      meeting_type: d.meeting_type as MeetingType,
      scheduled_at: d.scheduled_at,
      duration_minutes: d.duration_minutes,
      location: d.location || null,
      meeting_url: d.meeting_url || null,
      contact_id: d.contact_id || "",
      company_id: d.company_id || null,
      deal_id: d.deal_id || null,
      status: "scheduled",
    }).select().single();

    if (error) throw error;
    return NextResponse.json(meeting);
  } catch (error) {
    return handleApiError(error, "Meetings.POST");
  }
}

export async function GET(req: NextRequest) {
  try {
    const auth = await authenticateAndLimit(req, "meetings", RATE_LIMITS.general);
    if (auth.error) return auth.error;

    const supabase = await createClient();
    const { searchParams } = new URL(req.url);
    let query = supabase.from("meetings")
      .select("*, contacts(first_name, last_name), companies(name)")
      .eq("user_id", auth.user.id)
      .order("scheduled_at", { ascending: true });

    if (searchParams.get("upcoming") === "true") {
      query = query.gte("scheduled_at", new Date().toISOString());
    }

    const { data, error } = await query;
    if (error) throw error;
    return NextResponse.json(data);
  } catch (error) {
    return handleApiError(error, "Meetings.GET");
  }
}
