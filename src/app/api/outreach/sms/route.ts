import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { sendSMS } from "@/lib/integrations/twilio";
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

    const { to, body, contactId, campaignId } = await req.json();
    if (!to || !body) return NextResponse.json({ error: "to and body are required" }, { status: 400 });

    const result = await sendSMS({ to, body });
    await supabase.from("outreach_messages").insert({
      user_id: user.id, campaign_id: campaignId || null, contact_id: contactId || null,
      channel: "sms", to_address: to, body, status: "sent",
      sent_at: new Date().toISOString(), provider_message_id: result.sid,
    });
    return NextResponse.json({ success: true, sid: result.sid });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
