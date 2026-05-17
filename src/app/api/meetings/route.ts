import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const body = await req.json();
    const { data: meeting, error } = await supabase.from("meetings").insert({
      user_id: user.id, title: body.title, description: body.description,
      meeting_type: body.meeting_type || "intro_call", scheduled_at: body.scheduled_at,
      duration_minutes: body.duration_minutes || 30, location: body.location,
      meeting_url: body.meeting_url, contact_id: body.contact_id,
      company_id: body.company_id, deal_id: body.deal_id, status: "scheduled",
    }).select().single();
    if (error) throw error;
    return NextResponse.json(meeting);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function GET(req: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { searchParams } = new URL(req.url);
    let query = supabase.from("meetings").select("*, contacts(first_name, last_name), companies(name)").eq("user_id", user.id).order("scheduled_at", { ascending: true });
    if (searchParams.get("upcoming") === "true") query = query.gte("scheduled_at", new Date().toISOString());
    const { data, error } = await query;
    if (error) throw error;
    return NextResponse.json(data);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
