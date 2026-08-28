import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { sendEmail } from "@/lib/integrations/resend";
import { z } from "zod";
import { authenticateAndLimit, validateBody, handleApiError, apiError } from "@/lib/api-utils";
import { RATE_LIMITS } from "@/lib/rate-limit";
import { isSuppressed, withUnsubscribeFooter } from "@/lib/outreach/suppression";

const EmailSchema = z.object({
  to: z.string().email(),
  subject: z.string().min(1).max(500),
  html: z.string().optional(),
  text: z.string().optional(),
  contactId: z.string().uuid(),
  campaignId: z.string().uuid().optional().nullable(),
  sequenceId: z.string().uuid().optional().nullable(),
});

export async function POST(req: NextRequest) {
  try {
    const auth = await authenticateAndLimit(req, "outreach", RATE_LIMITS.outreach);
    if (auth.error) return auth.error;

    const body = await req.json();
    const validation = validateBody(body, EmailSchema);
    if (validation.error) return validation.error;

    const { to, subject, html, text, contactId, campaignId, sequenceId } = validation.data;

    const supabase = await createClient();

    // Suppression binds manual sends too — an opt-out that only stops the
    // automation is not an opt-out.
    const { data: contact } = await supabase
      .from("contacts")
      .select("unsubscribed_at, unsubscribe_token")
      .eq("id", contactId)
      .eq("user_id", auth.user.id)
      .maybeSingle();

    const row = contact as { unsubscribed_at: string | null; unsubscribe_token: string } | null;
    if (isSuppressed(row)) {
      return apiError("This contact has unsubscribed and cannot be emailed.", 409);
    }

    const emailBody = row?.unsubscribe_token
      ? withUnsubscribeFooter(html || text || "", row.unsubscribe_token)
      : html || text || "";

    const result = await sendEmail({ to, subject, html: emailBody, text });

    await supabase.from("outreach_messages").insert({
      user_id: auth.user.id, campaign_id: campaignId || null, sequence_id: sequenceId || null,
      contact_id: contactId, channel: "email" as const, to_address: to, subject, body: emailBody,
      status: "sent" as const, sent_at: new Date().toISOString(), provider_message_id: result?.id || null,
    });

    await supabase.from("activities").insert({
      user_id: auth.user.id, contact_id: contactId, activity_type: "email_sent",
      title: `Email sent: ${subject}`, entity_type: "contact" as const,
      entity_id: contactId, description: `Sent email to ${to}`,
    });

    return NextResponse.json({ success: true, messageId: result?.id });
  } catch (error) {
    return handleApiError(error, "Outreach.Email");
  }
}
