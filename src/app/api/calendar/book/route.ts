import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createCalendarEvent, refreshTokensIfNeeded } from "@/lib/integrations/google-calendar";

export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { data: profile } = await supabase
      .from("profiles")
      .select("google_calendar_tokens")
      .eq("id", user.id)
      .single();

    const tokens = profile?.google_calendar_tokens as { access_token: string; refresh_token?: string | null; expiry_date?: number | null } | null;

    if (!tokens?.access_token) {
      return NextResponse.json({ error: "Google Calendar not connected" }, { status: 400 });
    }

    const body = await req.json();
    const {
      contactId, companyId, dealId,
      startTime, durationMinutes,
      title, description,
      attendeeEmail, meetingType, location,
    } = body;

    if (!startTime) {
      return NextResponse.json({ error: "startTime is required" }, { status: 400 });
    }

    // Refresh tokens if needed
    const freshTokens = await refreshTokensIfNeeded(tokens);
    if (freshTokens.access_token !== tokens.access_token) {
      await supabase
        .from("profiles")
        .update({
          google_calendar_tokens: {
            ...tokens,
            ...freshTokens,
          },
        })
        .eq("id", user.id);
    }

    // Build a descriptive title if not provided
    let eventTitle = title;
    if (!eventTitle && contactId) {
      const { data: contact } = await supabase
        .from("contacts")
        .select("first_name, last_name, companies(name)")
        .eq("id", contactId)
        .single();
      const contactWithCompany = contact as { first_name: string | null; last_name: string | null; companies: { name: string } | null } | null;
      if (contactWithCompany) {
        const name = `${contactWithCompany.first_name || ""} ${contactWithCompany.last_name || ""}`.trim();
        const company = contactWithCompany.companies?.name;
        eventTitle = company
          ? `${meetingType === "intro" ? "Intro Call" : "Meeting"} — ${name} (${company})`
          : `${meetingType === "intro" ? "Intro Call" : "Meeting"} — ${name}`;
      }
    }
    eventTitle = eventTitle || "Asset Algorithm Meeting";

    // Create Google Calendar event
    const event = await createCalendarEvent(freshTokens, {
      summary: eventTitle,
      description: description || `Scheduled via Asset Algorithm`,
      startTime,
      durationMinutes: durationMinutes || 30,
      attendeeEmail: attendeeEmail || undefined,
      location,
    });

    const meetingUrl = event.hangoutLink || event.htmlLink || null;

    // Create meeting record in database
    const meetingData: any = {
      user_id: user.id,
      title: eventTitle,
      description: description || null,
      meeting_type: meetingType || "intro",
      scheduled_at: startTime,
      duration_minutes: durationMinutes || 30,
      location: location || null,
      meeting_url: meetingUrl,
      status: "scheduled",
      ai_prep: { google_event_id: event.id },
    };

    // contact_id is required by the schema
    if (contactId) {
      meetingData.contact_id = contactId;
    } else {
      return NextResponse.json({ error: "contactId is required" }, { status: 400 });
    }

    if (companyId) meetingData.company_id = companyId;
    if (dealId) meetingData.deal_id = dealId;

    const { data: meeting, error: meetingError } = await supabase
      .from("meetings")
      .insert(meetingData)
      .select()
      .single();

    if (meetingError) throw meetingError;

    // Log activity
    await supabase.from("activities").insert({
      user_id: user.id,
      contact_id: contactId,
      activity_type: "meeting_booked",
      entity_type: "contact" as const,
      entity_id: contactId,
      description: `Meeting scheduled: ${eventTitle}`,
      title: `Meeting scheduled: ${eventTitle}`,
    });

    return NextResponse.json({
      meeting,
      googleEvent: {
        id: event.id,
        htmlLink: event.htmlLink,
        hangoutLink: event.hangoutLink,
      },
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
