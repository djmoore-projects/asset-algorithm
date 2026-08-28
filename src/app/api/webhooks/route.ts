import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getAnthropicClient, AI_MODEL, parseAIJson, isAnthropicConfigured } from "@/lib/ai/client";
import { escapeHtml, verifyTwilioSignature, verifyResendSignature } from "@/lib/security";
import { suppressContact } from "@/lib/outreach/suppression";

export async function POST(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const provider = searchParams.get("provider");

    // Clone the request to read body twice (once for verification, once for parsing)
    const rawBody = await req.text();
    const supabase = createAdminClient();

    switch (provider) {
      case "resend": {
        // Verify Resend webhook signature
        const isValid = await verifyResendSignature(req, rawBody);
        if (!isValid) {
          console.error("[Webhook] Invalid Resend signature");
          return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
        }

        const body = JSON.parse(rawBody);
        const { type, data } = body;
        const emailId = data?.email_id;
        if (!emailId) break;

        if (type === "email.replied") {
          const { data: rawOriginalMsg } = await supabase
            .from("outreach_messages")
            .select("id, contact_id, campaign_id, user_id")
            .eq("provider_message_id", emailId)
            .limit(1)
            .single();
          const originalMsg = rawOriginalMsg as { id: string; contact_id: string; campaign_id: string | null; user_id: string } | null;

          const { data: rawReply } = await supabase.from("outreach_replies").insert({
            message_id: originalMsg?.id || emailId,
            contact_id: originalMsg?.contact_id || "unknown",
            channel: "email" as const,
            body: data?.body || "",
            received_at: new Date().toISOString(),
          }).select().single();
          const reply = rawReply as { id: string } | null;

          if (originalMsg) {
            await supabase.from("outreach_messages")
              .update({ status: "replied" as const, replied_at: new Date().toISOString() })
              .eq("id", originalMsg.id);

            await classifyAndAutoBook(supabase, {
              replyBody: data?.body || "",
              replyId: reply?.id,
              contactId: originalMsg.contact_id,
              userId: originalMsg.user_id,
            });
          }
        } else {
          const statusMap: Record<string, "sent" | "delivered" | "opened" | "bounced"> = { "email.sent": "sent", "email.delivered": "delivered", "email.opened": "opened", "email.bounced": "bounced" };
          const newStatus = statusMap[type];
          if (newStatus) {
            await supabase.from("outreach_messages").update({
              status: newStatus,
              ...(type === "email.opened" ? { opened_at: new Date().toISOString() } : {}),
            }).eq("provider_message_id", emailId);

            // A bounce means the address is dead. Suppress the contact so no
            // campaign spends further budget — or sender reputation — on it.
            if (newStatus === "bounced") {
              const { data: bounced } = await supabase
                .from("outreach_messages")
                .select("contact_id")
                .eq("provider_message_id", emailId)
                .maybeSingle();
              const contactId = (bounced as { contact_id: string } | null)?.contact_id;
              if (contactId) {
                await suppressContact(supabase, contactId, "bounced");
                console.log(`[Webhook] Suppressed contact ${contactId} after hard bounce`);
              }
            }
          }
        }
        break;
      }
      case "twilio": {
        // Parse as form-urlencoded (Twilio sends form data)
        const params = new URLSearchParams(rawBody);
        const body: Record<string, string> = {};
        for (const [key, value] of params.entries()) {
          body[key] = value;
        }

        // Verify Twilio webhook signature
        const isValid = await verifyTwilioSignature(req, body);
        if (!isValid) {
          console.error("[Webhook] Invalid Twilio signature");
          return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
        }

        const { MessageSid, MessageStatus, From, Body, To } = body;

        if (Body && From && !MessageStatus) {
          const { data: rawContact } = await supabase
            .from("contacts")
            .select("id, company_id, first_name, last_name, email")
            .or(`phone.eq.${From},phone.eq.${From.replace('+1', '')}`)
            .limit(1)
            .single();
          const contact = rawContact as { id: string; company_id: string | null; first_name: string | null; last_name: string | null; email: string | null } | null;

          const { data: rawOriginalMsg2 } = await supabase
            .from("outreach_messages")
            .select("id, campaign_id, user_id")
            .eq("channel", "sms")
            .eq("contact_id", contact?.id || "")
            .order("sent_at", { ascending: false })
            .limit(1)
            .single();
          const originalMsg = rawOriginalMsg2 as { id: string; campaign_id: string | null; user_id: string } | null;

          const { data: rawReply2 } = await supabase.from("outreach_replies").insert({
            message_id: originalMsg?.id || MessageSid || "unknown",
            contact_id: contact?.id || "unknown",
            channel: "sms" as const,
            body: Body,
            received_at: new Date().toISOString(),
          }).select().single();
          const reply = rawReply2 as { id: string } | null;

          if (originalMsg) {
            await supabase.from("outreach_messages")
              .update({ status: "replied" as const, replied_at: new Date().toISOString() })
              .eq("id", originalMsg.id);

            await classifyAndAutoBook(supabase, {
              replyBody: Body,
              replyId: reply?.id,
              contactId: contact?.id,
              userId: originalMsg.user_id,
            });
          }
        } else if (MessageSid) {
          const smsStatusMap: Record<string, "sent" | "delivered" | "failed" | "bounced"> = { sent: "sent", delivered: "delivered", failed: "failed", undelivered: "bounced" };
          if (smsStatusMap[MessageStatus]) {
            await supabase.from("outreach_messages").update({ status: smsStatusMap[MessageStatus] }).eq("provider_message_id", MessageSid);
          }
        }
        break;
      }
      case "twilio-call": {
        const params = new URLSearchParams(rawBody);
        const body: Record<string, string> = {};
        for (const [key, value] of params.entries()) {
          body[key] = value;
        }

        // Verify Twilio webhook signature
        const isValid = await verifyTwilioSignature(req, body);
        if (!isValid) {
          console.error("[Webhook] Invalid Twilio call signature");
          return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
        }

        const { CallSid, CallStatus, CallDuration } = body;
        if (CallSid) {
          const statusMap: Record<string, string> = { completed: "completed", busy: "busy", "no-answer": "no_answer", failed: "failed" };
          await supabase.from("calls").update({
            status: (statusMap[CallStatus] || CallStatus) as any,
            ...(CallDuration ? { duration_seconds: parseInt(CallDuration) } : {}),
          }).eq("twilio_sid", CallSid);
        }
        break;
      }
    }
    return NextResponse.json({ received: true });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

async function classifyAndAutoBook(
  supabase: any,
  { replyBody, replyId, contactId, userId }: {
    replyBody: string;
    replyId?: string;
    contactId?: string;
    userId?: string;
  }
) {
  if (!replyBody || !contactId || !userId || !isAnthropicConfigured()) return;

  try {
    const client = getAnthropicClient();
    const response = await client.messages.create({
      model: AI_MODEL,
      max_tokens: 256,
      messages: [{
        role: "user",
        content: `Classify this business reply's sentiment and intent. Reply with raw JSON only:
{"sentiment": "positive|neutral|negative", "interested": true/false, "wants_meeting": true/false}

Reply text:
"${replyBody.slice(0, 1000)}"`,
      }],
    });

    const text = response.content[0].type === "text" ? response.content[0].text : "";
    const parsed = parseAIJson(text);

    if (replyId && parsed.sentiment) {
      await supabase.from("outreach_replies")
        .update({ sentiment: parsed.sentiment })
        .eq("id", replyId);
    }

    if (parsed.sentiment === "positive" && (parsed.interested || parsed.wants_meeting)) {
      const { data: profile } = await supabase
        .from("profiles")
        .select("google_calendar_tokens")
        .eq("id", userId)
        .single();

      const calTokens = profile?.google_calendar_tokens as { access_token: string; refresh_token?: string | null; expiry_date?: number | null } | null;
      if (!calTokens?.access_token) return;

      const { data: contact } = await supabase
        .from("contacts")
        .select("first_name, last_name, email, company_id, companies(name)")
        .eq("id", contactId)
        .single();

      if (!contact) return;
      const contactRecord = contact as unknown as { first_name: string | null; last_name: string | null; email: string | null; company_id: string | null; companies: { name: string } | null };

      const { createCalendarEvent, getAvailableSlots, refreshTokensIfNeeded } = await import("@/lib/integrations/google-calendar");

      const freshTokens = await refreshTokensIfNeeded(calTokens);

      if (freshTokens.access_token !== calTokens.access_token) {
        await supabase
          .from("profiles")
          .update({
            google_calendar_tokens: {
              ...calTokens,
              ...freshTokens,
            },
          })
          .eq("id", userId);
      }

      const startDate = new Date();
      startDate.setDate(startDate.getDate() + 1);
      const endDate = new Date();
      endDate.setDate(endDate.getDate() + 6);

      const slots = await getAvailableSlots(freshTokens, {
        startDate: startDate.toISOString(),
        endDate: endDate.toISOString(),
        durationMinutes: 30,
      });

      if (slots.length === 0) return;

      const slot = slots.find((s) => {
        const hour = new Date(s.start).getHours();
        return hour >= 10 && hour <= 11;
      }) || slots[0];

      const contactName = `${contactRecord.first_name || ""} ${contactRecord.last_name || ""}`.trim() || "Contact";
      const companyName = contactRecord.companies?.name || "";
      const eventTitle = companyName
        ? `Intro Call — ${contactName} (${companyName})`
        : `Intro Call — ${contactName}`;

      const event = await createCalendarEvent(freshTokens, {
        summary: eventTitle,
        description: `Auto-scheduled from positive outreach reply via Asset Algorithm`,
        startTime: slot.start,
        durationMinutes: 30,
        attendeeEmail: contactRecord.email || undefined,
      });

      const meetingUrl = event.hangoutLink || event.htmlLink || null;

      await supabase.from("meetings").insert({
        user_id: userId,
        contact_id: contactId,
        company_id: contactRecord.company_id || null,
        title: eventTitle,
        description: "Auto-booked from positive outreach reply",
        meeting_type: "intro",
        scheduled_at: slot.start,
        duration_minutes: 30,
        meeting_url: meetingUrl,
        status: "scheduled",
        google_event_id: event.id,
      });

      await supabase.from("activities").insert({
        user_id: userId,
        contact_id: contactId,
        activity_type: "meeting_auto_booked",
        title: `Auto-booked intro call with ${contactName}`,
      });

      if (contactRecord.email) {
        try {
          const { sendEmail } = await import("@/lib/integrations/resend");
          const scheduledDate = new Date(slot.start);
          const safeName = escapeHtml(contactRecord.first_name || "there");
          const safeMeetingUrl = meetingUrl ? escapeHtml(meetingUrl) : "";
          await sendEmail({
            to: contactRecord.email,
            subject: `Meeting Confirmed — ${scheduledDate.toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" })}`,
            html: `
              <p>Hi ${safeName},</p>
              <p>Thanks for your interest! I've scheduled a quick intro call:</p>
              <p><strong>Date:</strong> ${scheduledDate.toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric", year: "numeric" })}<br/>
              <strong>Time:</strong> ${scheduledDate.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" })}<br/>
              <strong>Duration:</strong> 30 minutes<br/>
              ${safeMeetingUrl ? `<strong>Link:</strong> <a href="${safeMeetingUrl}">${safeMeetingUrl}</a>` : ""}</p>
              <p>Looking forward to speaking with you!</p>
            `,
          });
        } catch {
          // Email notification failed — meeting still booked
        }
      }

      console.log(`[Auto-Book] Booked intro call with ${contactName} at ${slot.start}`);
    }
  } catch (err: any) {
    console.error("[Auto-Book] Classification/booking failed:", err.message);
  }
}
