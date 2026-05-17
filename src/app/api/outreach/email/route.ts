import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { sendEmail } from "@/lib/integrations/resend";
import { rateLimit, RATE_LIMITS } from "@/lib/rate-limit";

export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { success, remaining } = rateLimit(`outreach:${user.id}`, RATE_LIMITS.outreach);
    if (!success) {
      return NextResponse.json(
        { error: "Rate limit exceeded. Please try again shortly." },
        { status: 429, headers: { "Retry-After": "60" } }
      );
    }

    const { to, subject, html, text, contactId, campaignId, sequenceId } = await req.json();
    if (!to || !subject) return NextResponse.json({ error: "to and subject are required" }, { status: 400 });

    const result = await sendEmail({ to, subject, html, text });
    if (!contactId) return NextResponse.json({ error: "contactId is required" }, { status: 400 });
    await supabase.from("outreach_messages").insert({
      user_id: user.id, campaign_id: campaignId || null, sequence_id: sequenceId || null,
      contact_id: contactId, channel: "email" as const, to_address: to, subject, body: html || text || "",
      status: "sent" as const, sent_at: new Date().toISOString(), provider_message_id: result?.id || null,
    });
    if (contactId) {
      await supabase.from("activities").insert({
        user_id: user.id, contact_id: contactId, activity_type: "email_sent",
        title: `Email sent: ${subject}`, entity_type: "contact" as const,
        entity_id: contactId, description: `Sent email "${subject}" to ${to}`,
      });
    }
    return NextResponse.json({ success: true, messageId: result?.id });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
