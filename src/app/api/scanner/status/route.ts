import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { isAnthropicConfigured } from "@/lib/ai/client";

export async function GET() {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    // Check if user has completed Google Calendar OAuth (not just env vars)
    let googleCalendarConnected = false;
    const hasGoogleCreds = !!process.env.GOOGLE_CLIENT_ID && !!process.env.GOOGLE_CLIENT_SECRET;
    if (hasGoogleCreds) {
      const { data: profile } = await supabase
        .from("profiles")
        .select("google_calendar_tokens")
        .eq("id", user.id)
        .single();
      const tokens = profile?.google_calendar_tokens as Record<string, unknown> | null;
      googleCalendarConnected = !!tokens?.access_token;
    }

    return NextResponse.json({
      google_places_configured: !!process.env.GOOGLE_PLACES_API_KEY,
      anthropic_configured: isAnthropicConfigured(),
      hunter_configured: !!process.env.HUNTER_API_KEY,
      apollo_configured: !!process.env.APOLLO_API_KEY,
      public_records_available: true, // OpenCorporates — no API key required
      configured: {
        anthropic: isAnthropicConfigured(),
        resend: !!process.env.RESEND_API_KEY,
        twilio: !!process.env.TWILIO_ACCOUNT_SID && !!process.env.TWILIO_AUTH_TOKEN,
        linkedin: !!process.env.LINKEDIN_ACCESS_TOKEN,
        google_calendar: googleCalendarConnected,
      },
      google_calendar_configured: hasGoogleCreds,
    });
  } catch (error: any) {
    console.error("[Scanner.Status]", error instanceof Error ? error.message : error); return NextResponse.json({ error: "Failed to fetch scan status" }, { status: 500 });
  }
}
