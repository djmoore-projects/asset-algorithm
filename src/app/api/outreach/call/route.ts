import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { initiateCall } from "@/lib/integrations/twilio";
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

    const { to, contactId, companyId, dealId } = await req.json();
    if (!to) return NextResponse.json({ error: "to (phone number) is required" }, { status: 400 });

    const result = await initiateCall({ to, record: true });
    if (!contactId) return NextResponse.json({ error: "contactId is required" }, { status: 400 });
    await supabase.from("calls").insert({
      user_id: user.id, contact_id: contactId, company_id: companyId || null,
      deal_id: dealId || null, direction: "outbound",
      status: "in_progress", twilio_sid: result.sid,
    });
    return NextResponse.json({ success: true, sid: result.sid });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
