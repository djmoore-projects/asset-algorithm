import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { z } from "zod";
import { authenticateAndLimit, validateBody, handleApiError, apiError } from "@/lib/api-utils";
import { RATE_LIMITS } from "@/lib/rate-limit";
import { isSuppressed } from "@/lib/outreach/suppression";

/**
 * Logs an outbound call for a human to place. It does not dial.
 *
 * Auto-dialing cold prospects is off by design. An artificial voice delivering
 * an acquisition pitch performs badly, and under the TCPA a prerecorded or
 * artificial-voice call to a mobile number needs prior express written consent
 * that cold prospects have not given. Calls to prospects get dialed by a person
 * reading the generated script.
 */

const CallSchema = z.object({
  to: z.string().min(7).max(20),
  contactId: z.string().uuid(),
  companyId: z.string().uuid().optional().nullable(),
  dealId: z.string().uuid().optional().nullable(),
});

export async function POST(req: NextRequest) {
  try {
    const auth = await authenticateAndLimit(req, "outreach", RATE_LIMITS.outreach);
    if (auth.error) return auth.error;

    const raw = await req.json();
    const validation = validateBody(raw, CallSchema);
    if (validation.error) return validation.error;

    const { to, contactId, companyId, dealId } = validation.data;

    const supabase = await createClient();

    const { data: contact } = await supabase
      .from("contacts")
      .select("unsubscribed_at")
      .eq("id", contactId)
      .eq("user_id", auth.user.id)
      .maybeSingle();

    if (isSuppressed(contact as { unsubscribed_at: string | null } | null)) {
      return apiError("This contact has unsubscribed and cannot be called.", 409);
    }

    const { data: call, error } = await supabase
      .from("calls")
      .insert({
        user_id: auth.user.id,
        contact_id: contactId,
        company_id: companyId || null,
        deal_id: dealId || null,
        direction: "outbound",
        status: "scheduled",
      })
      .select()
      .single();

    if (error) throw error;

    return NextResponse.json({
      success: true,
      call_id: (call as { id: string } | null)?.id ?? null,
      dial: to,
      mode: "manual",
      message: "Call logged. Dial this one yourself using the script.",
    });
  } catch (error) {
    return handleApiError(error, "Outreach.Call");
  }
}
