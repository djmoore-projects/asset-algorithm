import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getAnthropicClient, AI_MODEL, parseAIJson } from "@/lib/ai/client";
import { createCalendarEvent, getAvailableSlots, refreshTokensIfNeeded } from "@/lib/integrations/google-calendar";
import { escapeHtml } from "@/lib/security";

/**
 * Auto-book a meeting when a positive reply is detected.
 * Called internally after reply sentiment analysis determines interest.
 *
 * POST { replyId, contactId, contactEmail, contactName, companyName }
 */
export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { replyId, contactId, contactEmail, contactName, companyName } = await req.json();
    if (!contactId) return NextResponse.json({ error: "contactId is required" }, { status: 400 });

    // Check if user has Google Calendar connected
    const { data: profile } = await supabase
      .from("profiles")
      .select("google_calendar_tokens")
      .eq("id", user.id)
      .single();

    const tokens = profile?.google_calendar_tokens as { access_token: string; refresh_token?: string | null; expiry_date?: number | null } | null;

    if (!tokens?.access_token) {
      return NextResponse.json({ error: "Google Calendar not connected", auto_book: false }, { status: 200 });
    }

    const freshTokens = await refreshTokensIfNeeded(tokens);

    // Save refreshed tokens if changed
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

    // Get next 5 business days of available slots
    const startDate = new Date();
    startDate.setDate(startDate.getDate() + 1);
    const endDate = new Date();
    endDate.setDate(endDate.getDate() + 6);

    const slots = await getAvailableSlots(freshTokens, {
      startDate: startDate.toISOString(),
      endDate: endDate.toISOString(),
      durationMinutes: 30,
    });

    if (slots.length === 0) {
      return NextResponse.json({ error: "No available slots", auto_book: false });
    }

    // Pick the first available morning slot (prefer 10am-11am)
    const preferredSlot = slots.find((s) => {
      const hour = new Date(s.start).getHours();
      return hour >= 10 && hour <= 11;
    }) || slots[0];

    const name = contactName || "Contact";
    const company = companyName ? ` (${companyName})` : "";
    const title = `Intro Call — ${name}${company}`;

    // Create the calendar event
    const event = await createCalendarEvent(freshTokens, {
      summary: title,
      description: `Auto-scheduled intro call via Asset Algorithm.\nContact: ${name}${company}`,
      startTime: preferredSlot.start,
      durationMinutes: 30,
      attendeeEmail: contactEmail || undefined,
    });

    const meetingUrl = event.hangoutLink || event.htmlLink || null;

    // Create meeting record
    const { data: meeting } = await supabase
      .from("meetings")
      .insert({
        user_id: user.id,
        contact_id: contactId,
        title,
        description: `Auto-booked from positive outreach reply`,
        meeting_type: "intro",
        scheduled_at: preferredSlot.start,
        duration_minutes: 30,
        meeting_url: meetingUrl,
        status: "scheduled",
        ai_prep: { google_event_id: event.id },
      })
      .select()
      .single();

    // Log activity
    await supabase.from("activities").insert({
      user_id: user.id,
      contact_id: contactId,
      activity_type: "meeting_booked",
      entity_type: "contact" as const,
      entity_id: contactId,
      description: `Auto-booked intro call with ${name}`,
      title: `Auto-booked intro call with ${name}`,
    });

    // Send calendar invite email if we have their email
    if (contactEmail) {
      try {
        const { sendEmail } = await import("@/lib/integrations/resend");
        const scheduledDate = new Date(preferredSlot.start);
        await sendEmail({
          to: contactEmail,
          subject: `Meeting Confirmed — ${scheduledDate.toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" })}`,
          html: `
            <p>Hi ${escapeHtml(contactName || "there")},</p>
            <p>Thanks for your interest! I've scheduled a quick intro call:</p>
            <p><strong>Date:</strong> ${scheduledDate.toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric", year: "numeric" })}<br/>
            <strong>Time:</strong> ${scheduledDate.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" })}<br/>
            <strong>Duration:</strong> 30 minutes<br/>
            ${meetingUrl ? `<strong>Link:</strong> <a href="${escapeHtml(meetingUrl)}">${escapeHtml(meetingUrl)}</a>` : ""}</p>
            <p>Looking forward to speaking with you!</p>
          `,
        });
      } catch {
        // Email send failed — meeting is still booked
      }
    }

    return NextResponse.json({
      auto_book: true,
      meeting,
      googleEvent: {
        id: event.id,
        htmlLink: event.htmlLink,
        hangoutLink: event.hangoutLink,
      },
    });
  } catch (error: any) {
    console.error("Auto-book error:", error);
    return NextResponse.json({ error: error.message, auto_book: false }, { status: 500 });
  }
}
