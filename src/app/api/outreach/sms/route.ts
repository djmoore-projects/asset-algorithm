import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { sendSMS } from "@/lib/integrations/twilio";
import { z } from "zod";
import { authenticateAndLimit, validateBody, handleApiError, apiError } from "@/lib/api-utils";
import { RATE_LIMITS } from "@/lib/rate-limit";
import { isSuppressed } from "@/lib/outreach/suppression";

const SMSSchema = z.object({
  to: z.string().min(7).max(20),
  body: z.string().min(1).max(1600),
  contactId: z.string().uuid().optional().nullable(),
  campaignId: z.string().uuid().optional().nullable(),
});

export async function POST(req: NextRequest) {
  try {
    const auth = await authenticateAndLimit(req, "outreach", RATE_LIMITS.outreach);
    if (auth.error) return auth.error;

    const raw = await req.json();
    const validation = validateBody(raw, SMSSchema);
    if (validation.error) return validation.error;

    const { to, body, contactId, campaignId } = validation.data;

    const supabase = await createClient();

    // Suppression is global across channels — someone who opted out of email
    // did not consent to be texted instead.
    if (contactId) {
      const { data: contact } = await supabase
        .from("contacts")
        .select("unsubscribed_at")
        .eq("id", contactId)
        .eq("user_id", auth.user.id)
        .maybeSingle();

      if (isSuppressed(contact as { unsubscribed_at: string | null } | null)) {
        return apiError("This contact has unsubscribed and cannot be messaged.", 409);
      }
    }

    const result = await sendSMS({ to, body });

    await supabase.from("outreach_messages").insert({
      user_id: auth.user.id, campaign_id: campaignId || null, contact_id: contactId || "",
      channel: "sms", to_address: to, body, status: "sent",
      sent_at: new Date().toISOString(), provider_message_id: result.sid,
    });

    return NextResponse.json({ success: true, sid: result.sid });
  } catch (error) {
    return handleApiError(error, "Outreach.SMS");
  }
}
